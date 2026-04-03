# 5. Database Design

## Design Philosophy

The database follows a **double-entry accounting (ledger-based) model**. This is the same system used by banks, accounting software (QuickBooks, Xero), and enterprise ERP systems.

**Core principle:** Every financial event is recorded as a `transaction` with two or more `transaction_lines`. Each line debits or credits a specific account. For every transaction, the sum of all lines must equal zero (debits = credits).

This model provides built-in correctness guarantees, full auditability, and naturally handles complex scenarios like multi-currency transfers.

---

## Entity Relationship Overview

```
users
  │
  ├── 1:N ── accounts
  ├── 1:N ── categories
  ├── 1:N ── transactions ── 1:N ── transaction_lines
  └── 1:1 ── user_settings

currencies (global lookup table)
  │
  ├── referenced by ── accounts.default_currency
  ├── referenced by ── transaction_lines.currency_code
  └── referenced by ── exchange_rates (from/to)

exchange_rates (historical, global)
```

---

## Table: `users`

Managed by Supabase Auth. The `auth.users` table is the source of truth. We create a `public.profiles` table that mirrors essential user data.

```sql
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  base_currency TEXT NOT NULL DEFAULT 'THB' REFERENCES currencies(code),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Notes:** The `id` directly references Supabase's `auth.users` table. The `base_currency` determines the default currency for reports and dashboards.

---

## Table: `currencies`

Global lookup table for supported currencies.

```sql
CREATE TABLE public.currencies (
  code            TEXT PRIMARY KEY,           -- 'THB', 'MMK', 'USD'
  name            TEXT NOT NULL,              -- 'Thai Baht'
  symbol          TEXT NOT NULL,              -- '฿'
  decimal_places  INTEGER NOT NULL DEFAULT 2, -- 0 for MMK, 2 for USD
  is_active       BOOLEAN NOT NULL DEFAULT true
);
```

**Why `decimal_places`?** Currencies like MMK have no fractional units, while USD has cents. This field drives formatting and rounding logic throughout the app.

---

## Table: `accounts`

Financial accounts belonging to a user.

```sql
CREATE TABLE public.accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('bank', 'e_wallet', 'cash', 'credit_card')),
  default_currency  TEXT NOT NULL REFERENCES currencies(code),
  icon              TEXT,
  color             TEXT,
  is_archived       BOOLEAN NOT NULL DEFAULT false,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_user ON accounts(user_id);
```

**Critical:** Account balances are NEVER stored in this table. They are always computed by summing transaction_lines. This eliminates sync issues and ensures the ledger is always the single source of truth.

---

## Table: `categories`

Hierarchical transaction categories.

```sql
CREATE TABLE public.categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,  -- NULL = system default
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  icon        TEXT,
  color       TEXT,
  type        TEXT NOT NULL CHECK (type IN ('expense', 'income', 'both')),
  is_system   BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_user ON categories(user_id);
```

**Note:** `user_id = NULL` with `is_system = true` represents system-default categories shared by all users. Users can create custom categories.

---

## Table: `transactions`

The transaction header — metadata about a financial event.

```sql
CREATE TABLE public.transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  description   TEXT,
  notes         TEXT,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
```

**Design note:** The `type` field is primarily for UI convenience and filtering. The actual financial semantics are fully determined by the transaction_lines.

---

## Table: `transaction_lines` (The Ledger)

This is the **heart of the system**. Each line represents a debit or credit to a specific account.

```sql
CREATE TABLE public.transaction_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  amount          NUMERIC(19,4) NOT NULL,     -- positive = debit (money in), negative = credit (money out)
  currency_code   TEXT NOT NULL REFERENCES currencies(code),
  exchange_rate   NUMERIC(15,6) NOT NULL DEFAULT 1.000000,  -- rate to base currency at time of transaction
  base_amount     NUMERIC(19,4) NOT NULL,     -- amount * exchange_rate (in user's base currency)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_txn_lines_transaction ON transaction_lines(transaction_id);
CREATE INDEX idx_txn_lines_account ON transaction_lines(account_id);
```

### Column Explanations

- **`amount`** — The value in the line's native currency. Positive means money flows INTO the account (debit). Negative means money flows OUT (credit).
- **`currency_code`** — The currency of this specific line (inherited from the account's default currency).
- **`exchange_rate`** — The conversion rate from this currency to the user's base currency, captured at transaction time. This is critical for historical accuracy.
- **`base_amount`** — Pre-computed value in the base currency (`amount * exchange_rate`). This enables fast aggregation for reports without re-converting every line.

### The Balance Rule

For a correctly formed transaction, the sum of `base_amount` across all lines MUST be zero (or near-zero within rounding tolerance):

```sql
-- Validation check
SELECT transaction_id, SUM(base_amount) as balance
FROM transaction_lines
GROUP BY transaction_id
HAVING ABS(SUM(base_amount)) > 0.01;  -- Should return empty
```

---

## Table: `exchange_rates`

Historical exchange rates for currency conversion.

```sql
CREATE TABLE public.exchange_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency   TEXT NOT NULL REFERENCES currencies(code),
  to_currency     TEXT NOT NULL REFERENCES currencies(code),
  rate            NUMERIC(15,6) NOT NULL,
  effective_date  DATE NOT NULL,
  source          TEXT DEFAULT 'manual',  -- 'api', 'manual'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(from_currency, to_currency, effective_date)
);

CREATE INDEX idx_exchange_rates_lookup 
  ON exchange_rates(from_currency, to_currency, effective_date DESC);
```

**Why historical rates?** If you recorded a transfer at rate 1 USD = 35 THB on March 1, and the rate changes to 36 on April 1, your March report should still show the original rate. Historical rates preserve the accuracy of past transactions.

---

## Why This Structure is Scalable

**Data integrity** — The double-entry model has built-in validation: if debits don't equal credits, something is wrong. This catches bugs early.

**Extensibility** — Adding new transaction types (refunds, fees, adjustments) requires no schema changes — just new combinations of transaction lines.

**Performance** — The `base_amount` pre-computation means reports can aggregate across currencies with a simple SUM, no joins to exchange_rates needed.

**Auditability** — Every financial movement is recorded with its exchange rate at the time. Nothing is overwritten; the ledger is append-only by design.

**Multi-currency native** — Currency is a property of each line, not the transaction. A single transaction can involve multiple currencies naturally.