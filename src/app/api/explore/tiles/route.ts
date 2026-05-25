import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { serializeBigInt } from '@/utils/serialize';

export async function GET() {
  const session = await getSession();
  const currentUserId = session ? session.athlete.id : -1;

  try {
    const tiles = await prisma.tile.findMany({
      where: {
        ownerId: {
          not: null,
        },
      },
    });

    const formattedTiles = tiles.map(tile => {
      let hHex = tile.h3Index;
      // Handle legacy decimal representation if any
      if (/^\d+$/.test(hHex)) {
        try {
          hHex = BigInt(hHex).toString(16);
        } catch (ignored) {}
      }

      return {
        h3Index: hHex,
        ownerName: tile.ownerName,
        isCurrentUserOwner: tile.ownerId !== null && Number(tile.ownerId) === Number(currentUserId),
      };
    });

    return NextResponse.json(serializeBigInt(formattedTiles));
  } catch (err: any) {
    console.error('Failed to retrieve owned tiles:', err);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }
}
