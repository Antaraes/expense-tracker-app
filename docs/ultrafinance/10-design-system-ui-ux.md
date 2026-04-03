# 10. Design System (UI/UX)

## Color System

The UI follows a dark, premium aesthetic inspired by fintech applications like Wise, Revolut, and Mercury. Colors are managed via **Tailwind CSS custom properties** and **shadcn/ui theming**.

### Tailwind CSS Variables (globals.css)

```css
@layer base {
  :root {
    --background: 240 10% 3.9%;      /* #0A0A0F */
    --foreground: 240 5% 96%;        /* #F0F0F5 */
    --card: 240 10% 7%;              /* #12121A */
    --card-foreground: 240 5% 96%;
    --primary: 253 60% 63%;          /* #6C5CE7 */
    --primary-foreground: 0 0% 100%;
    --secondary: 240 10% 12%;        /* #1A1A25 */
    --muted: 240 10% 15%;
    --muted-foreground: 240 10% 55%; /* #8888A0 */
    --border: 240 10% 20%;           /* #2A2A3A */
    --destructive: 0 72% 71%;        /* #FF6B6B */
    --success: 156 100% 42%;         /* #00D68F */
    --warning: 45 97% 71%;           /* #FDCB6E */
    --info: 212 100% 73%;            /* #74B9FF */
  }
}
```

### Semantic Color Usage

| Color | Token | Usage |
| --- | --- | --- |
| Green (#00D68F) | `text-success` | Income, positive balance change, confirmed states |
| Red (#FF6B6B) | `text-destructive` | Expenses, negative balance change, errors, delete |
| Blue (#74B9FF) | `text-info` | Transfers (neutral money movement), links |
| Purple (#6C5CE7) | `text-primary` | Brand color, primary CTAs, active navigation |
| Yellow (#FDCB6E) | `text-warning` | Warnings, pending states, budget alerts |

### Flutter Theme Mapping

The same color tokens will be used in the Flutter app via `ThemeData`:

```dart
// core/theme/app_colors.dart
class AppColors {
  static const background = Color(0xFF0A0A0F);
  static const card = Color(0xFF12121A);
  static const primary = Color(0xFF6C5CE7);
  static const success = Color(0xFF00D68F);
  static const destructive = Color(0xFFFF6B6B);
  static const info = Color(0xFF74B9FF);
}
```

---

## Typography

| Level | Font | Weight | Size | Tailwind Class | Usage |
| --- | --- | --- | --- | --- | --- |
| Display | Inter | 700 | 32px | `text-3xl font-bold` | Dashboard net worth |
| H1 | Inter | 600 | 24px | `text-2xl font-semibold` | Page titles |
| H2 | Inter | 600 | 20px | `text-xl font-semibold` | Section headers |
| H3 | Inter | 500 | 16px | `text-base font-medium` | Card titles |
| Body | Inter | 400 | 14px | `text-sm` | General text |
| Caption | Inter | 400 | 12px | `text-xs` | Timestamps, hints |
| Mono | JetBrains Mono | 500 | 14px | `font-mono text-sm font-medium` | Amounts, numbers |

**Key rule:** All monetary amounts use the monospace font for alignment and readability. In Tailwind: `<span className="font-mono tabular-nums">฿1,234.56</span>`.

---

## Layout Structure

```
┌───────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌───────────────────────────────────┐  │
│  │Sidebar   │  │           Main Content Area       │  │
│  │          │  │                                   │  │
│  │ Logo     │  │  ┌─────────────────────────────┐  │  │
│  │          │  │  │   Page Header + Actions      │  │  │
│  │ Nav      │  │  └─────────────────────────────┘  │  │
│  │ Items    │  │                                   │  │
│  │          │  │  ┌─────────┐ ┌─────────┐ ┌─────┐ │  │
│  │ 📊 Dash  │  │  │ Card 1  │ │ Card 2  │ │Card3│ │  │
│  │ 💸 Txns  │  │  └─────────┘ └─────────┘ └─────┘ │  │
│  │ 🏦 Accts │  │                                   │  │
│  │ 📈 Rpts  │  │  ┌─────────────────────────────┐  │  │
│  │ ⚙️ Sett  │  │  │   Content (table/chart/etc) │  │  │
│  │          │  │  └─────────────────────────────┘  │  │
│  └──────────┘  └───────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

- **Sidebar** — 240px width, collapsible to 64px (icon-only mode). Built with shadcn/ui `Sheet` for mobile overlay.
- **Main Content** — Fluid width with `max-w-6xl mx-auto px-6`
- **Cards** — shadcn/ui `Card` with `rounded-lg border bg-card`
- **Tables** — shadcn/ui `DataTable` with TanStack Table for sorting, filtering, pagination

---

## Component Library (shadcn/ui)

The design system is built on **shadcn/ui**, which provides copy-paste React components styled with Tailwind:

**Core components used:**

Button, Input, Select, Dialog, Sheet, Dropdown Menu, Command (search palette), Data Table, Tabs, Toast (sonner), Card, Badge, Calendar, Popover, Form (React Hook Form integration)

**Custom domain components:**

- `<CurrencyAmount>` — Displays formatted amount with currency symbol and color coding
- `<AccountBadge>` — Account name with icon and type indicator
- `<TransactionRow>` — Compact transaction display with category, amount, account
- `<ExchangeRateInput>` — Paired currency inputs with live conversion preview

---

## Dashboard Design

The dashboard is the first screen users see. It provides an immediate financial snapshot:

**Top Row: Key Metrics** (4 cards in a grid)

- Net Worth (all accounts, base currency)
- Monthly Income total (green)
- Monthly Expenses total (red)
- Monthly Savings (income - expenses)

**Middle: Visualizations** (2-column grid)

- Income vs. Expenses bar chart (last 6 months) — Recharts `BarChart`
- Expense category donut chart (current month) — Recharts `PieChart`

**Bottom: Activity**

- Recent transactions list (last 10) — compact `DataTable`
- Account balances summary cards — horizontal scroll on mobile

---

## UX Principles for Finance Apps

**Clarity over cleverness** — Financial data must be unambiguous. Use explicit +/- signs, color coding, and currency symbols. Never make the user guess if a number is positive or negative.

**Progressive disclosure** — Show summary first, details on demand. Dashboard shows totals; clicking reveals breakdowns.

**Instant feedback** — When adding a transaction, show the updated balance immediately (optimistic UI via Zustand).

**Confirmation for destructive actions** — Deleting transactions or accounts uses shadcn/ui `AlertDialog` with impact summary.

**Keyboard-first design** — Power users can add transactions entirely via keyboard. Command palette (⌘K) for quick navigation. Tab navigation, Enter to submit, Escape to cancel.

**Consistent number formatting** — Always show 2 decimal places for THB/USD, 0 for MMK. Right-align all monetary columns. Use `tabular-nums` for aligned digits.