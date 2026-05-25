import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { serializeBigInt } from '@/utils/serialize';

function getMockActivitiesList() {
  const now = new Date();
  
  return [
    {
      id: 1000000001,
      name: 'Morning Scenic Run in Bengaluru',
      distance: 5200.0,
      elapsed_time: 1620,
      moving_time: 1620,
      average_speed: 3.21,
      start_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      map: {
        summary_polyline: 'o}~iFvuyyMs@_AmAeBcBcCa@qAmBmCuAkBwAwB',
      },
    },
    {
      id: 1000000002,
      name: 'Sunset Trail Loop',
      distance: 8500.0,
      elapsed_time: 2880,
      moving_time: 2880,
      average_speed: 2.95,
      start_date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      map: {
        summary_polyline: 'o}~iFvuyyMs@_AmAeBcBcCa@qAmBmCuAkBwAwB',
      },
    },
    {
      id: 1000000003,
      name: 'Interval Speed Sprints',
      distance: 3500.0,
      elapsed_time: 1080,
      moving_time: 1080,
      average_speed: 3.24,
      start_date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      map: {
        summary_polyline: 'o}~iFvuyyMs@_AmAeBcBcCa@qAmBmCuAkBwAwB',
      },
    },
  ];
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json([], { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const count = parseInt(searchParams.get('count') || '5', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const accessToken = session.accessToken;

  if (accessToken === 'mock_access_token_rate_limited') {
    if (offset === 0) {
      return NextResponse.json(getMockActivitiesList());
    } else {
      return NextResponse.json([]);
    }
  }

  try {
    const page = Math.floor(offset / count) + 1;
    const listUrl = `https://www.strava.com/api/v3/athlete/activities?per_page=${count}&page=${page}`;
    
    const listResp = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listResp.ok) {
      throw new Error(`Failed to list activities: ${listResp.statusText}`);
    }

    const listData = await listResp.json();
    const activitiesWithDetails = [];

    // Spring Boot StravaController calls detailed activities API for each run
    if (Array.isArray(listData)) {
      for (const act of listData) {
        try {
          const actId = act.id;
          const detailUrl = `https://www.strava.com/api/v3/activities/${actId}`;
          const detailResp = await fetch(detailUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (detailResp.ok) {
            activitiesWithDetails.push(await detailResp.json());
          } else {
            activitiesWithDetails.push(act);
          }
        } catch (ignored) {
          activitiesWithDetails.push(act);
        }
      }
    }

    return NextResponse.json(serializeBigInt(activitiesWithDetails));
  } catch (err: any) {
    console.error('Failed to get Strava activities:', err);
    return NextResponse.json([], { status: 500 });
  }
}
export { getMockActivitiesList };
