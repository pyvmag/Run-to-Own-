import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import {
  decodePolyline,
  interpolatePath,
  isClosedLoop,
  getH3IndexesForRun,
  calculateDistanceInTile,
} from '@/utils/spatial';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = BigInt(session.athlete.id);
  const accessToken = session.accessToken;

  try {
    // 1. Perform database clean reset inside a single secure transaction
    await prisma.$transaction(async (tx) => {
      // Reset user fields
      await tx.user.update({
        where: { id: userId },
        data: {
          totalDistance: 0.0,
          currentStreak: 0,
          bestStreak: 0,
          lastActivityDate: null,
          lastSyncTimestamp: null,
        },
      });

      // Delete stats for this user
      await tx.tileUserStats.deleteMany({
        where: { userId },
      });

      // Clear ownership of tiles currently owned by this user
      await tx.tile.updateMany({
        where: { ownerId: userId },
        data: {
          ownerId: null,
          ownerName: null,
        },
      });
    });

    // 2. Fetch all runs from Strava (or generate mock runs)
    let allActivities: any[] = [];

    if (accessToken === 'mock_access_token_rate_limited') {
      // Replicate the mock runs in Java controller
      const nowMs = Date.now();
      for (let i = 2; i >= 0; i--) {
        const activityTime = new Date(nowMs - i * 24 * 60 * 60 * 1000);
        activityTime.setHours(8, 0, 0, 0); // 8:00 AM

        allActivities.push({
          id: nowMs - i * 86400000,
          distance: 4500.0,
          moving_time: 1500,
          elapsed_time: 1500,
          start_date: activityTime.toISOString(),
          type: 'Run',
          map: {
            // A summary polyline in Kolhapur, Maharashtra matching the center coords: [74.2433, 16.7050]
            summary_polyline: 'o}~iFvuyyMs@_AmAeBcBcCa@qAmBmCuAkBwAwB',
          },
        });
      }
    } else {
      let page = 1;
      while (true) {
        const url = `https://www.strava.com/api/v3/athlete/activities?per_page=100&page=${page}`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.status === 429) {
          return NextResponse.json(
            { error: 'Strava API rate limit exceeded. Try again in 15 minutes.' },
            { status: 429 }
          );
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch activities: ${response.statusText}`);
        }

        const activities = await response.json();
        if (!Array.isArray(activities) || activities.length === 0) {
          break;
        }

        allActivities = allActivities.concat(activities);
        page++;
      }
    }

    // 3. Process activities chronologically
    if (allActivities.length > 0) {
      allActivities.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
      await processActivitiesInDatabase(userId, session.athlete.username, allActivities);
    }

    // Update last sync timestamp
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastSyncTimestamp: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Full history sync complete. Processed ${allActivities.length} activities.`,
    });
  } catch (err: any) {
    console.error('Process full history failed:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handles geometry parsing, grid intersections, streak rules, and updates tile states.
 */
export async function processActivitiesInDatabase(
  userId: bigint,
  username: string,
  activities: any[]
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found in db');

  let currentStreak = user.currentStreak;
  let bestStreak = user.bestStreak;
  let lastActivityDate: string | null = user.lastActivityDate
    ? new Date(user.lastActivityDate).toISOString().split('T')[0]
    : null;
  let totalDistanceOfSync = 0;

  for (const activity of activities) {
    if (activity.type !== 'Run') continue; // only process runs
    
    const poly = activity.map?.summary_polyline;
    if (!poly) continue;

    const distance = Number(activity.distance || 0);
    totalDistanceOfSync += distance;

    // --- Path Calculations ---
    const rawCoords = decodePolyline(poly);
    if (rawCoords.length === 0) continue;

    const interpolated = interpolatePath(rawCoords, 20.0);
    const hasClosedLoop = isClosedLoop(rawCoords);

    // Get all H3 resolution 9 cells intersecting the path
    const cellIndexes = getH3IndexesForRun(interpolated, hasClosedLoop);

    // Calculate overlap length in each cell
    const tileDistances: { [h3: string]: number } = {};
    for (const h3Cell of cellIndexes) {
      const distInCell = calculateDistanceInTile(interpolated, h3Cell);
      if (distInCell > 0) {
        tileDistances[h3Cell] = distInCell;
      }
    }

    // --- Database transaction to upsert tile stats and owner rankings ---
    for (const h3Index of Object.keys(tileDistances)) {
      const distanceInCell = tileDistances[h3Index];

      await prisma.$transaction(async (tx) => {
        // Ensure Tile exists
        await tx.tile.upsert({
          where: { h3Index },
          update: {},
          create: { h3Index },
        });

        // Upsert user stats for this tile
        await tx.tileUserStats.upsert({
          where: {
            tileId_userId: {
              tileId: h3Index,
              userId,
            },
          },
          update: {
            totalDistanceInMeters: {
              increment: distanceInCell,
            },
          },
          create: {
            tileId: h3Index,
            userId,
            totalDistanceInMeters: distanceInCell,
          },
        });

        // Find top runner for this tile to recalculate ownership
        const topRunner = await tx.tileUserStats.findFirst({
          where: { tileId: h3Index },
          orderBy: { totalDistanceInMeters: 'desc' },
          include: {
            user: {
              select: {
                username: true,
              },
            },
          },
        });

        if (topRunner) {
          // If owner changed, set it
          await tx.tile.update({
            where: { h3Index },
            data: {
              ownerId: topRunner.userId,
              ownerName: topRunner.user.username,
            },
          });
        }
      });
    }

    // --- Streak Logic ---
    const activityDate = activity.start_date.split('T')[0]; // YYYY-MM-DD
    if (lastActivityDate) {
      const lastDate = new Date(lastActivityDate);
      const currDate = new Date(activityDate);
      
      const diffTime = Math.abs(currDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
      // If diffDays is 0 (multiple runs same day), do not change streak
    } else {
      currentStreak = 1;
    }
    lastActivityDate = activityDate;

    if (currentStreak > bestStreak) {
      bestStreak = currentStreak;
    }
  }

  // Save cumulative calculations back to user database entry
  await prisma.user.update({
    where: { id: userId },
    data: {
      totalDistance: {
        increment: totalDistanceOfSync,
      },
      currentStreak,
      bestStreak,
      lastActivityDate: lastActivityDate ? new Date(lastActivityDate) : null,
    },
  });
}
