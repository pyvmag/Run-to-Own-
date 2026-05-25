import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { serializeBigInt } from '@/utils/serialize';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.athlete.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get count of tiles owned by this athlete
    const ownedTilesCount = await prisma.tile.count({
      where: { ownerId: userId },
    });

    // Merge tilesOwned property as seen in User.java transient field
    const userWithStats = {
      ...user,
      tilesOwned: ownedTilesCount,
    };

    return NextResponse.json(serializeBigInt(userWithStats));
  } catch (err: any) {
    console.error('Failed to get user details:', err);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }
}
