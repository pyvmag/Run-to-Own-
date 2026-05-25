'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { setAthlete } from '@/store/authSlice';
import Navbar from '@/components/Navbar';
import StreakWidget from '@/components/StreakWidget';
import Footer from '@/components/Footer';
import maplibregl from 'maplibre-gl';
import polyline from '@mapbox/polyline';

// A separate small component to render each run map safely in React
function ActivityMap({ summaryPolyline, activityId }: { summaryPolyline: string; activityId: number }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current || !summaryPolyline) return;

    try {
      const coordinates = polyline.decode(summaryPolyline).map(c => [c[1], c[0]]);
      if (coordinates.length === 0) return;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://api.maptiler.com/maps/hybrid/style.json?key=dpvZMY5gns5lycvwB2Fb',
        center: coordinates[0] as [number, number],
        zoom: 12,
        interactive: true,
      });

      mapRef.current = map;

      map.on('load', () => {
        map.addSource(`route-${activityId}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates,
            },
          },
        });

        map.addLayer({
          id: `route-${activityId}`,
          type: 'line',
          source: `route-${activityId}`,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#fc4c02',
            'line-width': 4,
          },
        });

        // Fit map boundaries around line
        const bounds = coordinates.reduce(
          (acc, coord) => acc.extend(coord as [number, number]),
          new maplibregl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number])
        );
        map.fitBounds(bounds, { padding: 40, animate: false });
      });

      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    } catch (err) {
      console.error('Failed to render activity mini-map:', err);
    }
  }, [summaryPolyline, activityId]);

  return <div ref={mapContainerRef} className="run-map" />;
}

export default function HomePage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const athlete = useSelector((state: RootState) => state.auth.athlete);

  // Apply background image stylesheet hook on mount
  useEffect(() => {
    document.body.classList.add('home-page');
    return () => {
      document.body.classList.remove('home-page');
    };
  }, []);

  const [loadingOverlay, setLoadingOverlay] = useState(true);
  const [userDetails, setUserDetails] = useState({ totalDistance: 0, currentStreak: 0, tilesOwned: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [feedLoading, setFeedLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Authenticate user & load baseline details
  useEffect(() => {
    async function initSession() {
      try {
        const athleteRes = await fetch('/strava/athlete');
        if (!athleteRes.ok) {
          router.push('/');
          return;
        }
        const athleteData = await athleteRes.json();
        dispatch(setAthlete(athleteData));

        // Load stats
        const detailsRes = await fetch('/api/user/details');
        if (detailsRes.ok) {
          setUserDetails(await detailsRes.json());
        }

        // Hide overlay loader after exactly 2500ms (replicating home.js)
        setTimeout(() => {
          setLoadingOverlay(false);
        }, 2500);
      } catch (err) {
        console.error('Session init failed:', err);
        router.push('/');
      }
    }
    initSession();
  }, [dispatch, router]);

  // Load activities feed
  const loadActivities = async () => {
    if (feedLoading || !hasMore) return;
    setFeedLoading(true);

    try {
      const res = await fetch(`/strava/activities?count=7&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        if (!data || data.length === 0) {
          setHasMore(false);
        } else {
          setActivities(prev => [...prev, ...data]);
          setOffset(prev => prev + 7);
        }
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setFeedLoading(false);
    }
  };

  // Load initial activities when loadingOverlay is disabled
  useEffect(() => {
    if (!loadingOverlay && athlete) {
      loadActivities();
    }
  }, [loadingOverlay, athlete]);

  // Format pace: speed in meters/second converted to minutes/km
  const formatPace = (averageSpeed: number) => {
    if (!averageSpeed) return '--:--';
    const paceDecimal = 16.6666 / averageSpeed;
    const minutes = Math.floor(paceDecimal);
    const seconds = Math.floor((paceDecimal - minutes) * 60).toString().padStart(2, '0');
    return `${minutes}:${seconds} /km`;
  };

  // Format activity duration
  const formatDuration = (elapsedSeconds: number) => {
    if (elapsedSeconds >= 3600) {
      return `${Math.floor(elapsedSeconds / 3600)}h ${Math.floor((elapsedSeconds % 3600) / 60)}m`;
    }
    return `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`;
  };

  // Format date-times
  const formatDate = (dateStr: string) => {
    const actDate = new Date(dateStr);
    return (
      actDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }) +
      ' at ' +
      actDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    );
  };

  return (
    <div className="home-page-wrapper">
      {/* 1. Global Animated Gif Loader Overlay */}
      {loadingOverlay && (
        <div id="loader" className="fixed inset-0 bg-[#F7F7FA] dark:bg-[#121214] z-[9999] flex flex-col items-center justify-center">
          <div className="loader-content flex flex-col items-center gap-4">
            <img src="/images/cycle_route.gif" className="w-[120px] h-[120px] object-contain" alt="Loading journey..." />
            <p className="text-gray-600 dark:text-gray-400 font-semibold tracking-wide">Loading your journey...</p>
          </div>
        </div>
      )}

      <Navbar />

      <div className="dashboard-hero text-left">
        <div className="hero-content">
          <h1 className="welcome-text">
            Your Kingdom, <span id="user-first-name">{athlete?.firstname || 'Runner'}</span>
          </h1>
          <p className="hero-subtext">
            Every step you take expands your empire. Ready to conquer more today?
          </p>
        </div>
        
        {/* Statistics Cards */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Distance Covered</div>
            <div id="total-dist-stat" className="stat-value">
              {((userDetails.totalDistance || 0) / 1000).toFixed(1)} km
            </div>
            <div className="stat-trend">↑ 12% this week</div>
          </div>
          
          <div className="stat-card highlight">
            <div className="stat-label">Tiles Owned</div>
            <div id="tiles-owned-stat" className="stat-value">
              {userDetails.tilesOwned || 0}
            </div>
            <div className="stat-trend gold">Dominating</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-label">Active Streak</div>
            <div id="streak-stat" className="stat-value">
              {userDetails.currentStreak || 0} Days
            </div>
            <div className="stat-trend glow">On Fire 🔥</div>
          </div>
        </div>
      </div>

      <main className="home-container">
        <header className="section-header">
          <h2 className="section-title">Recent Expeditions</h2>
          <p className="section-subtitle">The latest paths you've blazed across the world.</p>
        </header>

        {/* Dynamic Activity List Feed */}
        <div id="feed-container" className="feed">
          {activities.map((act, index) => {
            const hasPolyline = !!act.map?.summary_polyline;
            const profilePic = athlete?.profile_medium || athlete?.profile || '/images/default-avatar.png';
            
            return (
              <div key={act.id} className="run-post visible">
                <div className="run-post-header">
                  <img className="post-avatar" src={profilePic} alt="User Avatar" />
                  <div className="post-header-text">
                    <span className="username">{athlete?.firstname || 'You'}</span>
                    <span className="post-date">{formatDate(act.start_date)}</span>
                  </div>
                </div>

                {hasPolyline && (
                  <ActivityMap summaryPolyline={act.map.summary_polyline} activityId={act.id} />
                )}

                <div className="run-post-details">
                  <h3 className="post-title">{act.name || 'Untitled Run'}</h3>
                  <div className="strava-metrics-grid">
                    <div className="metric-item">
                      <span className="metric-label">Distance</span>
                      <span className="metric-value">{(act.distance / 1000).toFixed(2)} km</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Pace</span>
                      <span className="metric-value">{formatPace(act.average_speed)}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Time</span>
                      <span className="metric-value">{formatDuration(act.elapsed_time)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {feedLoading && (
          <div id="loading-spinner" className="spinner">
            <div className="spinner-icon" />
            <span>Mapping your history...</span>
          </div>
        )}

        <div className="feed-footer">
          {hasMore ? (
            <button
              id="load-more-btn"
              className="load-more-btn"
              disabled={feedLoading}
              onClick={loadActivities}
            >
              Explore Earlier Runs
            </button>
          ) : (
            <div id="no-more-msg" className="no-more-msg block text-gray-500 font-semibold mt-4">
              You've reached the edge of your history.
            </div>
          )}
        </div>
      </main>

      <StreakWidget />
      <Footer />
    </div>
  );
}
