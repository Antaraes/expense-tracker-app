# 13. Challenges & Edge Cases

## Currency Rounding Issues

**Problem:** When converting between currencies, floating-point arithmetic can produce values like 285.714285714... which must be rounded. Different rounding at different points produces different totals.

**Solution:**

- Use `NUMERIC(19,4)` in PostgreSQL for all monetary values — this is arbitrary-precision decimal, not floating-point
- Store `base_amount` with 4 decimal places (more than any display currency needs)
- Round only at the **display layer**, using the currency's `decimal_places` setting
- Accept a rounding tolerance of ±0.01 in the base currency when validating transfer balance
- Never use `FLOAT` or `DOUBLE PRECISION` for money
- In Flutter, use Dart's `Decimal` package (not `double`) for monetary calculations

**Example edge case:** Converting 100 MMK to THB at rate 0.010526 gives 1.0526 THB. Stored as 1.0526 in the database, displayed as ฿1.05 in the UI.

---

## Transfer Consistency

**Problem:** If the app crashes or network fails mid-transaction, you could end up with a debit line but no credit line, creating phantom money.

**Solution:**

- All transaction creation happens inside a PostgreSQL function (`create_transaction`) wrapped in an implicit database transaction
- If any line fails to insert, the entire transaction rolls back
- The application never creates the transaction header and lines in separate API calls
- The PostgreSQL function validates that transfer lines balance before committing
- Both Next.js and Flutter call the same `rpc('create_transaction')` — atomicity is guaranteed at the database level

---

## Data Integrity

**Problem:** What if someone manually edits the database and violates the ledger rules?

**Safeguards:**

- Foreign key constraints prevent orphaned records
- CHECK constraints enforce valid types and positive exchange rates
- A database trigger can validate `SUM(base_amount) = 0` for transfers on INSERT/UPDATE
- The `account_id` column on `transaction_lines` uses `ON DELETE RESTRICT` to prevent account deletion while transactions exist
- Regular integrity checks via a scheduled SQL job that flags imbalanced transactions

```sql
-- Integrity check: find imbalanced transfers
SELECT t.id, t.description, t.date, SUM(tl.base_amount) as imbalance
FROM transactions t
JOIN transaction_lines tl ON tl.transaction_id = t.id
WHERE t.type = 'transfer'
GROUP BY t.id
HAVING ABS(SUM(tl.base_amount)) > 0.01;
```

---

## Offline Sync Conflicts (Future)

For how the **current** app mitigates concurrent writes and how **cron integrity** fits in, see [15-offline-sync-strategy.md](./15-offline-sync-strategy.md).

**Problem:** If the user creates transactions offline on desktop AND mobile, syncing them back can create duplicates or conflicting edits.

**Potential solutions:**

- **Last-write-wins** — Simplest approach; most recent `updated_at` timestamp wins. Works for most personal finance scenarios.
- **Append-only ledger** — Since ledger entries are naturally additive, most offline transactions can be merged without conflict. Edits and deletes are the harder cases.
- **Conflict queue** — Flag conflicting records for manual user resolution. Display a sync conflict UI on both platforms.
- **CRDTs** — Conflict-free Replicated Data Types for eventual consistency. Overkill for v1 but theoretically sound.

**Platform-specific offline storage:**

- Desktop (Electron): `better-sqlite3` in the main process
- Mobile (Flutter): Drift (SQLite for Dart)
- Both sync against the same Supabase PostgreSQL instance

---

## Exchange Rate Edge Cases

**Missing rates** — If no rate exists for a date, the system falls back to the most recent prior rate. If no rate exists at all for a currency pair, the user must enter a manual rate.

**Rate direction** — Rates are stored directionally (THB→MMK is different from MMK→THB). The system stores both directions to avoid division precision issues.

**Rate staleness** — If the user creates a transaction for today but rates haven't been fetched yet, the system uses yesterday's rate and allows the user to override.

**Triangulation** — If the user needs THB→MMK but only has THB→USD and USD→MMK, the system can compute the cross rate. This is a future enhancement.

---

## Account Deletion vs. Archiving

**Problem:** Deleting an account would cascade-delete all its transaction lines, destroying financial history.

**Solution:** Accounts are never truly deleted. They are **archived** (`is_archived = true`). Archived accounts are hidden from the active account list but their transaction history is preserved. The UI shows a clear distinction between archiving (safe) and deleting (destructive, requires confirmation). This applies to both desktop and mobile UI.

---

## Electron + Next.js Specific Challenges

**Next.js server in Electron** — The Next.js app requires a local server process. In production, this is started by the Electron main process before creating the BrowserWindow. The `output: 'standalone'` config in `next.config.js` produces a minimal server bundle.

**Hot reload in development** — In dev mode, Electron loads from the Next.js dev server (`http://localhost:3000`). A custom script starts both processes and coordinates their lifecycle.

**Deep linking** — OAuth callback URLs must be handled via custom protocol (`ultrafinance://auth/callback`) registered in Electron.

**Auto-updates** — `electron-updater` handles updates for the Electron shell. Next.js frontend updates can be deployed separately if using a remote Next.js server in the future.

---

## Large Data Volumes

**Problem:** Over years of use, the transaction_lines table could grow to millions of rows, slowing queries.

**Mitigations:**

- Proper indexing on `(account_id)`, `(transaction_id)`, and `(user_id, date DESC)`
- The `base_amount` pre-computation eliminates expensive joins to exchange_rates for reports
- Pagination on all list views (cursor-based, not offset-based) — same pattern in Next.js `DataTable` and Flutter `ListView`
- Materialized views for frequently accessed aggregations (monthly summaries)
- Table partitioning by year if needed at scale (PostgreSQL native partitioning)