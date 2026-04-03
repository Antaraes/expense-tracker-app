# 12. Scalability & Future Enhancements

## Flutter Mobile Application (Phase 2)

The mobile app will be built with **Flutter** (Dart), providing native iOS and Android apps from a single codebase.

### Why Flutter?

- **Single codebase** for iOS and Android with near-native performance
- **Rich UI toolkit** — Material 3 + Cupertino adaptive widgets for platform-appropriate design
- **Supabase Dart SDK** (`supabase_flutter`) — full feature parity with the JS client
- **Offline-first capable** — Drift (SQLite for Dart) for local persistence
- **Strong typing** — Dart's type system + Freezed for immutable data models

### Architecture

```
Flutter App
├── State Management: Riverpod
├── Routing: GoRouter
├── Data Models: Freezed (immutable, with JSON serialization)
├── Local DB: Drift (SQLite)
├── Backend: supabase_flutter (same Supabase project as desktop)
├── Theme: Same color tokens, adapted for Material 3 / Cupertino
└── Key Packages: fl_chart, intl, flutter_secure_storage
```

### Shared with Desktop

| What | Desktop (Next.js) | Mobile (Flutter) |
| --- | --- | --- |
| Backend | Supabase | Supabase (same project) |
| Auth | @supabase/ssr | supabase_flutter |
| State | Zustand | Riverpod |
| Validation | Zod | Dart validators |
| Types | TypeScript interfaces | Freezed data classes |
| Local DB | better-sqlite3 (future) | Drift |
| Charts | Recharts | fl_chart |

The database schema, RLS policies, and PostgreSQL functions are shared. No backend changes needed for mobile.

### Mobile-Specific Features

- Biometric authentication (fingerprint/face) for app lock
- Camera-based receipt scanning (OCR)
- Push notifications for budget alerts and bill reminders
- Widget support (iOS/Android) for quick balance check
- Quick-add transaction from notification shade

---

## AI-Powered Insights

Leverage the structured transaction data for intelligent analysis:

- **Spending anomaly detection** — Flag unusual transactions that deviate from spending patterns
- **Budget recommendations** — Suggest budgets based on historical spending by category
- **Cash flow forecasting** — Predict future balances based on recurring income/expense patterns
- **Natural language queries** — "How much did I spend on food in March?" powered by LLM + SQL generation via Supabase Edge Functions
- **Smart categorization** — Auto-categorize transactions based on description using ML classification

---

## OCR Receipt Scanning

Automate transaction entry from paper receipts and digital invoices:

- Camera capture in Flutter app or file upload in desktop (via Electron native dialog)
- OCR processing via Google Vision API, Tesseract, or a dedicated receipt parsing service (Veryfi, Mindee)
- Auto-extract: merchant name, total amount, date, currency, line items
- Pre-fill the transaction form; user confirms and submits
- Store receipt image linked to the transaction in Supabase Storage

---

## Bank API Integration (Open Banking)

Automatically import transactions from connected bank accounts:

- Integrate with aggregation providers (Plaid for US/EU, or regional APIs for SEA)
- Auto-import transactions daily with matching and deduplication logic
- Map bank transaction descriptions to categories using rules or AI
- Reconcile imported transactions with manually entered ones
- Support for Thai banks via PromptPay/SCB Open API where available

---

## Multi-User & Shared Finances

Expand from personal to household or small team finance:

- **Shared accounts** — Multiple users can view/edit the same account
- **Permission roles** — Owner, Editor, Viewer per account
- **Split transactions** — Track shared expenses and who owes whom
- **Family dashboard** — Aggregate view across all members' accounts
- **Invitation system** — Invite via email with role assignment

---

## Additional Future Features

- **Recurring transactions** — Auto-create transactions on a schedule (monthly rent, subscriptions)
- **Budget tracking** — Set monthly budgets per category with progress bars and alerts
- **Bill reminders** — Notification system for upcoming bills
- **Investment tracking** — Track stock/crypto portfolios with market price integration
- **Tax reporting** — Tag transactions as tax-deductible and generate annual summaries
- **Data export** — Export to CSV, PDF reports, or accounting software formats (QIF, OFX)
- **Plugins / Extensions** — Allow community-built plugins for custom integrations
- **Web version** — Deploy the Next.js app as a standalone web app (remove Electron shell) for browser access
- **Desktop ↔ Mobile sync** — Real-time sync via Supabase Realtime so changes appear instantly on both platforms