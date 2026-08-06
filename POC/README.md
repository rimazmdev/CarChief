# CarChief POC (Proof of Concept)

CarChief is an intelligent automotive platform featuring AI-powered inventory search, customer & lead management, vehicle tracking, and automated vehicle query responses using Google's Gemini AI and Supabase / PostgreSQL.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Getting Started](#getting-started)
  - [Option 1: Local Development (Node.js)](#option-1-local-development-nodejs)
  - [Option 2: Docker Compose (Containerized)](#option-2-docker-compose-containerized)
  - [Option 3: Production Build](#option-3-production-build)
- [Database Setup & Schema](#database-setup--schema)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

---

## 🚗 Overview

CarChief POC provides a complete full-stack environment for automotive sales management. Key capabilities include:
- **AI-Powered Natural Language Search**: Uses `@google/genai` (Gemini API) to search vehicle inventory based on flexible customer criteria (e.g., *"automatic SUVs under $15k arriving next month"*).
- **Vehicle Inventory & Logistics Management**: Tracks stock, status, inspection results, ETA/ETD dates, location, and specifications.
- **Database & Auth Integration**: Supports both Supabase Cloud and local PostgreSQL, with Firebase Auth support.
- **Modern UI**: Built with React 19, TypeScript, and Tailwind CSS v4.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Motion (Framer Motion), Lucide React
- **Backend**: Node.js, Express, `tsx` (TypeScript Execution)
- **AI Integration**: `@google/genai` (Google Gemini 2.5/Flash API)
- **Database**: Supabase PostgreSQL / Local PostgreSQL 15 Alpine
- **Authentication**: Supabase Auth / Firebase Client SDK
- **Containerization**: Docker & Docker Compose

---

## 📌 Prerequisites

Before cloning and running the application, make sure you have the following installed on your machine:

- **Node.js**: `v20.0.0` or higher
- **npm**: `v10.0.0` or higher (or `bun` / `pnpm` / `yarn`)
- **Docker & Docker Compose**: (Optional) Required if you intend to run the full containerized environment or local PostgreSQL instance.
- **Git**: For cloning the repository.

---

## ⚙️ Environment Configuration

1. In the `POC` directory, create a `.env` file (or copy from the template below):

```bash
cp .env.example .env  # Or create .env directly in the POC directory
```

2. Configure your environment variables inside `POC/.env`:

```env
# GEMINI AI API CONFIGURATION (Required for AI search & chat features)
GEMINI_API_KEY="your_google_gemini_api_key"

# APPLICATION CONFIGURATION
APP_URL="http://localhost:3000"

# SUPABASE CONFIGURATION
VITE_SUPABASE_URL="https://your-supabase-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your_supabase_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"

# POSTGRESQL DATABASE URL (Supabase Cloud or Local Docker PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres_password@localhost:5432/postgres"

# FIREBASE CLIENT CONFIGURATION
VITE_FIREBASE_API_KEY="your_firebase_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"
VITE_FIREBASE_MEASUREMENT_ID="your_measurement_id"
```

> ⚠️ **Note**: Obtain a free Gemini API key from [Google AI Studio](https://aistudio.google.com/).

---

## 🚀 Getting Started

Clone the repository and navigate into the `POC` folder:

```bash
git clone <repository-url>
cd CarChief/POC
```

---

### Option 1: Local Development (Node.js)

Run the backend Express server with Vite middleware in hot-reloading development mode:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Ensure `.env` File is Configured**:
   Make sure `GEMINI_API_KEY` and Supabase credentials are valid in `POC/.env`.

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```

4. **Access the Application**:
   Open your browser and navigate to:
   - 🌐 App: [http://localhost:3000](http://localhost:3000)

---

### Option 2: Docker Compose (Containerized Setup)

This spins up both the **CarChief Application** and a **Local Supabase PostgreSQL container** populated with seed data automatically.

1. **Build and Run Containers**:
   ```bash
   docker compose up -d --build
   ```

2. **Check Container Status**:
   ```bash
   docker compose ps
   ```

3. **Services Provided**:
   - 🚗 **Web App**: [http://localhost:3000](http://localhost:3000)
   - 🐘 **PostgreSQL Database**: `localhost:5432` (User: `postgres`, Password: `postgres`, DB: `postgres`)

4. **Stop Containers**:
   ```bash
   docker compose down
   ```

---

### Option 3: Production Build

To test the compiled production build locally:

1. **Build the Frontend & Backend**:
   ```bash
   npm run build
   ```
   *This compiles the Vite frontend into `dist/` and bundles `server.ts` into `dist/server.cjs`.*

2. **Start the Production Server**:
   ```bash
   npm start
   ```

3. **Access the Application**:
   Open [http://localhost:3000](http://localhost:3000).

---

## 🗄️ Database Setup & Schema

The database schema and sample data are located at:
`POC/supabase/schema.sql`

### Table Schema Summary
- `vehicles`: Inventory items, pricing, specs, images, logistics ETA/ETD dates, stock status.
- `faqs`: Frequently Asked Questions used for buyer guidance and AI knowledge base.
- `customers`: Customer profiles, tiers, contact details, and auth references.
- `leads`: Buyer inquiry leads and sales pipelines.
- `deals`: Sales deals, payment terms, and agreement tracking.
- `activity_logs`: Audit logs of customer and system actions.

### Running Schema on Supabase Cloud
1. Go to your **Supabase Dashboard** -> **SQL Editor**.
2. Copy contents from `POC/supabase/schema.sql` and run the script.

### Running Schema on Local PostgreSQL
If running via `docker compose up -d`, the file `supabase/schema.sql` is automatically mounted into `/docker-entrypoint-initdb.d/schema.sql` and initialized on first container launch.

---

## 📜 Available Scripts

In the `POC` directory, you can run:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts server in development mode using `tsx server.ts` with Vite HMR |
| `npm run build` | Builds Vite client assets & bundles Express backend into `dist/server.cjs` |
| `npm start` | Runs the production-bundled server from `dist/server.cjs` |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run clean` | Removes build directories (`dist/`) |

---

## 📂 Project Structure

```text
CarChief/POC/
├── docker-compose.yml       # Docker Compose setup for App & PostgreSQL
├── Dockerfile               # Multi-stage Docker build config
├── index.html               # Main HTML entrypoint for Vite
├── package.json             # NPM dependencies & scripts
├── server.ts                # Express backend server with Gemini AI endpoints
├── vite.config.ts           # Vite configuration & server rules
├── assets/                  # Project static assets & mock images
├── public/                  # Public web assets
├── src/                     # React application source code
│   ├── components/          # UI components (Inventory, Search, Auth, etc.)
│   ├── context/             # App Context Providers (Database, Auth)
│   ├── lib/                 # Service integrations (Supabase, Firebase)
│   └── types/               # TypeScript interfaces
└── supabase/
    └── schema.sql           # Database tables, RLS policies & seed data
```

---

## 🔧 Troubleshooting

### 1. `GEMINI_API_KEY environment variable is required but missing`
- Ensure `.env` exists in the `POC` directory and contains `GEMINI_API_KEY="your_api_key"`.
- Restart `npm run dev` after updating the `.env` file.

### 2. Port `3000` or `5432` already in use
- Check if another application or local PostgreSQL instance is using port `3000` or `5432`:
  ```bash
  lsof -i :3000
  lsof -i :5432
  ```
- Either stop the process or change the port in `docker-compose.yml` / `.env`.

### 3. Docker build error or dependency lock issue
- Clean and rebuild without cached layers:
  ```bash
  docker compose down -v
  docker compose build --no-cache
  docker compose up -d
  ```

---

## 📄 License

This project is proprietary software created for the **CarChief** platform. All rights reserved.
