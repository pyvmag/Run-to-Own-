# Run-to-Own 🏃‍♂️👑
> Connect your runs to land ownership in a real-time gamified spatial coordinate empire. Built with Next.js (App Router, React 19, TypeScript), Redux Toolkit, Prisma, and PostgreSQL.

Every run you record expands your kingdom. Blaze paths across the map, capture resolution-9 H3 hexagonal tiles, compete with friends, and dominate your local territory!

---

## ⚡ Key Features

*   **Premium OAuth2 Strava Integration:** Seamless connection to the Strava API, pulling runner details and paginating chronological activity feeds. Includes a rate-limited mock session fallback for hassle-free local development.
*   **Decoupled JWT-Signed Sessions:** Highly secure session context caching using signed HTTP-only cookies powered by the `jose` encryption library, replacing legacy server-side HttpSession binds.
*   **Turf & H3 Geospatial Mathematics:** Fully translated geospatial calculations mapping coordinate polylines directly into **H3 v4** resolution-9 grids on a multi-scale **MapLibre GL** canvas:
    *   *Path Interpolation:* Automatically splits path polylines into precise 20m coordinate steps to assure zero gaps.
    *   *Line-Polygon Intersections:* Relies on **Turf.js** (`@turf/turf`) to calculate the exact running distance covered *inside* each H3 hexagon tile in meters.
    *   *Dynamic Leaderboard Dominance:* Recalculates ownership on-the-fly and color-codes tiles—orange `#fc4c02` for you, blue `#007cbf` for competitors.
*   **WebGL 3D Particles & ApexCharts:** Profile screens load floating 3D particle systems in a custom WebGL canvas using **Three.js** and map interactive area summary charts using **ApexCharts**. Both are carefully guarded in React mounts to prevent SSR hydration flashes.
*   **Social & Leaderboards:** Live search form looking up users, interactive friend request lists (accept/decline triggers), and competitive streak leaderboards.

---

## 🛠️ Technology Stack

*   **Frontend Framework:** Next.js 16 (App Router, React 19, TypeScript)
*   **Global State Management:** Redux Toolkit & React Redux
*   **Database ORM:** Prisma Client v6
*   **Database Storage:** PostgreSQL
*   **Geospatial Engines:** Turf.js (`@turf/turf`) & H3-js v4
*   **Visual Enhancements:** MapLibre GL, Three.js, ApexCharts, Tailwind CSS v4

---

## 🚀 Getting Started Locally

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (Active LTS e.g. v20+)
*   [PostgreSQL](https://www.postgresql.org/) database running locally or in the cloud.

### 2. Clone and Setup
Your Next.js React project `run-to-own-react` is established as a completely separate standalone directory from your Spring Boot project:
```bash
cd run-to-own-react
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
# PostgreSQL database connection string
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/run_to_own?schema=public"

# Cookie payload signature secret (any long random string)
JWT_SECRET="your-super-long-secure-signed-cookie-jwt-secret-key"

# Strava API Client configurations
STRAVA_CLIENT_ID="YOUR_STRAVA_CLIENT_ID"
STRAVA_CLIENT_SECRET="YOUR_STRAVA_CLIENT_SECRET"
STRAVA_REDIRECT_URI="http://localhost:3000/api/auth/strava/callback"

# MapTiler API Key (used for MapLibre base layers)
NEXT_PUBLIC_MAPTILER_KEY="YOUR_MAPTILER_API_KEY"
```

### 4. Database Initialization
Run the database migrations and client generations:
```bash
# Generate the Prisma client
npx prisma generate

# Sync the schema directly to your local PostgreSQL database
npx prisma db push
```

### 5. Launch the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Click **🔑 Try Guest Mode (Demo)** to instantly explore the dashboard with loaded mock activities, streaks, WebGL profile backgrounds, and grid boundaries!

---

## ☁️ Deploying to Vercel (Production)

Deploying a full-stack Next.js Prisma project to Vercel is extremely straightforward.

### Step 1: Provision a Production Database
Vercel is serverless, meaning you should host your PostgreSQL database on a cloud database provider. Excellent and free choices include:
*   **[Neon](https://neon.tech/)** (Highly recommended: serverless PostgreSQL)
*   **[Supabase](https://supabase.com/)**
*   **[Railway](https://railway.app/)**

Once created, copy the connection string (with transaction pooling enabled if using serverless e.g. `pgbouncer=true`).

### Step 2: Push to a New Git Repository
Initialize Git inside your `run-to-own-react` folder and push it to GitHub/GitLab:
```bash
git init
git add .
git commit -m "Initial commit of fullstack Next.js app"
# Link and push to your new repo
git remote add origin <YOUR_NEW_REPO_URL>
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Vercel
1.  Go to the **[Vercel Dashboard](https://vercel.com/)** and click **Add New Project**.
2.  Import your newly created Git repository.
3.  Expand **Environment Variables** and add all the keys from your local `.env`:
    *   `DATABASE_URL` *(Your Cloud PostgreSQL connection string)*
    *   `JWT_SECRET` *(Your session secret key)*
    *   `STRAVA_CLIENT_ID`
    *   `STRAVA_CLIENT_SECRET`
    *   `STRAVA_REDIRECT_URI` *(Make sure to add `https://<YOUR_VERCEL_DOMAIN>/api/auth/strava/callback` here and in your Strava Developer Settings!)*
    *   `NEXT_PUBLIC_MAPTILER_KEY`
4.  Configure the **Build Command** to include the Prisma migration hook:
    In Vercel Project Settings -> **Build & Development Settings**, change the **Build Command** to:
    ```bash
    npx prisma generate && npx prisma db push && next build
    ```
5.  Click **Deploy**! Vercel will automatically provision edge functions, compile the static layouts, apply database migrations, and launch your live application.
