import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { serializeBigInt } from '@/utils/serialize';

export async function GET() {
  const session = await getSession();
  if (!session || !session.athlete) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accessToken = session.accessToken;
  const athleteId = session.athlete.id;

  if (accessToken === 'mock_access_token_rate_limited') {
    const mockStats = {
      all_run_totals: {
        count: 48,
        distance: 212500.0,
        moving_time: 75600,
        elapsed_time: 79200,
        elevation_gain: 1450.0,
      },
      ytd_run_totals: {
        count: 25,
        distance: 110000.0,
        moving_time: 39600,
        elapsed_time: 41400,
        elevation_gain: 720.0,
      },
      recent_run_totals: {
        count: 3,
        distance: 15400.0,
        moving_time: 5400,
        elapsed_time: 5400,
        elevation_gain: 110.0,
      },
    };
    return NextResponse.json(mockStats);
  }

  try {
    const url = `https://www.strava.com/api/v3/athletes/${athleteId}/stats`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stats from Strava: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(serializeBigInt(data));
  } catch (err: any) {
    console.error('Failed to retrieve athlete stats:', err);
    return NextResponse.json({ error: 'Stats unavailable' }, { status: 503 });
  }
}
