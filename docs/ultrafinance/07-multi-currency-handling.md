# 7. Multi-Currency Handling

## How Exchange Rates Are Stored

Exchange rates are stored in the `exchange_rates` table as directional pairs with a date:

```
from_currency | to_currency | rate      | effective_date
THB           | MMK         | 95.000000 | 2026-04-03
THB           | USD         | 0.028571  | 2026-04-03
USD           | THB         | 35.000000 | 2026-04-03
```

Rates are fetched daily from an external API and stored for each date. A unique constraint on `(from_currency, to_currency, effective_date)` prevents duplicates.

### Rate Lookup Strategy

When a transaction is created and the user needs a rate, the system looks up the most recent rate on or before the transaction date:

```sql
SELECT rate FROM exchange_rates
WHERE from_currency = 'THB'
  AND to_currency = 'MMK'
  AND effective_date <= '2026-04-03'
ORDER BY effective_date DESC
LIMIT 1;
```

If no rate is found, the user is prompted to enter a manual rate.

### Triangulation (line → base)

When there is no direct or inverse pair between the **line currency** and **reporting base**, the app tries **pivot** legs stored in `exchange_rates` — **USD**, **EUR**, then **GBP** — e.g. `MMK → USD → THB`. If all legs are missing, spot displays still fall back to **ledger `base_amount`** where used.

---

## Why Historical Rates Matter

Consider this scenario:

- **March 1:** User transfers 10,000 THB to USD at rate 1 USD = 35 THB. They receive ~285.71 USD.
- **April 1:** The rate changes to 1 USD = 36 THB.

If we only stored the current rate (36), then looking back at March, the system would calculate: 285.71 USD × 36 = 10,285.56 THB — which is **wrong**. The user only spent 10,000 THB.

By storing the rate at transaction time (`exchange_rate` on each `transaction_line`), the March transaction always shows the correct 10,000 THB value, regardless of current rates.

**Rule:** The `exchange_rate` and `base_amount` on a `transaction_line` are immutable after creation. They represent a historical fact.

---

## How Conversion Works in Reports

### Account Balance Calculation

Each account's balance is the sum of `amount` in its native currency:

```sql
SELECT SUM(amount) as balance
FROM transaction_lines
WHERE account_id = :account_id;
```

This gives the balance in the account's native currency.

### Net Worth (Converted to Base Currency)

For a unified net worth view, we use `base_amount` which was pre-computed at transaction time:

```sql
SELECT a.name, a.default_currency,
       SUM(tl.amount) as native_balance,
       SUM(tl.base_amount) as base_balance
FROM transaction_lines tl
JOIN accounts a ON tl.account_id = a.id
WHERE a.user_id = :user_id AND a.is_archived = false
GROUP BY a.id, a.name, a.default_currency;
```

### Current Value vs. Historical Value

The system supports two reporting modes:

**Historical mode** (default) — Uses the `base_amount` stored at transaction time. This tells you what things were worth when you transacted.

**Current mode** (optional) — Re-converts native balances using today's exchange rate. This tells you what your foreign-currency holdings are worth right now.

```sql
-- Current value mode
SELECT a.name, a.default_currency,
       SUM(tl.amount) as native_balance,
       SUM(tl.amount) * COALESCE(er.rate, 1) as current_base_value
FROM transaction_lines tl
JOIN accounts a ON tl.account_id = a.id
LEFT JOIN LATERAL (
  SELECT rate FROM exchange_rates
  WHERE from_currency = a.default_currency
    AND to_currency = :base_currency
    AND effective_date <= CURRENT_DATE
  ORDER BY effective_date DESC
  LIMIT 1
) er ON true
WHERE a.user_id = :user_id
GROUP BY a.id, a.name, a.default_currency, er.rate;
```

---

## Currency Rounding Strategy

Different currencies have different precision requirements:

| Currency | Decimal Places | Example |
| --- | --- | --- |
| THB | 2 | ฿1,234.56 |
| USD | 2 | $1,234.56 |
| MMK | 0 | K1,234 |
| BTC | 8 | ₿0.00123456 |

Rounding is applied at the **display layer**, not the database layer. The database stores values with 4 decimal places (`NUMERIC(19,4)`) to preserve precision during calculations. The `currencies.decimal_places` field drives formatting in the UI.