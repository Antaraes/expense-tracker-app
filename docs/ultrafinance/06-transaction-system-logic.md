# 6. Transaction System Logic

Every financial operation in UltraFinance is modeled as a transaction with balanced ledger lines. This section walks through each flow with concrete examples.

---

## Expense Flow: Buying Coffee (฿65)

**Scenario:** User buys coffee for 65 THB using their KBank account. Base currency is THB.

**Transaction Header:**

| Field | Value |
| --- | --- |
| type | expense |
| category | Food & Drink |
| description | Morning coffee |
| date | 2026-04-03 |

**Transaction Lines:**

| Account | Amount | Currency | Exchange Rate | Base Amount |
| --- | --- | --- | --- | --- |
| Expense:Food | +65.0000 | THB | 1.000000 | +65.0000 |
| KBank | -65.0000 | THB | 1.000000 | -65.0000 |

**What happens:** 65 THB flows OUT of KBank (credit, negative) and INTO the expense category tracking (debit, positive). The sum of base_amount = 0. KBank's balance decreases by 65.

**Note:** In a simplified personal finance context, the "expense" line's account can either be a dedicated expense tracking account or the debit side can be implicit. For this system, we use the user's actual payment account as the credit side and track the category on the transaction header.

### Simplified Two-Line Model

For personal finance, we can simplify: expenses and income only need **one transaction line** per real account, since we're not tracking a full chart of accounts. The line represents the actual money movement:

| Account | Amount | Currency | Exchange Rate | Base Amount |
| --- | --- | --- | --- | --- |
| KBank | -65.0000 | THB | 1.000000 | -65.0000 |

The category is tracked on the transaction header. This keeps the system simple for personal use while preserving the ledger structure for transfers.

---

## Income Flow: Receiving Salary (30,000 THB)

**Scenario:** User receives monthly salary of 30,000 THB into their KBank account.

**Transaction Header:**

| Field | Value |
| --- | --- |
| type | income |
| category | Salary |
| description | April salary |
| date | 2026-04-01 |

**Transaction Line:**

| Account | Amount | Currency | Exchange Rate | Base Amount |
| --- | --- | --- | --- | --- |
| KBank | +30,000.0000 | THB | 1.000000 | +30,000.0000 |

**What happens:** 30,000 THB flows INTO KBank. The positive amount increases the account balance.

---

## Transfer Flow: Same Currency (THB → THB)

**Scenario:** User transfers 5,000 THB from KBank to TrueMoney wallet.

**Transaction Header:**

| Field | Value |
| --- | --- |
| type | transfer |
| description | Move to TrueMoney |
| date | 2026-04-03 |

**Transaction Lines:**

| Account | Amount | Currency | Exchange Rate | Base Amount |
| --- | --- | --- | --- | --- |
| KBank | -5,000.0000 | THB | 1.000000 | -5,000.0000 |
| TrueMoney | +5,000.0000 | THB | 1.000000 | +5,000.0000 |

**What happens:** Money moves from one account to another. Sum of base_amount = 0. Total net worth is unchanged — it's just a redistribution.

---

## Transfer Flow: Multi-Currency (THB → MMK)

**Scenario:** User converts 10,000 THB to MMK at rate 1 THB = 95 MMK. Base currency is THB.

**Transaction Header:**

| Field | Value |
| --- | --- |
| type | transfer |
| description | THB to MMK conversion |
| date | 2026-04-03 |

**Transaction Lines:**

| Account | Amount | Currency | Exchange Rate | Base Amount |
| --- | --- | --- | --- | --- |
| KBank (THB) | -10,000.0000 | THB | 1.000000 | -10,000.0000 |
| KBZ Bank (MMK) | +950,000.0000 | MMK | 0.010526 | +10,000.0000 |

**Exchange rate explanation:**

- User sends 10,000 THB and receives 950,000 MMK
- The `exchange_rate` on each line converts to base currency (THB)
- For the THB line: rate is 1.0 (it IS the base currency)
- For the MMK line: 950,000 × 0.010526 = ~10,000 THB
- The `exchange_rate` here is MMK-to-THB = 1/95 = 0.010526
- Sum of base_amount = -10,000 + 10,000 = 0 ✓

**This is the power of the ledger model.** The multi-currency transfer is handled naturally without special logic.

---

## Transaction Validation Rules

1. Every transaction MUST have at least one transaction line
2. For transfers, there MUST be exactly two lines (source and destination)
3. For transfers, `SUM(base_amount)` must equal 0 (within rounding tolerance of 0.01)
4. The `exchange_rate` must be greater than 0
5. `base_amount` must equal `amount * exchange_rate`
6. Account's `default_currency` must match the line's `currency_code`
7. Transaction date cannot be in the future (optional business rule)

---

## PostgreSQL Function: Create Transaction

```sql
CREATE OR REPLACE FUNCTION create_transaction(
  p_user_id UUID,
  p_type TEXT,
  p_category_id UUID,
  p_description TEXT,
  p_date DATE,
  p_lines JSONB  -- array of {account_id, amount, currency_code, exchange_rate}
) RETURNS UUID AS $$
DECLARE
  v_txn_id UUID;
  v_line JSONB;
  v_sum NUMERIC := 0;
BEGIN
  -- Create transaction header
  INSERT INTO transactions (user_id, type, category_id, description, date)
  VALUES (p_user_id, p_type, p_category_id, p_description, p_date)
  RETURNING id INTO v_txn_id;

  -- Insert lines and validate
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO transaction_lines (
      transaction_id, account_id, amount, currency_code,
      exchange_rate, base_amount
    ) VALUES (
      v_txn_id,
      (v_line->>'account_id')::UUID,
      (v_line->>'amount')::NUMERIC,
      v_line->>'currency_code',
      (v_line->>'exchange_rate')::NUMERIC,
      (v_line->>'amount')::NUMERIC * (v_line->>'exchange_rate')::NUMERIC
    );
    v_sum := v_sum + (v_line->>'amount')::NUMERIC * (v_line->>'exchange_rate')::NUMERIC;
  END LOOP;

  -- Validate balance for transfers
  IF p_type = 'transfer' AND ABS(v_sum) > 0.01 THEN
    RAISE EXCEPTION 'Transfer transaction lines do not balance: %', v_sum;
  END IF;

  RETURN v_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```