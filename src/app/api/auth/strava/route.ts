import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.STRAVA_CLIENT_ID || '169909';
  const redirectUri = process.env.STRAVA_REDIRECT_URI || 'http://localhost:3000/api/auth/strava/callback';
  
  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=read_all,profile:read_all,activity:read_all`;

  return NextResponse.redirect(stravaAuthUrl);
}
