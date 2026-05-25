# 🗺️ Run-to-Own

[![Live Demo](https://img.shields.io/badge/demo-live_site-0e6e55?style=for-the-badge)](https://run-to-own.vercel.app/)
[![Powered by Strava](https://img.shields.io/badge/Strava-API_Integrated-FC4C02?style=for-the-badge&logo=strava)](https://developers.strava.com/)
[![Built With Next.js](https://img.shields.io/badge/Next.js-16.x-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Database Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)

> Turn your real-world miles into virtual territory ownership. Claim H3 resolution-9 hexagonal tiles on a dynamic map, defend your turf from local rivals, and climb the global leaderboards. **Your footsteps build an empire.**

---

## 🚀 The Concept

Run-to-Own transforms real-world running data into a competitive, map-based strategy game. By partitioning maps into a hyper-precise hexagonal grid system powered by **Uber's H3**, every activity tracked via your wearable or phone expands your digital footprint. 

* **Discover & Claim:** Be the first athlete to run through an unclaimed tile to seize ownership.
* **Turf Wars:** If a rival runs more distance within your tile, ownership shifts. Defend your boundaries or go on the offensive.
* **Exploration Multipliers:** Rare and high-risk zones offer bonus points, breaking you out of standard running routes.

---

## 🎨 Application Interface Showcase

| 🔐 1. Gateway Authentication (Login) | 🏠 2. Central Activity Hub (Home) |
| --- | --- |
| <img src="public/readme%20bg/login%20page.png" width="420" alt="Run-To-Own Gateway Authentication Login Screen"/> | <img src="public/readme%20bg/home%20page.png" width="420" alt="Run-To-Own Central Activity Hub Home Dashboard"/> |
| **Features:** Secure Strava OAuth 2.0 protocol handler with an encrypted session JWT cookie mechanism, alongside a zero-setup local guest demo login. | **Features:** Glassmorphic layout with live active streak widgets, cumulative fitness statistics telemetry, and real-time activity feeds. |

| 🗺️ 3. Geospatial Grid (Explore) | 👤 4. Athlete Dossier (Profile) |
| --- | --- |
| <img src="public/readme%20bg/explore%20page.png" width="420" alt="Run-To-Own Geospatial Grid Map"/> | <img src="public/readme%20bg/profile%20page.png" width="420" alt="Run-To-Own Athlete Dossier Profile Summary"/> |
| **Features:** Interactive vector map engine built on MapLibre GL and Turf.js rendering resolution-9 H3 grid tiles (claimed and contested) in real-time. | **Features:** Immersive Three.js 3D canvas and dynamic ApexCharts analytics reporting performance and run metrics over time. |

---

## ⚡ Core Features

### 🗺️ Geospatial H3 Grid Engine
* **Precision Hexagonal Mapping:** Utilizes Uber's H3-js (Resolution-9) geospatial index to partition the world into elegant, standardized hexagons.
* **Real-time Path Interpolation:** Integrates Turf.js (`@turf/turf`) and Mapbox polyline decoders to cleanly trace coordinates onto active grid cells.
* **Real-time Ownership Mutations:** Automatically calculates tile captures and hands over control during cross-user activity syncs.

### 🎮 Gamified Mechanics & Analytics
* **Performance Scoring:** Advanced scoring algorithms factoring in distance, elevation gain, and novel route tracking.
* **Streak Tracking:** Core background services measuring daily and weekly active streaks with unlockable milestone badges.
* **Social Hub & Leaderboard:** Search and follow friends, manage pending requests, and battle for the top spot on local leaderboards.

---

## 🛠️ Technical Architecture

The platform has been re-engineered from the ground up as a fully decoupled, serverless-ready Next.js application built to handle fast geospatial calculations and high performance.

```text
               ┌───────────────────────┐
               │      Strava API       │
               └───────────┬───────────┘
                           │ Webhooks / OAuth2
                           ▼
 ┌───────────────────────────────────────────────────────────┐
 │ FRONTEND & BACKEND (Next.js App Router)                  │
 │                                                           │
 │  ┌───────────────────────┐     ┌────────────────────────┐ │
 │  │   Next.js API Routes  │◄───►│ React 19 Client / SSR  │ │
 │  │ (Auth / Friends / Sync)│     │  (MapLibre / Redux)    │ │
 │  └───────────┬───────────┘     └───────────┬────────────┘ │
 └──────────────┼─────────────────────────────┼──────────────┘
                │                             │ Three.js / Canvas
                ▼                             ▼
        ┌───────────────┐             ┌───────────────┐
        │   Prisma ORM  │             │  ApexCharts   │
        └───────┬───────┘             └───────────────┘
                ▼
   ┌──────────────────────────┐
   │   Supabase PostgreSQL    │
   └──────────────────────────┘
```

### 🧰 Tech Stack
* **Backend & API Framework:** Next.js 16 (App Router) + Server Actions
* **State Management:** Redux Toolkit + React-Redux
* **Database & ORM:** Supabase PostgreSQL + Prisma ORM (v6)
* **Map & Spatial Engine:** MapLibre GL, Turf.js, H3-js (v4), `@mapbox/polyline`
* **3D Visualizations & Charts:** Three.js, ApexCharts (`react-apexcharts`)
* **Styling & UX:** Tailwind CSS v4 + Vanilla HSL-variable glassmorphism custom system
* **Authentication:** Signed cookie-based JWTs using the `jose` encryption package

---

## 💻 Local Setup Guide

### Prerequisites
* Node.js 18+ installed
* A Supabase Database (or any local PostgreSQL instance)
* A Strava Developer Account (Client ID, Client Secret)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/pyvmag/Run-to-Own-.git
cd Run-to-Own-
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root of the project:

```env
DATABASE_URL="postgresql://postgres.xxx:YOUR_PASSWORD@...:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:YOUR_PASSWORD@db.xxx.supabase.co:5432/postgres"

JWT_SECRET="your-super-secure-jwt-cookie-key"

STRAVA_CLIENT_ID="your_strava_client_id"
STRAVA_CLIENT_SECRET="your_strava_client_secret"
STRAVA_REDIRECT_URI="http://localhost:3000/api/auth/strava/callback"

NEXT_PUBLIC_MAPTILER_KEY="your_maptiler_api_key"
```

### 3. Database Synchronization & Migrations
Synchronize your local database schema with your Supabase or PostgreSQL container:

```bash
npx prisma generate
npx prisma db push
```

### 4. Run the Dev Server
Start the local server:

```bash
npm run dev
```

Open `http://localhost:3000` to log in and sync your profile.

---

## 📬 Let's Connect

Have ideas for team turf wars, multi-city lobbies, or localized event layers?

* **Maintainer:** Vaibhav Magdum
* **Portfolio:** [vaibhavmagdum.vercel.app](https://vaibhavmagdum.vercel.app)
* **GitHub:** [@pyvmag](https://github.com/pyvmag)
