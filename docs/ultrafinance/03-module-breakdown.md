# 3. Module Breakdown

The application is divided into clearly separated modules, each with a single responsibility.

---

## Authentication Module

**Responsibility:** User registration, login, logout, session management, and password recovery.

- Delegates to Supabase Auth (GoTrue)
- Manages JWT tokens and refresh flow
- Provides `useAuth()` hook for components
- Handles OAuth providers (Google, GitHub) if configured
- Triggers user profile creation on first sign-up via database trigger

---

## Accounts Module

**Responsibility:** Managing financial accounts (bank accounts, e-wallets, cash).

- CRUD operations for accounts
- Each account has a name, type (bank, e-wallet, cash, credit_card), default currency, and icon
- Account balance is **always computed** from transaction lines, never stored directly
- Supports account archiving (soft delete) to preserve historical data
- Account types determine available operations (e.g., credit cards allow negative balances)

---

## Transactions Module

**Responsibility:** Core financial operations — creating, viewing, editing, and deleting transactions.

- Implements the double-entry ledger model
- Each transaction has a header (date, description, type, category) and one or more transaction lines
- Transaction types: `expense`, `income`, `transfer`
- Transfer transactions create paired debit/credit lines across accounts
- All mutations run inside PostgreSQL transactions for atomicity
- Supports recurring transactions (future feature)

---

## Categories Module

**Responsibility:** Organizing transactions by category and subcategory.

- Hierarchical categories with parent/child relationships
- System-defined defaults (Food, Transport, Salary, etc.) plus user-defined custom categories
- Each category has a name, icon, color, and type (expense, income, or both)
- Categories are used for filtering, grouping, and report aggregation

---

## Currency & Exchange Module

**Responsibility:** Managing currencies and exchange rates.

- Stores supported currencies with symbols and decimal precision
- Maintains a historical exchange rates table (rate per date pair)
- Fetches rates from external APIs (e.g., Open Exchange Rates, ExchangeRate-API)
- Provides conversion utilities used by the transaction and reporting systems
- User sets a **base currency** for unified reporting

---

## Reports Module

**Responsibility:** Financial summaries, analytics, and data visualization.

- Balance per account (computed from ledger lines)
- Net worth calculation (all accounts converted to base currency)
- Monthly/weekly income vs. expense summaries
- Category breakdown with percentages
- Cash flow charts and trend analysis
- Export to CSV / PDF (future)

---

## Settings Module

**Responsibility:** User preferences and application configuration.

- Base currency selection
- Default account preferences
- Theme preferences (dark/light)
- Notification preferences
- Data export and backup
- Account deletion / data wipe