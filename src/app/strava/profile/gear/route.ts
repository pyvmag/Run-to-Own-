import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { serializeBigInt } from '@/utils/serialize';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accessToken = session.accessToken;

  if (accessToken === 'mock_access_token_rate_limited') {
    const mockGearList = [
      {
        name: 'Nike Air Zoom Pegasus 40',
        distance: 352000.0, // 352 km
        primary: true,
      },
      {
        name: 'Trek Emonda ALR',
        distance: 1540000.0, // 1540 km
        primary: false,
      },
    ];
    return NextResponse.json(mockGearList);
  }

  try {
    const response = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch gear from Strava: ${response.statusText}`);
    }

    const athleteData = await response.json();
    const gearList = [];

    if (athleteData) {
      if (Array.isArray(athleteData.bikes)) {
        gearList.push(...athleteData.bikes);
      }
      if (Array.isArray(athleteData.shoes)) {
        gearList.push(...athleteData.shoes);
      }
    }

    return NextResponse.json(serializeBigInt(gearList));
  } catch (err: any) {
    console.error('Failed to retrieve athlete gear:', err);
    return NextResponse.json([]);
  }
}
