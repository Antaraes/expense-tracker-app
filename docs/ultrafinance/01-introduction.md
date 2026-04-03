# 1. Introduction

## Purpose

UltraFinance is a production-ready desktop application designed to bring ERP-grade financial management to personal finance. Unlike simplified expense trackers, UltraFinance uses a **double-entry accounting (ledger-based) model** — the same foundational principle used by banks, enterprises, and financial institutions worldwide.

The system provides accurate, auditable, and scalable financial tracking with full multi-account and multi-currency support.

---

## Target Users

- **Power users** who manage money across multiple bank accounts, e-wallets, and currencies
- **Freelancers and digital nomads** earning in multiple currencies (e.g., THB, MMK, USD)
- **Small business owners** who need structured financial tracking without the complexity of full ERP software
- **Finance-conscious individuals** who want more than a basic expense tracker

---

## Key Features Overview

**Core Financial Engine**

- Double-entry accounting with debit/credit transaction lines
- Multi-account management (banks, e-wallets, cash)
- Multi-currency support with historical exchange rate tracking
- Cross-currency transfers with automatic conversion

**User Experience**

- Desktop application via **Electron + Next.js** (cross-platform: Windows, macOS, Linux)
- Server-side rendering and file-based routing via Next.js App Router
- Modern UI with dark premium design (Tailwind CSS)
- Real-time data sync via Supabase Realtime
- Comprehensive dashboard with financial summaries

**Mobile (Future)**

- **Flutter** app for iOS and Android
- Shared Supabase backend — same database, auth, and RLS policies
- Native performance with platform-specific UI polish
- Offline-first with sync capability via Supabase

**Reporting & Insights**

- Balance calculations across accounts and currencies
- Monthly, weekly, and category-based aggregations
- Base currency conversion for unified reporting
- Exportable reports

**Security & Data**

- Supabase authentication (email/password, OAuth)
- Row-Level Security (RLS) for complete data isolation
- PostgreSQL-backed for reliability and performance

---

## Tech Stack Summary

| Layer | Technology |
| --- | --- |
| Desktop Shell | Electron |
| Frontend Framework | Next.js (App Router) |
| UI Styling | Tailwind CSS + shadcn/ui |
| State Management | Zustand |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| Mobile (Future) | Flutter (Dart) |
| Language | TypeScript (desktop), Dart (mobile) |

---

## Why Double-Entry Accounting?

Traditional expense trackers use a single-entry model: one row per expense. This approach fails when:

- You transfer between accounts (is it an expense or just a movement of money?)
- You need to track where money came from AND where it went
- You need auditability and correctness guarantees
- You handle multiple currencies in a single transaction

Double-entry accounting solves all of these by ensuring that **every transaction has balanced debit and credit entries**. The fundamental rule: *for every transaction, total debits must equal total credits*. This provides built-in error detection and a complete audit trail.