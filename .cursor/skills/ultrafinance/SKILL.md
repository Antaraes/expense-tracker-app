---
name: ultrafinance
description: >-
  Implements and reviews the UltraFinance expense tracker (Electron + Next.js App Router + Supabase).
  Enforces double-entry ledger rules, service-layer data access, RLS-safe design, and alignment with
  docs/ultrafinance. Use when editing this repo, adding features, database changes, or when the user
  mentions UltraFinance, ledger, transactions, Supabase, or Electron shell.
---

# UltraFinance — agent workflow

## Before writing code

1. **Read the spec** — Open [docs/ultrafinance/README.md](../../../docs/ultrafinance/README.md) and the chapter that matches the task (e.g. `05-database-design.md`, `06-transaction-system-logic.md`).
2. **Name the slice** — One of: auth, accounts, transactions, categories, currencies, reports, settings, electron shell.
3. **State invariants** — For money: double-entry lines balance (transfers); `base_amount` immutable after write; balances derived from `transaction_lines`, not stored on accounts.

## Architecture guardrails

- **Next.js**: App Router; route groups `(auth)` vs `(dashboard)`; Server Components by default; `'use client'` only for interactivity.
- **Data**: No `supabase.from(...)` in UI components — only through **services** in `features/*/services/`.
- **Backend**: Supabase **anon key** in client; RLS on all user tables; sensitive bypass only server-side if ever needed.
- **Electron**: Main/preload/renderer boundaries — native ops via IPC/preload, not raw Node in renderer.

## Thinking checklist (use every non-trivial change)

- [ ] Does this touch the ledger? If yes, confirm line sums / transfer balance and currency per line.
- [ ] Does this need a migration? If yes, SQL in `supabase/migrations/` with RLS policies updated in same story.
- [ ] Does UI need realtime? Wire Supabase subscription in hook + service, not scattered in pages.
- [ ] Multi-currency: rate at transaction time; `exchange_rate` + `base_amount` set atomically (prefer DB RPC like `create_transaction`).

## Review lens

- **Correctness**: Ledger math, FKs, no float money types in DB.
- **Security**: RLS patterns; no service role in client; validate inputs (e.g. Zod).
- **UX**: Amounts monospace + `tabular-nums`; destructive actions confirmed.

## Optional deep dives

- DB schema: [05-database-design.md](../../../docs/ultrafinance/05-database-design.md)
- Flows: [06-transaction-system-logic.md](../../../docs/ultrafinance/06-transaction-system-logic.md)
- Patterns: [09-design-patterns-and-best-practices.md](../../../docs/ultrafinance/09-design-patterns-and-best-practices.md)
