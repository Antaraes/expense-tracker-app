# 4. Folder Structure

## Desktop Project Structure (Electron + Next.js)

```
ultrafinance/
├── electron/                      # Electron main process
│   ├── main.ts                    # Entry point, creates BrowserWindow
│   ├── preload.ts                 # Preload script (IPC bridge)
│   ├── ipc/                       # IPC handlers
│   │   ├── file-export.ts         # CSV/PDF export via native FS
│   │   ├── system.ts              # OS-level operations
│   │   └── storage.ts             # Secure token storage
│   ├── updater.ts                 # Auto-update logic
│   └── tray.ts                    # System tray management
│
├── src/                           # Next.js application
│   ├── app/                       # App Router (file-based routing)
│   │   ├── layout.tsx             # Root layout (providers, fonts)
│   │   ├── page.tsx               # Root redirect → /dashboard
│   │   │
│   │   ├── (auth)/                # Auth route group (no sidebar)
│   │   │   ├── layout.tsx         # Auth layout (centered card)
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   │
│   │   └── (dashboard)/           # Main app route group (with sidebar)
│   │       ├── layout.tsx         # Dashboard layout (sidebar + header)
│   │       ├── dashboard/page.tsx
│   │       ├── transactions/
│   │       │   ├── page.tsx       # Transaction list
│   │       │   ├── new/page.tsx   # Create transaction
│   │       │   └── [id]/page.tsx  # Edit transaction
│   │       ├── accounts/
│   │       │   ├── page.tsx       # Account list
│   │       │   └── [id]/page.tsx  # Account detail + history
│   │       ├── reports/
│   │       │   ├── page.tsx       # Report overview
│   │       │   ├── monthly/page.tsx
│   │       │   └── categories/page.tsx
│   │       ├── categories/page.tsx
│   │       └── settings/page.tsx
│   │
│   ├── components/                # Shared UI components
│   │   ├── ui/                    # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   ├── data-table.tsx
│   │   │   └── ...
│   │   ├── layout/                # Shell components
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── mobile-nav.tsx
│   │   ├── forms/                 # Domain forms
│   │   │   ├── transaction-form.tsx
│   │   │   ├── account-form.tsx
│   │   │   └── category-form.tsx
│   │   ├── charts/                # Data visualization
│   │   │   ├── income-expense-chart.tsx
│   │   │   ├── category-donut.tsx
│   │   │   └── balance-trend.tsx
│   │   └── data-display/          # Tables, cards, lists
│   │       ├── transaction-list.tsx
│   │       ├── account-card.tsx
│   │       └── currency-badge.tsx
│   │
│   ├── features/                  # Feature-specific logic
│   │   ├── auth/
│   │   │   ├── hooks/useAuth.ts
│   │   │   ├── components/auth-guard.tsx
│   │   │   └── services/auth.service.ts
│   │   ├── transactions/
│   │   │   ├── hooks/useTransactions.ts
│   │   │   ├── hooks/useCreateTransaction.ts
│   │   │   ├── services/transactions.service.ts
│   │   │   └── types.ts
│   │   ├── accounts/
│   │   │   ├── hooks/useAccounts.ts
│   │   │   └── services/accounts.service.ts
│   │   ├── categories/
│   │   ├── currencies/
│   │   │   ├── hooks/useCurrencies.ts
│   │   │   ├── hooks/useExchangeRate.ts
│   │   │   └── services/currencies.service.ts
│   │   └── reports/
│   │       ├── hooks/useReports.ts
│   │       └── services/reports.service.ts
│   │
│   ├── lib/                       # Core utilities
│   │   ├── supabase/
│   │   │   ├── client.ts          # Browser Supabase client
│   │   │   ├── server.ts          # Server-side Supabase client
│   │   │   └── middleware.ts      # Auth middleware for routes
│   │   ├── currency.ts            # Formatting, conversion helpers
│   │   ├── date.ts                # Date utilities (date-fns)
│   │   ├── validation.ts          # Zod schemas
│   │   └── constants.ts
│   │
│   ├── store/                     # Zustand state management
│   │   ├── auth.store.ts
│   │   ├── accounts.store.ts
│   │   └── preferences.store.ts
│   │
│   ├── types/                     # Shared TypeScript types
│   │   ├── database.types.ts      # Supabase generated types
│   │   ├── transaction.types.ts
│   │   └── account.types.ts
│   │
│   └── styles/
│       └── globals.css            # Tailwind directives + custom vars
│
├── supabase/                      # Supabase local config
│   ├── migrations/                # SQL migration files
│   │   ├── 001_create_currencies.sql
│   │   ├── 002_create_profiles.sql
│   │   ├── 003_create_accounts.sql
│   │   ├── 004_create_categories.sql
│   │   ├── 005_create_transactions.sql
│   │   ├── 006_create_transaction_lines.sql
│   │   ├── 007_create_exchange_rates.sql
│   │   ├── 008_create_views.sql
│   │   └── 009_create_rls_policies.sql
│   ├── seed.sql                   # Default currencies + system categories
│   └── config.toml
│
├── package.json
├── next.config.js                 # Next.js config (output: 'standalone' for Electron)
├── tailwind.config.ts
├── tsconfig.json
├── components.json                # shadcn/ui config
├── electron-builder.json          # Build config for Win/Mac/Linux
└── .env.local                     # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## Future Flutter Mobile Structure

```
ultrafinance_mobile/
├── lib/
│   ├── main.dart
│   ├── app/
│   │   ├── app.dart               # MaterialApp, routing, theme
│   │   └── router.dart            # GoRouter configuration
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── accounts/
│   │   ├── reports/
│   │   └── settings/
│   ├── core/
│   │   ├── supabase/              # Supabase client init
│   │   ├── theme/                 # Color tokens, typography
│   │   ├── models/                # Data classes (freezed)
│   │   ├── services/              # Supabase service layer
│   │   └── utils/                 # Currency formatting, date helpers
│   └── shared/
│       └── widgets/               # Reusable UI components
├── pubspec.yaml                   # supabase_flutter, riverpod, freezed, go_router
└── .env                           # Supabase URL + anon key
```

---

## Key Design Decisions

**Next.js App Router** — File-based routing with layouts, loading states, and error boundaries built in. Route groups `(auth)` and `(dashboard)` share different layouts without nesting URL segments.

**shadcn/ui + Tailwind** — Copy-paste component primitives that are fully customizable. No opinionated component library lock-in. Dark theme is built into the Tailwind config.

**Feature-based organization** — Each domain (transactions, accounts, etc.) has its own hooks, services, and types co-located together. This scales better than organizing by technical layer.

**Service layer separation** — All Supabase calls go through service files, never directly from components. This makes it easy to swap the backend, add caching, or introduce offline support later.

**Electron separation** — The `electron/` directory is completely separate from `src/`. The Next.js app can run standalone in a browser for development. Electron-specific code is bridged via preload scripts.

**Supabase migrations** — All schema changes live in `supabase/migrations/` as versioned SQL files, enabling reproducible deployments and rollbacks.

**Shared Supabase backend** — Both Electron/Next.js and Flutter connect to the same Supabase project. The service layer in each platform mirrors the same repository pattern, just in different languages (TypeScript vs Dart).