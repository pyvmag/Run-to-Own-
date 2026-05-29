'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { setAthlete } from '@/store/authSlice';
import { toggleThemeState, setTiles, setMapLoading } from '@/store/mapSlice';
import Navbar from '@/components/Navbar';
import StreakWidget from '@/components/StreakWidget';
import Footer from '@/components/Footer';
import maplibregl from 'maplibre-gl';
import * as h3 from 'h3-js';
import { rewind } from '@/utils/spatial';

export default function ExplorePage() {
  const router = useRouter();
  const dispatch = useDispatch();
  
  const athlete = useSelector((state: RootState) => state.auth.athlete);
  const isDark = useSelector((state: RootState) => state.map.isDarkTheme);
  const mapStyle = useSelector((state: RootState) => state.map.mapStyle);
  const tiles = useSelector((state: RootState) => state.map.tiles);
  const isLoading = useSelector((state: RootState) => state.map.isLoading);

  const [syncMessage, setSyncMessage] = useState('Sync Latest Runs');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  // Authenticate session on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/strava/athlete');
        if (!res.ok) {
          router.push('/');
          return;
        }
        dispatch(setAthlete(await res.json()));
      } catch (err) {
        router.push('/');
      }
    }
    checkAuth();
  }, [dispatch, router]);

  // Load H3 tiles from DB and draw them on the map
  const loadAndDrawTiles = async (mapInstance: any) => {
    if (!mapInstance) return;

    try {
      const response = await fetch('/api/explore/tiles');
      if (!response.ok) throw new Error('Failed to fetch tiles');
      const data = await response.json();
      dispatch(setTiles(data));

      const features = data.map((tile: any) => {
        // H3 v4 API: cellToBoundary returns array of [lat, lng]
        const boundaryLatLng = h3.cellToBoundary(tile.h3Index);
        const boundaryLngLat: [number, number][] = boundaryLatLng.map(coord => [coord[1], coord[0]] as [number, number]);
        boundaryLngLat.push(boundaryLngLat[0]); // close the polygon

        return {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: rewind([boundaryLngLat]),
          },
          properties: {
            ownerName: tile.ownerName,
            isCurrentUserOwner: tile.isCurrentUserOwner,
          },
        };
      });

      const geoJsonData = { type: 'FeatureCollection', features };
      
      const sourceId = 'tiles';
      const layerId = 'tiles-layer';

      if (mapInstance.getSource(sourceId)) {
        mapInstance.getSource(sourceId).setData(geoJsonData);
      } else {
        mapInstance.addSource(sourceId, { type: 'geojson', data: geoJsonData });
        mapInstance.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': [
              'case',
              ['==', ['get', 'isCurrentUserOwner'], true],
              '#fc4c02', // Orange for current user
              '#007cbf', // Blue for others
            ],
            'fill-opacity': 0.6,
            'fill-outline-color': '#ffffff',
          },
        });
      }

      // Auto center to athlete's empire
      if (data && data.length > 0) {
        // cellToLatLng returns [lat, lng]
        const center = h3.cellToLatLng(data[0].h3Index);
        mapInstance.flyTo({ center: [center[1], center[0]], zoom: 12.5 });
      }
    } catch (err) {
      console.error('Error drawing tiles on map:', err);
    }
  };

  // Initialize MapLibre GL map
  useEffect(() => {
    if (!mapContainerRef.current || !athlete) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [74.2433, 16.7050],
      zoom: 11,
    });

    mapRef.current = map;

    map.on('load', () => {
      loadAndDrawTiles(map);
      // Run auto sync on load
      syncRuns();
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [athlete, mapStyle]);

  // Sync latest runs from Strava
  const syncRuns = async () => {
    if (isLoading) return;
    dispatch(setMapLoading(true));
    setSyncMessage('Syncing...');

    try {
      const response = await fetch('/api/explore/process-new-runs', { method: 'POST' });
      if (!response.ok) throw new Error('Sync runs failed');
      
      // Redraw tiles
      if (mapRef.current) {
        await loadAndDrawTiles(mapRef.current);
      }
    } catch (err) {
      console.error('Failed to sync runs:', err);
    } finally {
      dispatch(setMapLoading(false));
      setSyncMessage('Sync Latest Runs');
    }
  };

  return (
    <div className="explore-page-wrapper">
      <Navbar />

      <div className="map-container relative">
        <div ref={mapContainerRef} id="map" />
        
        {/* Strava Attribution */}
        <div className="absolute bottom-6 left-4 z-10 pointer-events-none">
          <img src="/images/powered_by_strava_orange.svg" alt="Powered by Strava" className="h-[24px] w-auto opacity-90 block dark:hidden" />
          <img src="/images/powered_by_strava_white.svg" alt="Powered by Strava" className="h-[24px] w-auto opacity-90 hidden dark:block" />
        </div>

        {/* Floating Sync Overlay */}
        <div className="map-overlay">
          <button
            id="sync-runs-btn"
            disabled={isLoading}
            onClick={syncRuns}
          >
            {syncMessage}
          </button>
          {isLoading && (
            <div id="loading-indicator" className="mt-2 text-sm font-semibold">
              Syncing...
            </div>
          )}
        </div>
      </div>

      <StreakWidget />
      <Footer />
    </div>
  );
}
