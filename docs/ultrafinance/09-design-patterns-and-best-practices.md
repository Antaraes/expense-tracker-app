# 9. Design Patterns & Best Practices

## Separation of Concerns

The codebase is organized into clear layers, each with a single responsibility:

```
UI Layer (Next.js Pages + Components + shadcn/ui)
    │ Renders data, captures user input
    ▼
Hook Layer (Custom React Hooks)
    │ Manages local state, calls services, handles loading/error
    ▼
Service Layer (Repository Pattern)
    │ Business logic, data transformation, Supabase calls
    ▼
Data Layer (Supabase Client)
    │ Raw API calls, real-time subscriptions
    ▼
Database (PostgreSQL + RLS)
```

**No component should ever call `supabase.from('transactions').select()` directly.** All data access goes through the service layer.

---

## Next.js App Router Patterns

### Route Groups for Layout Separation

```
app/
├── (auth)/              # No sidebar, centered layout
│   ├── layout.tsx       # Auth-specific layout
│   ├── login/page.tsx
│   └── register/page.tsx
└── (dashboard)/         # Sidebar + header layout
    ├── layout.tsx       # Dashboard layout with sidebar
    ├── dashboard/page.tsx
    └── transactions/page.tsx
```

Route groups `(auth)` and `(dashboard)` share different layouts without affecting the URL structure. `/login` and `/dashboard` are both top-level routes.

### Server vs. Client Components

- **Server Components** (default in App Router) — Used for page-level data fetching, layout rendering, and static content. Reduce client JS bundle.
- **Client Components** (`'use client'`) — Used for interactive elements: forms, charts, modals, any component using hooks or browser APIs.

```tsx
// app/(dashboard)/transactions/page.tsx — Server Component
import { TransactionList } from '@/components/data-display/transaction-list';
import { transactionService } from '@/features/transactions/services';

export default async function TransactionsPage() {
  // This runs on the server (Next.js built-in server in Electron)
  const transactions = await transactionService.getRecent();
  return <TransactionList initialData={transactions} />;
}
```

```tsx
// components/data-display/transaction-list.tsx — Client Component
'use client';
import { useTransactions } from '@/features/transactions/hooks';

export function TransactionList({ initialData }) {
  const { transactions, isLoading } = useTransactions({ initialData });
  // Interactive list with filters, sorting, real-time updates
}
```

### Loading and Error States

Next.js App Router provides built-in loading and error UI:

```
transactions/
├── page.tsx          # Main page
├── loading.tsx       # Skeleton UI shown while page loads
└── error.tsx         # Error boundary with retry button
```

---

## Repository Pattern

Each domain has a service file that acts as a repository:

```tsx
// features/transactions/services/transactions.service.ts
import { createClient } from '@/lib/supabase/client';

export const transactionService = {
  async getAll(filters: TransactionFilters) {
    const supabase = createClient();
    const query = supabase
      .from('transactions')
      .select(`*, transaction_lines(*), categories(*)`)
      .order('date', { ascending: false });

    if (filters.startDate) query.gte('date', filters.startDate);
    if (filters.endDate) query.lte('date', filters.endDate);
    if (filters.type) query.eq('type', filters.type);

    return query;
  },

  async create(params: CreateTransactionParams) {
    const supabase = createClient();
    return supabase.rpc('create_transaction', {
      p_user_id: params.userId,
      p_type: params.type,
      p_category_id: params.categoryId,
      p_description: params.description,
      p_date: params.date,
      p_lines: params.lines,
    });
  },

  async delete(transactionId: string) {
    const supabase = createClient();
    return supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId);
  }
};
```

Benefits: testable in isolation, swappable backend, consistent error handling.

---

## Supabase Client Management (Next.js)

Next.js requires different Supabase client instances for server and client contexts:

```tsx
// lib/supabase/client.ts — Browser client (used in 'use client' components)
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// lib/supabase/server.ts — Server client (used in Server Components, API routes)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* cookie handlers */ } }
  );
}
```

---

## State Management (Zustand)

Zustand is chosen over Redux for its simplicity and minimal boilerplate:

```tsx
// store/accounts.store.ts
import { create } from 'zustand';

interface AccountsState {
  accounts: Account[];
  isLoading: boolean;
  fetchAccounts: () => Promise<void>;
}

export const useAccountsStore = create<AccountsState>((set) => ({
  accounts: [],
  isLoading: false,
  fetchAccounts: async () => {
    set({ isLoading: true });
    const { data } = await accountService.getAll();
    set({ accounts: data ?? [], isLoading: false });
  },
}));
```

**What goes in Zustand (global state):** Auth user, account list, user preferences, cached exchange rates.

**What stays local:** Form state, UI toggles, transient loading states.

**What uses Server Components:** Initial page data, static content.

---

## Type Safety

The system leverages TypeScript end-to-end:

- **Supabase CLI** generates database types from the schema (`database.types.ts`)
- **Zod schemas** validate user input at the form level
- **Service return types** are inferred from Supabase queries
- **Strict mode** enabled in `tsconfig.json`

For the future Flutter app, the same type safety is achieved with:

- **Freezed** for immutable data classes with `copyWith`, `toJson`, `fromJson`
- **Riverpod** for type-safe state management
- **Supabase Dart client** with generated types

---

## Error Handling Strategy

Errors are handled at two levels:

**Service level** — Supabase errors are caught and transformed into domain-specific error types. Network errors trigger retry logic.

**UI level** — Next.js `error.tsx` boundaries catch rendering failures. Toast notifications (via sonner) surface transient errors. Form validation errors display inline via Zod + React Hook Form.

```tsx
// Consistent error handling wrapper
async function safeCall<T>(fn: () => Promise<{ data: T; error: any }>) {
  try {
    const { data, error } = await fn();
    if (error) throw new AppError(error.message, error.code);
    return data;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Unexpected error', 'UNKNOWN');
  }
}
```

---

## Domain-Driven Design Influence

While not a full DDD implementation, the system borrows key concepts:

- **Bounded contexts** — Each module (transactions, accounts, currencies) has clear boundaries
- **Value objects** — `Money` (amount + currency), `ExchangeRate` (from, to, rate, date)
- **Aggregates** — A `Transaction` is the aggregate root; `TransactionLines` are owned by it
- **Domain events** — Supabase Realtime can act as a lightweight event bus for cross-module updates