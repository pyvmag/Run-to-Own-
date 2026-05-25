import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const addresseeIdStr = searchParams.get('addresseeId');

  if (!addresseeIdStr) {
    return NextResponse.json({ error: 'Missing addresseeId parameter' }, { status: 400 });
  }

  const requesterId = BigInt(session.athlete.id);
  const addresseeId = BigInt(addresseeIdStr);

  if (requesterId === addresseeId) {
    return NextResponse.json({ error: 'You cannot send a friend request to yourself.' }, { status: 400 });
  }

  try {
    // Check if both users exist
    const requester = await prisma.user.findUnique({ where: { id: requesterId } });
    const addressee = await prisma.user.findUnique({ where: { id: addresseeId } });

    if (!requester || !addressee) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if request already exists (either direction)
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'A friend request already exists.' }, { status: 409 });
    }

    // Save PENDING friendship
    await prisma.friendship.create({
      data: {
        requesterId,
        addresseeId,
        status: 'PENDING',
        actionTimestamp: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: 'Friend request sent.' });
  } catch (err: any) {
    console.error('Failed to send friend request:', err);
    return NextResponse.json({ error: 'Database transaction failed' }, { status: 500 });
  }
}
