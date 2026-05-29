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

          <div className="flex flex-col items-center w-full max-w-[280px] mx-auto mt-4">
            <a href="/api/auth/strava" className="w-full hover:opacity-90 transition-opacity">
              <img src="/images/btn_strava_connect_orange.svg" alt="Connect with Strava" className="w-full h-auto" />
            </a>

            <div className="flex items-center w-full justify-center my-4">
              <div className="h-px bg-gray-300 dark:bg-gray-700 flex-1"></div>
              <span className="px-3 text-sm font-medium text-gray-500 dark:text-gray-400">or</span>
              <div className="h-px bg-gray-300 dark:bg-gray-700 flex-1"></div>
            </div>

            <a href="/api/auth/login/guest" className="guest-login-btn !mt-0 !w-full">
              🔑 Try Guest Mode (Demo)
            </a>
          </div>

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
          src="/images/powered_by_strava_orange.svg"
          alt="Powered by Strava"
          className="strava-logo light-logo block dark:hidden h-[24px] w-auto"
        />
        <img
          src="/images/powered_by_strava_white.svg"
          alt="Powered by Strava"
          className="strava-logo dark-logo hidden dark:block h-[24px] w-auto"
        />
      </footer>
    </div>
  );
}
