'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { setAthlete } from '@/store/authSlice';
import { toggleThemeState } from '@/store/mapSlice';
import { setPendingRequests, PendingRequest } from '@/store/friendsSlice';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  
  const athlete = useSelector((state: RootState) => state.auth.athlete);
  const isDark = useSelector((state: RootState) => state.map.isDarkTheme);
  const pendingRequests = useSelector((state: RootState) => state.friends.pendingRequests);
  
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = savedTheme ? savedTheme === 'dark' : systemPrefersDark;

    dispatch(toggleThemeState(initialDark));
    if (initialDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [dispatch]);

  // Handle toggling dark mode
  const handleToggleTheme = () => {
    const nextDark = !isDark;
    dispatch(toggleThemeState(nextDark));
    localStorage.setItem('theme', nextDark ? 'dark' : 'light');
    if (nextDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  };

  // Fetch pending friend requests
  const fetchPendingRequests = async () => {
    try {
      const res = await fetch('/api/friendships/requests/pending');
      if (res.ok) {
        const data = await res.json();
        dispatch(setPendingRequests(data));
      }
    } catch (err) {
      console.error('Failed to load pending requests:', err);
    }
  };

  useEffect(() => {
    if (athlete) {
      fetchPendingRequests();
    }
  }, [athlete]);

  // Handle Accept Request
  const handleAccept = async (e: React.MouseEvent, requesterId: number) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/friendships/requests/accept?requesterId=${requesterId}`, {
        method: 'POST',
      });
      if (res.ok) {
        // filter from list
        dispatch(setPendingRequests(pendingRequests.filter(req => req.requester.id !== requesterId)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Decline Request
  const handleDecline = async (e: React.MouseEvent, requesterId: number) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/friendships/requests/decline?requesterId=${requesterId}`, {
        method: 'POST',
      });
      if (res.ok) {
        dispatch(setPendingRequests(pendingRequests.filter(req => req.requester.id !== requesterId)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <nav className="navbar">
      <Link href="/home" className="nav-brand">
        Run-to-Own
      </Link>
      
      <div className="nav-links">
        <Link href="/home" className={`nav-link ${pathname === '/home' ? 'active' : ''}`}>
          Home
        </Link>
        <Link href="/explore" className={`nav-link ${pathname === '/explore' ? 'active' : ''}`}>
          Explore
        </Link>
        <Link href="/profile" className={`nav-link ${pathname === '/profile' ? 'active' : ''}`}>
          Profile
        </Link>
        
        {/* Friends Dropdown mapping friends.html links */}
        <div className="dropdown">
          <button
            id="friends-dropdown-btn"
            className={`nav-link ${pathname === '/friends' ? 'active' : ''}`}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span>Friends</span>
            {pendingRequests.length > 0 && (
              <span className="bg-[#fc4c02] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">
                {pendingRequests.length}
              </span>
            )}
          </button>
          
          <div className={`dropdown-menu ${dropdownOpen ? 'show' : ''}`}>
            <div className="dropdown-header">Pending Requests</div>
            <div id="dropdown-request-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {pendingRequests.length === 0 ? (
                <div className="dropdown-item text-gray-400">No pending requests</div>
              ) : (
                pendingRequests.map(req => (
                  <div key={req.id} className="dropdown-item flex flex-col items-start gap-2 p-3">
                    <span className="font-semibold text-sm">{req.requester.username}</span>
                    <div className="flex gap-2 w-full mt-1">
                      <button
                        className="bg-green-500 hover:bg-green-600 text-white text-[11px] font-bold px-2 py-1 rounded"
                        onClick={(e) => handleAccept(e, req.requester.id)}
                      >
                        Accept
                      </button>
                      <button
                        className="bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold px-2 py-1 rounded"
                        onClick={(e) => handleDecline(e, req.requester.id)}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Link
              href="/friends"
              className="dropdown-footer"
              onClick={() => setDropdownOpen(false)}
            >
              Manage All Friends
            </Link>
          </div>
        </div>

        <a href="/api/auth/logout" className="nav-link">
          Logout
        </a>
        
        <button id="theme-switch" aria-label="Toggle Theme" onClick={handleToggleTheme}>
          🌗
        </button>
      </div>
    </nav>
  );
}
