# UltraFinance

Expense tracker built with **Next.js**, **Supabase**, and **Electron** (desktop shell).

## Quick start

1. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project (Settings → API).
2. Apply database migrations (see comments in `.env.example`), or for local development: `npm run db:start` then `npm run db:reset`.
3. Install dependencies: `npm install`
4. Web dev: `npm run dev:next`  
5. Desktop dev (Next + Electron): `npm run dev`

## Demo / test accounts

These users are created by the seed migrations (`supabase/migrations/`). **All accounts below use the same password.**

| Email | Password | Notes |
|--------|----------|--------|
| `demo@ultrafinance.local` | `DemoSeed2026!` | Full demo data + **superadmin** (admin panel) |
| `customer1@ultrafinance.local` | `DemoSeed2026!` | Regular user — Demo Customer One |
| `customer2@ultrafinance.local` | `DemoSeed2026!` | Regular user — Demo Customer Two |
| `customer3@ultrafinance.local` | `DemoSeed2026!` | Regular user — Demo Customer Three |

Sign in at `/login` with **email** and **password** (Supabase email/password auth).

**Security:** These credentials are for **local or seeded demo databases only**. Do not reuse this password in production, and do not treat this README as a source of secrets for live environments.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Build Electron main, run Next on port 3000, then open Electron |
| `npm run dev:next` | Next.js dev server only |
| `npm run build` | Production Next.js build |
| `npm run build:desktop` | Web build + Electron packaging |

## Desktop release smoke tests (matrix)

Run on a **clean** machine or VM when possible. Check each platform you ship.

| Step | macOS | Windows | Linux |
|------|-------|---------|-------|
| Install from GitHub Release asset | ☐ | ☐ | ☐ |
| First launch → login → open dashboard | ☐ | ☐ | ☐ |
| Install older build → relaunch → confirm update path (if using auto-update) | ☐ | ☐ | ☐ |
| Uninstall / remove app → no orphaned UltraFinance data where the OS expects cleanup | ☐ | ☐ | ☐ |

**Icons:** Repo root `logo.png` is used for **Electron** installers (electron-builder). The **web** UI uses `src/app/icon.png` (copy of the same asset for Next.js metadata).

## Documentation

Product and architecture notes live under `docs/ultrafinance/`.
