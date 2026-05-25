'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

export default function StreakWidget() {
  const athlete = useSelector((state: RootState) => state.auth.athlete);
  const [streak, setStreak] = useState({ current: 0, best: 0 });

  useEffect(() => {
    async function loadStreak() {
      if (!athlete) return;
      try {
        const res = await fetch('/api/user/details');
        if (res.ok) {
          const userDetails = await res.json();
          setStreak({
            current: userDetails.currentStreak || 0,
            best: userDetails.bestStreak || 0,
          });
        }
      } catch (err) {
        console.error('Failed to load streak count:', err);
      }
    }
    loadStreak();
  }, [athlete]);

  if (!athlete) return null;

  return (
    <div className="streak-widget">
      <span className="streak-icon">🔥</span>
      <div className="streak-text text-left">
        <div className="streak-title">Current Streak</div>
        <div id="streak-counter" className="streak-value">{streak.current} Days</div>
        <div id="best-streak" className="streak-best">Best: {streak.best} Days</div>
      </div>
    </div>
  );
}
