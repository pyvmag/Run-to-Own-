import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requesterIdStr = searchParams.get('requesterId');

  if (!requesterIdStr) {
    return NextResponse.json({ error: 'Missing requesterId parameter' }, { status: 400 });
  }

  const addresseeId = BigInt(session.athlete.id);
  const requesterId = BigInt(requesterIdStr);

  try {
    const friendship = await prisma.friendship.findFirst({
      where: {
        requesterId,
        addresseeId,
        status: 'PENDING',
      },
    });

    if (!friendship) {
      return NextResponse.json({ error: 'No pending friend request found.' }, { status: 404 });
    }

    await prisma.friendship.update({
      where: { id: friendship.id },
      data: {
        status: 'DECLINED',
        actionTimestamp: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: 'Friend request declined.' });
  } catch (err: any) {
    console.error('Failed to decline request:', err);
    return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
  }
}
