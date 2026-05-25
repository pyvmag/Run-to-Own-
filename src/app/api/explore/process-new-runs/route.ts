import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { processActivitiesInDatabase } from '../process-full-history/route';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = BigInt(session.athlete.id);
  const accessToken = session.accessToken;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    let allActivities: any[] = [];

    if (accessToken === 'mock_access_token_rate_limited') {
      // Replicate the mock runs in Java controller for increment syncs
      const activityTime = new Date();
      if (user.lastActivityDate) {
        activityTime.setTime(new Date(user.lastActivityDate).getTime() + 24 * 60 * 60 * 1000);
      } else {
        activityTime.setDate(activityTime.getDate() - 2);
      }
      activityTime.setHours(10, 0, 0, 0); // 10:00 AM

      allActivities.push({
        id: Date.now(),
        distance: 3200.0,
        moving_time: 1200,
        elapsed_time: 1200,
        start_date: activityTime.toISOString(),
        type: 'Run',
        map: {
          summary_polyline: 'o}~iFvuyyMs@_AmAeBcBcCa@qAmBmCuAkBwAwB',
        },
      });
    } else {
      let page = 1;
      const after = user.lastSyncTimestamp
        ? Math.floor(new Date(user.lastSyncTimestamp).getTime() / 1000)
        : null;

      while (true) {
        let url = `https://www.strava.com/api/v3/athlete/activities?per_page=100&page=${page}`;
        if (after) {
          url += `&after=${after}`;
        }

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
          throw new Error(`Failed to fetch recent activities: ${response.statusText}`);
        }

        const activities = await response.json();
        if (!Array.isArray(activities) || activities.length === 0) {
          break;
        }

        allActivities = allActivities.concat(activities);
        page++;
      }
    }

    // 3. Process new activities
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
      message: `Processed ${allActivities.length} new activities successfully.`,
    });
  } catch (err: any) {
    console.error('Process new runs failed:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
