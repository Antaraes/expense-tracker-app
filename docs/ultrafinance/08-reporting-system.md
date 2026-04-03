# 8. Reporting System

## Balance Calculation

### Per-Account Balance (Native Currency)

```sql
CREATE OR REPLACE VIEW account_balances AS
SELECT 
  a.id,
  a.user_id,
  a.name,
  a.type,
  a.default_currency,
  COALESCE(SUM(tl.amount), 0) as balance,
  COALESCE(SUM(tl.base_amount), 0) as base_balance
FROM accounts a
LEFT JOIN transaction_lines tl ON tl.account_id = a.id
WHERE a.is_archived = false
GROUP BY a.id;
```

### Net Worth (All Accounts in Base Currency)

```sql
SELECT SUM(base_balance) as net_worth
FROM account_balances
WHERE user_id = :user_id;
```

---

## Monthly Aggregations

### Income vs. Expenses by Month

```sql
SELECT 
  DATE_TRUNC('month', t.date) as month,
  SUM(CASE WHEN t.type = 'income' THEN tl.base_amount ELSE 0 END) as total_income,
  SUM(CASE WHEN t.type = 'expense' THEN ABS(tl.base_amount) ELSE 0 END) as total_expenses,
  SUM(CASE 
    WHEN t.type = 'income' THEN tl.base_amount 
    WHEN t.type = 'expense' THEN tl.base_amount 
    ELSE 0 
  END) as net_savings
FROM transactions t
JOIN transaction_lines tl ON tl.transaction_id = t.id
WHERE t.user_id = :user_id
  AND t.type IN ('income', 'expense')
  AND t.date >= :start_date
  AND t.date <= :end_date
GROUP BY DATE_TRUNC('month', t.date)
ORDER BY month;
```

---

## Category Breakdown

### Expenses by Category (for a given month)

```sql
SELECT 
  c.name as category,
  c.icon,
  c.color,
  SUM(ABS(tl.base_amount)) as total,
  COUNT(t.id) as transaction_count,
  ROUND(
    SUM(ABS(tl.base_amount)) * 100.0 / 
    NULLIF(SUM(SUM(ABS(tl.base_amount))) OVER (), 0)
  , 1) as percentage
FROM transactions t
JOIN transaction_lines tl ON tl.transaction_id = t.id
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.user_id = :user_id
  AND t.type = 'expense'
  AND t.date >= DATE_TRUNC('month', :target_date)
  AND t.date < DATE_TRUNC('month', :target_date) + INTERVAL '1 month'
GROUP BY c.id, c.name, c.icon, c.color
ORDER BY total DESC;
```

---

## Base Currency Conversion Strategy

**For reports and aggregations**, the system uses `base_amount` from `transaction_lines`. This field is pre-computed when the transaction is created, so reports never need to look up exchange rates dynamically.

**For dashboard "current net worth"**, the system can optionally re-compute using the latest exchange rates to show the real-time value of foreign currency holdings.

**For period comparisons**, always use `base_amount` to ensure consistency — March expenses are always valued at March rates, not today's rates.

---

## Report Types

| Report | Description | Data Source |
| --- | --- | --- |
| Net Worth | Total across all accounts in base currency | `SUM(base_amount)` per account |
| Monthly Summary | Income vs. expenses per month | `base_amount` grouped by month |
| Category Breakdown | Spending by category with percentages | `base_amount` grouped by category |
| Cash Flow | Money in vs. money out over time | `base_amount` by type and date |
| Account History | Transaction list for a specific account | Filtered `transaction_lines` |
| Currency Exposure | How much is held in each currency | `SUM(amount)` grouped by currency |