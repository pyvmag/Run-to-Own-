import { NextResponse } from 'next/server';
import { setSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const guestAthlete = {
    id: 123456,
    firstname: 'Guest',
    lastname: 'Recruiter',
    username: 'guest_recruiter',
    city: 'San Francisco',
    country: 'United States',
    profile: '/images/default-avatar.png',
    profile_medium: '/images/default-avatar.png',
  };

  // 1. Create or upsert the User in PostgreSQL using Prisma
  await prisma.user.upsert({
    where: { id: guestAthlete.id },
    update: {
      username: guestAthlete.username,
    },
    create: {
      id: guestAthlete.id,
      username: guestAthlete.username,
      totalDistance: 0.0,
      currentStreak: 0,
      bestStreak: 0,
    },
  });

  // 2. Encrypt and set cookie session
  await setSession({
    accessToken: 'mock_access_token_rate_limited',
    athlete: guestAthlete,
  });

  // 3. Redirect to /home
  return NextResponse.redirect(new URL('/home', process.env.STRAVA_REDIRECT_URI || 'http://localhost:3000'));
}
