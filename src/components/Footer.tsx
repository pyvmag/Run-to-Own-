'use client';

import React from 'react';

export default function Footer() {
  return (
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
  );
}
