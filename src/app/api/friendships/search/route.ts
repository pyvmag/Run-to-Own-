import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { serializeBigInt } from '@/utils/serialize';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json([]);
  }

  const currentUserId = BigInt(session.athlete.id);

  try {
    const foundUsers = await prisma.user.findMany({
      where: {
        username: {
          contains: username,
          mode: 'insensitive',
        },
        id: {
          not: currentUserId,
        },
      },
    });

    return NextResponse.json(serializeBigInt(foundUsers));
  } catch (err: any) {
    console.error('Failed to search users:', err);
    return NextResponse.json({ error: 'Database search failed' }, { status: 500 });
  }
}
