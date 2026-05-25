import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { serializeBigInt } from '@/utils/serialize';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUserId = BigInt(session.athlete.id);

  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: currentUserId },
          { addresseeId: currentUserId },
        ],
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            totalDistance: true,
            currentStreak: true,
            bestStreak: true,
          },
        },
        addressee: {
          select: {
            id: true,
            username: true,
            totalDistance: true,
            currentStreak: true,
            bestStreak: true,
          },
        },
      },
    });

    return NextResponse.json(serializeBigInt(friendships));
  } catch (err: any) {
    console.error('Failed to get accepted friends:', err);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }
}
