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
    const pendingRequests = await prisma.friendship.findMany({
      where: {
        addresseeId: currentUserId,
        status: 'PENDING',
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            totalDistance: true,
            currentStreak: true,
          },
        },
      },
    });

    return NextResponse.json(serializeBigInt(pendingRequests));
  } catch (err: any) {
    console.error('Failed to get pending requests:', err);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }
}
