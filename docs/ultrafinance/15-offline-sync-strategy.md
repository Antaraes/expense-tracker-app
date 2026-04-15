# 15. Offline sync & conflict strategy

This chapter complements **§ Offline sync conflicts** in [13-challenges-and-edge-cases.md](./13-challenges-and-edge-cases.md). It describes what UltraFinance does **today** (always-online desktop + Supabase) and how that scales if you add offline clients later.

---

## Current product (desktop, online-first)

- The **Electron + Next.js** app talks to **Supabase** over the network; there is **no local SQLite ledger** in the shipped desktop build.
- **Realtime** keeps multiple open tabs/sessions loosely aligned; **authoritative state** still lives in Postgres.
- **Transaction edits** use **optimistic concurrency**: `update_transaction` accepts `p_expected_updated_at`. If the row’s `updated_at` changed since the form loaded, the RPC fails with a clear error so the user refreshes instead of silently overwriting another session’s work.

This does **not** replace a full offline merge engine; it **reduces** damage from concurrent edits while online.

---

## Scheduled integrity (transfers)

- RPC **`scan_imbalanced_transfers`** returns transfer headers whose `transaction_lines` **base_amount** sums exceed the documented tolerance (see doc 13).
- Call it from automation with **`GET /api/cron/ledger-integrity`** and the same **`CRON_SECRET`** pattern as notification lifecycle cron routes.

Use this to **detect** rare DB corruption or RPC bugs—not as a user-facing feature.

---

## If you add offline later (Flutter, local SQLite, etc.)

Pick one primary strategy per doc 13:

1. **Last-write-wins** on `updated_at` — acceptable for many personal finance flows if you surface failures.
2. **Conflict queue** — user resolves ambiguous edits; best when edits and deletes must coexist with offline queues.
3. **Append-only ledger** — new lines/transactions merge easily; **edits/deletes** need explicit rules.

**Recommendation:** keep **creates** append-only where possible; for **updates**, reuse **`updated_at` checks** at the API boundary and escalate to a conflict UI when the server rejects a stale payload.

---

## OAuth / deep links

Custom URL schemes for OAuth in Electron are **out of scope** for this chapter; see security doc **11** when you implement them.
