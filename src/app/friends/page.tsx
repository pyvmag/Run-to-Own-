'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { setAthlete } from '@/store/authSlice';
import {
  setSearchResults,
  setPendingRequests,
  setFriendsList,
  setFriendsLoading,
  FriendUser,
  PendingRequest,
  AcceptedFriendship,
} from '@/store/friendsSlice';
import Navbar from '@/components/Navbar';
import StreakWidget from '@/components/StreakWidget';
import Footer from '@/components/Footer';

export default function FriendsPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  
  const athlete = useSelector((state: RootState) => state.auth.athlete);
  const searchResults = useSelector((state: RootState) => state.friends.searchResults);
  const pendingRequests = useSelector((state: RootState) => state.friends.pendingRequests);
  const friendsList = useSelector((state: RootState) => state.friends.friendsList);
  const isLoading = useSelector((state: RootState) => state.friends.isLoading);

  const [searchQuery, setSearchQuery] = useState('');
  const [sentRequestsList, setSentRequestsList] = useState<number[]>([]);

  // Auth check & load data
  useEffect(() => {
    async function initFriends() {
      try {
        const res = await fetch('/strava/athlete');
        if (!res.ok) {
          router.push('/');
          return;
        }
        dispatch(setAthlete(await res.json()));
        
        await loadAllFriendshipsData();
      } catch (err) {
        router.push('/');
      }
    }
    initFriends();
  }, [dispatch, router]);

  // Combined fetcher for pending and accepted friend lists
  const loadAllFriendshipsData = async () => {
    dispatch(setFriendsLoading(true));
    try {
      const [pendingRes, acceptedRes] = await Promise.all([
        fetch('/api/friendships/requests/pending'),
        fetch('/api/friendships/accepted'),
      ]);

      if (pendingRes.ok) {
        dispatch(setPendingRequests(await pendingRes.json()));
      }
      if (acceptedRes.ok) {
        dispatch(setFriendsList(await acceptedRes.json()));
      }
    } catch (err) {
      console.error('Failed to load friends tables:', err);
    } finally {
      dispatch(setFriendsLoading(false));
    }
  };

  // Perform user lookup search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const res = await fetch(`/api/friendships/search?username=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        dispatch(setSearchResults(await res.json()));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger send friend request
  const handleSendRequest = async (addresseeId: number) => {
    try {
      const res = await fetch(`/api/friendships/request?addresseeId=${addresseeId}`, {
        method: 'POST',
      });
      if (res.ok) {
        setSentRequestsList(prev => [...prev, addresseeId]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Accept
  const handleAccept = async (requesterId: number) => {
    try {
      const res = await fetch(`/api/friendships/requests/accept?requesterId=${requesterId}`, {
        method: 'POST',
      });
      if (res.ok) {
        // Reload all data
        await loadAllFriendshipsData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Decline
  const handleDecline = async (requesterId: number) => {
    try {
      const res = await fetch(`/api/friendships/requests/decline?requesterId=${requesterId}`, {
        method: 'POST',
      });
      if (res.ok) {
        // Filter out locally
        dispatch(setPendingRequests(pendingRequests.filter(req => req.requester.id !== requesterId)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="friends-page-wrapper">
      <Navbar />

      <main className="friends-container text-left">
        <h1>Find and Manage Friends</h1>

        {/* Find Other Runners card */}
        <section className="card">
          <h2>Find Other Runners</h2>
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              id="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter username..."
            />
            <button id="search-btn" type="submit">
              Search
            </button>
          </form>
          
          <div id="search-results" className="user-list">
            {searchResults.length === 0 ? (
              searchQuery && <p className="text-gray-400 text-sm">No runners found matching query.</p>
            ) : (
              searchResults.map((user) => {
                const isSent = sentRequestsList.includes(user.id);
                return (
                  <div key={user.id} className="user-item">
                    <span className="user-info">{user.username}</span>
                    <div className="user-actions">
                      {isSent ? (
                        <button className="pending-btn" disabled>
                          Sent
                        </button>
                      ) : (
                        <button
                          className="add-friend-btn"
                          onClick={() => handleSendRequest(user.id)}
                        >
                          Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Pending Requests card */}
        <section className="card">
          <h2>Pending Friend Requests</h2>
          <div id="pending-requests" className="user-list">
            {isLoading ? (
              <p>Loading requests...</p>
            ) : pendingRequests.length === 0 ? (
              <p className="text-gray-400 text-sm">No pending friend requests.</p>
            ) : (
              pendingRequests.map((req) => (
                <div key={req.id} className="user-item">
                  <span className="user-info">{req.requester.username}</span>
                  <div className="user-actions">
                    <button className="accept-btn" onClick={() => handleAccept(req.requester.id)}>
                      Accept
                    </button>
                    <button className="decline-btn" onClick={() => handleDecline(req.requester.id)}>
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Your Friends leaderboard card */}
        <section className="card">
          <h2>Your Friends</h2>
          <div id="friends-list" className="user-list">
            {isLoading ? (
              <p>Loading friends...</p>
            ) : friendsList.length === 0 ? (
              <p className="text-gray-400 text-sm">No friends added yet. Search and add some above!</p>
            ) : (
              friendsList.map((friendship) => {
                // Determine which side is the friend (not the current user)
                const isRequesterCurrent = Number(friendship.requesterId) === Number(athlete?.id);
                const friend: FriendUser = isRequesterCurrent ? friendship.addressee : friendship.requester;

                return (
                  <div key={friendship.id} className="user-item flex justify-between items-center">
                    <div className="flex flex-col items-start">
                      <span className="user-info font-bold text-lg">{friend.username}</span>
                      <span className="text-gray-500 dark:text-zinc-400 text-sm">
                        {((friend.totalDistance || 0) / 1000).toFixed(1)} km run total
                      </span>
                    </div>
                    {friend.currentStreak > 0 && (
                      <span className="text-sm bg-orange-100 dark:bg-orange-950/40 text-[#fc4c02] px-3 py-1 rounded-full font-bold">
                        🔥 {friend.currentStreak} Day Streak
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      <StreakWidget />
      <Footer />
    </div>
  );
}
