import React from 'react';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // 1. Server-side redirect if session cookie already exists
  const session = await getSession();
  if (session) {
    redirect('/home');
  }

  return (
    <div className="login-body">
      <div className="login-container">
        <div className="login-card">
          <img src="/images/logo.png" alt="Run-to-Own Logo" className="logo" />
          <div className="premium-badge">⚡ EMPIRE BUILDER</div>

          <h1 className="brand-title">Run-to-Own</h1>
          <p className="tagline">
            Every run expands your kingdom. Blaze paths, conquer territories, and build your empire.
          </p>

          <a href="/api/auth/strava" className="strava-login-btn">
            <img src="/icons/strava-icon.png" alt="Strava" />
            Connect with Strava
          </a>

          <a href="/api/auth/login/guest" className="guest-login-btn">
            🔑 Try Guest Mode (Demo)
          </a>

          <div className="feature-bullets">
            <div className="bullet">
              <span className="bullet-icon">🗺️</span> Explore Tiles
            </div>
            <div className="bullet">
              <span className="bullet-icon">🔥</span> Active Streaks
            </div>
            <div className="bullet">
              <span className="bullet-icon">👑</span> Build Empire
            </div>
          </div>
        </div>
      </div>
      
      <footer className="app-footer">
        <img
          src="/images/powered_by_strava_1.png"
          alt="Powered by Strava"
          className="strava-logo light-logo block dark:hidden"
        />
        <img
          src="/images/powered_by_strava_2.png"
          alt="Powered by Strava"
          className="strava-logo dark-logo hidden dark:block"
        />
      </footer>
    </div>
  );
}
