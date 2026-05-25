import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { serializeBigInt } from '@/utils/serialize';
import { getMockActivitiesList } from '../route';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json([], { status: 401 });
  }

  const accessToken = session.accessToken;

  if (accessToken === 'mock_access_token_rate_limited') {
    return NextResponse.json(getMockActivitiesList());
  }

  try {
    let allActivities: any[] = [];
    let page = 1;
    
    while (true) {
      const url = `https://www.strava.com/api/v3/athlete/activities?per_page=100&page=${page}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        break;
      }

      const activities = await response.json();
      if (!Array.isArray(activities) || activities.length === 0) {
        break;
      }

      allActivities = allActivities.concat(activities);
      page++;
    }

    return NextResponse.json(serializeBigInt(allActivities));
  } catch (err: any) {
    console.error('Failed to fetch all activities:', err);
    return NextResponse.json([], { status: 500 });
  }
}
