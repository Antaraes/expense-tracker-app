# 2. System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ELECTRON SHELL                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │              RENDERER PROCESS                      │  │
│  │  ┌───────────────────────────────────────────┐    │  │
│  │  │         Next.js Application               │    │  │
│  │  │  App Router │ Pages │ API Routes          │    │  │
│  │  │  Components │ Hooks │ Zustand State       │    │  │
│  │  │  Tailwind CSS + shadcn/ui                 │    │  │
│  │  └───────────────────────────────────────────┘    │  │
│  │                    │                                │  │
│  │            Service Layer                            │  │
│  │     (Repositories + Business Logic)                 │  │
│  └─────────────────────┴───────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │              MAIN PROCESS                          │  │
│  │  IPC Bridge │ Auto-updater │ System Tray          │  │
│  │  Native FS  │ Notifications │ Deep Links          │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │    SUPABASE CLOUD     │
              │  ┌─────────────────┐  │
              │  │   Auth (GoTrue) │  │
              │  └─────────────────┘  │
              │  ┌─────────────────┐  │
              │  │  PostgREST API  │  │
              │  └─────────────────┘  │
              │  ┌─────────────────┐  │
              │  │   Realtime WS   │  │
              │  └─────────────────┘  │
              │  ┌─────────────────┐  │
              │  │   PostgreSQL    │  │
              │  │  (Database)     │  │
              │  └─────────────────┘  │
              └───────────────────────┘
                          │
                   (Future Phase)
                          │
              ┌───────────────────────┐
              │    FLUTTER MOBILE     │
              │  ┌─────────────────┐  │
              │  │  Dart/Flutter   │  │
              │  │  supabase_fl    │  │
              │  │  Same RLS/Auth  │  │
              │  └─────────────────┘  │
              └───────────────────────┘
```

---

## Electron + Next.js Integration

**Why Next.js inside Electron?**

Next.js provides significant advantages over plain React for this application:

- **App Router** — File-based routing with layouts, loading states, and error boundaries built in
- **Server Components** — Reduce client-side JavaScript bundle size (rendered by Next.js's built-in server in Electron)
- **API Routes** — Local API endpoints within the Electron app for sensitive operations (token management, file export)
- **Built-in optimizations** — Image optimization, code splitting, and prefetching out of the box
- **TypeScript first** — Full type safety with excellent DX

**How it works in Electron:**

The Electron main process starts a local Next.js server (in production mode) and loads it in a `BrowserWindow`. In development, it connects to the Next.js dev server with hot reload.

```
electron/main.ts
  │
  ├── Starts Next.js server (production: next start on localhost:3000)
  ├── Creates BrowserWindow → loads http://localhost:3000
  ├── Sets up IPC handlers for native operations
  └── Manages app lifecycle (tray, updates, quit)
```

**Integration approach:** Using `nextron` or a custom setup with `next` + `electron-builder`.

---

## Frontend Architecture (Next.js App Router)

The Next.js application uses the App Router pattern:

- **app/** — Route segments with `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- **app/(dashboard)/** — Grouped route for the main authenticated shell (sidebar + content)
- **app/(auth)/** — Grouped route for login/register pages (no sidebar)
- **Components** — Reusable UI built with shadcn/ui + Tailwind CSS
- **Hooks** — Custom hooks for data fetching, auth state, real-time subscriptions
- **State Management** — Zustand for global client state (auth, preferences, cached data)
- **Services** — Abstraction layer over Supabase client calls

---

## Supabase Backend

Supabase provides the entire backend infrastructure, shared between desktop and future Flutter mobile:

- **Authentication** — GoTrue handles user registration, login, session management, and OAuth providers
- **Database** — PostgreSQL with full SQL capability, triggers, functions, and views
- **PostgREST API** — Auto-generated REST API from the database schema
- **Realtime** — WebSocket subscriptions for live data updates
- **Row-Level Security** — PostgreSQL policies ensuring data isolation per user

---

## Data Flow

```
User Action (UI)
    │
    ▼
Next.js Page / Component (App Router)
    │
    ▼
Custom Hook (useTransactions, useAccounts, etc.)
    │
    ▼
Service Layer (repository pattern)
    │
    ▼
Supabase JS Client (@supabase/supabase-js)
    │
    ▼
PostgREST API / Realtime WS
    │
    ▼
PostgreSQL (with RLS policies)
    │
    ▼
Response → Zustand State Update → UI Re-render
```

All database operations pass through Supabase's PostgREST layer, which enforces Row-Level Security policies. The Supabase JS client handles authentication tokens automatically.

---

## Flutter Mobile (Future Phase)

The Flutter mobile app will share the same Supabase backend:

- **`supabase_flutter`** package for auth, database, and realtime
- **Same PostgreSQL schema and RLS policies** — no backend changes needed
- **Platform-native UI** — Material 3 (Android) and Cupertino (iOS) adaptive widgets
- **Offline-first** — Local Drift/SQLite database with sync engine
- **Shared business logic** — Currency conversion, validation rules implemented in Dart
- **Push notifications** — Budget alerts and recurring transaction reminders via FCM

The Supabase backend is **platform-agnostic** — both Electron/Next.js and Flutter connect to the same project, same tables, same auth. This is a key architectural advantage.

---

## Offline-First Design (Future)

**Desktop (Electron):**

- Local SQLite database via `better-sqlite3` in the Electron main process
- Sync engine that queues mutations when offline and replays when reconnected
- Conflict resolution using timestamp-based last-write-wins or user-prompted merge

**Mobile (Flutter):**

- Local database via Drift (SQLite wrapper for Dart)
- Background sync service with Supabase
- Optimistic UI updates with rollback on sync failure

Both platforms follow the same sync protocol against the shared Supabase backend.