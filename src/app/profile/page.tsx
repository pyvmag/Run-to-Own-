'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { setAthlete } from '@/store/authSlice';
import Navbar from '@/components/Navbar';
import StreakWidget from '@/components/StreakWidget';
import Footer from '@/components/Footer';
import * as THREE from 'three';
import dynamic from 'next/dynamic';

// Dynamically import ApexCharts to prevent Next.js SSR "window is not defined" hydration errors
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const athlete = useSelector((state: RootState) => state.auth.athlete);

  // Apply background image stylesheet hook on mount
  useEffect(() => {
    document.body.classList.add('profile-page');
    return () => {
      document.body.classList.remove('profile-page');
    };
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [userDetails, setUserDetails] = useState<any>({ totalDistance: 0, currentStreak: 0, bestStreak: 0 });
  const [stats, setStats] = useState<any>(null);
  const [gear, setGear] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Authenticate user session
  useEffect(() => {
    async function initProfile() {
      try {
        const res = await fetch('/strava/athlete');
        if (!res.ok) {
          router.push('/');
          return;
        }
        dispatch(setAthlete(await res.json()));

        // Load DB stats
        const userRes = await fetch('/api/user/details');
        if (userRes.ok) {
          setUserDetails(await userRes.json());
        }

        // Load Strava stats
        const statsRes = await fetch('/strava/profile/stats');
        if (statsRes.ok) {
          setStats(await statsRes.json());
        }

        // Load Gear
        const gearRes = await fetch('/strava/profile/gear');
        if (gearRes.ok) {
          setGear(await gearRes.json());
        }
      } catch (err) {
        console.error('Failed to init profile details:', err);
      }
    }
    initProfile();
  }, [dispatch, router]);

  // Three.js interactive floating particle background
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // Create floating particles
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let i = 0; i < 5000; i++) {
      vertices.push(
        Math.random() * 20 - 10,
        Math.random() * 20 - 10,
        Math.random() * 20 - 10
      );
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const isDarkTheme = document.body.classList.contains('dark');
    const material = new THREE.PointsMaterial({
      color: isDarkTheme ? 0x475569 : 0xcbd5e1,
      size: 0.02,
      transparent: true,
      opacity: 0.8,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Rotating wireframe torus
    const torusGeometry = new THREE.TorusGeometry(3, 1, 16, 100);
    const torusMaterial = new THREE.MeshBasicMaterial({
      color: 0xfc4c02,
      wireframe: true,
      transparent: true,
      opacity: 0.05,
    });
    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    scene.add(torus);

    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      points.rotation.y += 0.001;
      points.rotation.x += 0.0005;
      torus.rotation.z += 0.002;
      torus.rotation.x += 0.001;
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      points.rotation.y = x * 0.2;
      points.rotation.x = y * 0.2;
    };
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [athlete]);

  // Extract totals
  const runTotals = stats?.all_run_totals || { distance: 0, count: 0, elapsed_time: 0, elevation_gain: 0 };
  const cumulativeDistance = userDetails.totalDistance || runTotals.distance;

  // Chart configuration
  const chartOptions = {
    chart: {
      type: 'area' as const,
      toolbar: { show: false },
      background: 'transparent',
    },
    colors: ['#fc4c02'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth' as const, width: 3 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [20, 100],
      },
    },
    xaxis: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      labels: { style: { colors: '#94a3b8' } },
    },
    yaxis: {
      labels: { style: { colors: '#94a3b8' } },
    },
    grid: {
      borderColor: 'rgba(148, 163, 184, 0.1)',
      strokeDashArray: 4,
    },
    theme: { mode: 'dark' as const },
  };

  const chartSeries = [
    {
      name: 'Distance',
      data: [12, 18, 15, 22, 30, 25, 40],
    },
  ];

  return (
    <div className="profile-page-wrapper">
      <canvas ref={canvasRef} id="profile-bg" />
      <Navbar />

      <div className="profile-container text-left">
        {/* Profile Card Info */}
        <div className="profile-header">
          <img
            id="profile-avatar"
            className="profile-avatar"
            src={athlete?.profile || '/images/default-avatar.png'}
            alt="Profile Avatar"
          />
          <h1 id="athlete-name">{`${athlete?.firstname || ''} ${athlete?.lastname || ''}`.trim() || 'Runner'}</h1>
          <p id="athlete-location">
            {athlete?.city || 'Karnataka'}, {athlete?.country || 'India'}
          </p>
        </div>

        {/* Dynamic Aggregated Stats */}
        <div className="stats-container">
          <div className="stat-card-profile">
            <p>Total Distance</p>
            <h2 id="total-distance">{(cumulativeDistance / 1000).toFixed(1)} km</h2>
          </div>
          <div className="stat-card-profile">
            <p>Total Runs</p>
            <h2 id="total-runs">{runTotals.count}</h2>
          </div>
          <div className="stat-card-profile">
            <p>Total Time</p>
            <h2 id="total-time">{(runTotals.elapsed_time / 3600).toFixed(1)} h</h2>
          </div>
          <div className="stat-card-profile">
            <p>Elevation Gain</p>
            <h2 id="total-elevation">{Math.round(runTotals.elevation_gain || 0)} m</h2>
          </div>
        </div>

        {/* Interactive Weekly Chart Overlay */}
        <section className="chart-section">
          <h2>Weekly Summary</h2>
          <div className="chart-toggle">
            <button id="toggle-run" className="active">
              🏃 Run
            </button>
            <button id="toggle-weight">🏋️ Weight</button>
          </div>
          <div id="weeklyChart">
            {mounted && <Chart options={chartOptions} series={chartSeries} type="area" height={350} />}
          </div>
        </section>

        {/* Gear progress cards */}
        <section className="gear-section">
          <h2>Your Gear</h2>
          {gear.length === 0 ? (
            <p>No gear detected. Strava shoes and bikes will appear here.</p>
          ) : (
            <div className="gear-grid">
              {gear.map((s, index) => {
                const isBike = s.distance > 800000;
                const maxDist = isBike ? 5000000 : 800000;
                const pct = Math.min(100, (s.distance / maxDist) * 100);

                return (
                  <div key={index} className="gear-card">
                    <h4 className="text-gray-900 dark:text-zinc-50 font-bold">
                      {s.name} {s.primary && <span style={{ color: 'gold' }}>★</span>}
                    </h4>
                    <p className="text-gray-600 dark:text-zinc-400 text-sm">
                      {(s.distance / 1000).toFixed(0)} km covered
                    </p>
                    <div className="progress-bar">
                      <div className="progress" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <StreakWidget />
      <Footer />
    </div>
  );
}
