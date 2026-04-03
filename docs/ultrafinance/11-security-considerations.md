# 11. Security Considerations

## Authentication via Supabase Auth

Authentication is fully delegated to Supabase's GoTrue service:

- **Email/password** registration and login
- **OAuth providers** (Google, GitHub) as optional social login
- **JWT tokens** managed automatically by the Supabase JS client
- **Session refresh** happens transparently via `@supabase/ssr` cookie-based auth
- **Password recovery** via magic link emails

### Next.js Auth Middleware

The Next.js middleware ensures protected routes require authentication:

```tsx
// src/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* get/set/remove from request/response */ } }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login
  if (!user && request.nextUrl.pathname.startsWith('/(dashboard)')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from auth pages
  if (user && request.nextUrl.pathname.startsWith('/(auth)')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### Electron-Specific Auth Considerations

In an Electron app, OAuth flows require special handling:

- Use `BrowserWindow` to open the OAuth provider URL
- Capture the redirect URL via a custom protocol handler or [localhost](http://localhost) callback
- Extract the auth tokens and pass them to the renderer process via IPC
- Never store tokens in plain text on disk; use Electron's `safeStorage` API for encryption
- The `@supabase/ssr` package uses cookies which work within the Next.js server running locally

### Flutter Auth (Future)

The Flutter app will use `supabase_flutter` which handles:

- Native deep linking for OAuth redirects
- Secure token storage via `flutter_secure_storage`
- Auto-refresh of sessions
- Same GoTrue backend — no server changes needed

---

## Row-Level Security (RLS)

Row-Level Security is the primary mechanism for data isolation. Every table with user data has RLS enabled.

### Policy Pattern

```sql
-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own accounts
CREATE POLICY "Users see own accounts" ON accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own accounts
CREATE POLICY "Users insert own accounts" ON accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own accounts
CREATE POLICY "Users update own accounts" ON accounts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own accounts
CREATE POLICY "Users delete own accounts" ON accounts
  FOR DELETE
  USING (auth.uid() = user_id);
```

This pattern is applied to: `accounts`, `transactions`, `transaction_lines` (via join), `categories` (user-specific), and `profiles`.

### Transaction Lines RLS

Transaction lines don't have a direct `user_id`. Access is controlled through the parent transaction:

```sql
CREATE POLICY "Users see own transaction lines" ON transaction_lines
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_lines.transaction_id
      AND t.user_id = auth.uid()
    )
  );
```

### Categories RLS

Categories are accessible if they belong to the user OR are system defaults:

```sql
CREATE POLICY "Users see own + system categories" ON categories
  FOR SELECT
  USING (user_id = auth.uid() OR is_system = true);
```

---

## Data Isolation Guarantees

**Every query** that touches user data passes through RLS policies. Even if the frontend has a bug and sends the wrong user ID, the database will reject the query.

**Service role key** (which bypasses RLS) is NEVER exposed to the client. It's only used in Supabase Edge Functions or server-side migrations.

**Both platforms (Next.js and Flutter)** use the anon key. `auth.uid()` in RLS policies extracts the user ID from the JWT token.

---

## Additional Security Measures

- **Input validation** — All user inputs validated with Zod schemas (Next.js) and Dart validators (Flutter) before being sent to the database
- **SQL injection prevention** — Supabase uses parameterized queries; no raw SQL from the client
- **Rate limiting** — Supabase applies rate limits at the API level
- **HTTPS only** — All Supabase communication uses TLS
- **Content Security Policy** — Electron's CSP headers restrict script execution in the renderer
- **Context isolation** — Electron's renderer is isolated from Node.js APIs; only exposed methods via preload script are accessible
- **Next.js middleware** — Route protection at the middleware level before pages render
- **Server Components** — Sensitive data fetching happens server-side, never exposed in client bundles