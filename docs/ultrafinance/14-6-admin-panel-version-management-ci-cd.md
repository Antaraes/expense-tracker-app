# 14.6 Admin Panel — Version Management & CI/CD

## Admin Version Management Page

The admin panel provides a dedicated page for managing app versions and controlling the update lifecycle.

---

## Version List View

The version management page shows all versions in a table:

| Version | Platform | Status | Rollout | Critical | Published | Users |
| --- | --- | --- | --- | --- | --- | --- |
| v0.1.0 | Desktop | 🟢 Published | 100% | No | 2026-04-04 | 234 |
| v0.0.2 | Desktop | 🟢 Published | 100% | No | 2026-03-20 | 89 |
| v0.0.1 | Desktop | ⚪ Superseded | 100% | No | 2026-03-01 | 12 |

**Actions per version:** Edit, Unpublish, Set Critical, Adjust Rollout %, View Analytics

---

## Publish New Version Form

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| Version | Semver input | Yes | e.g., `0.1.0` — validated against existing versions |
| Platform | Select | Yes | `desktop`, `android`, `ios` |
| Release Notes | Markdown editor | Yes | Changelog shown to users |
| Windows Asset URL | URL | Conditional | `.exe` / `.msi` download link |
| macOS Asset URL | URL | Conditional | `.dmg` download link |
| Linux Asset URL | URL | Conditional | `.AppImage` / `.deb` download link |
| Is Critical | Checkbox | No | Force update — users cannot skip |
| Rollout % | Slider (0-100) | Yes | Gradual rollout control (default: 100%) |
| Min OS Version | Text | No | Minimum OS requirement |

### Version Validation Rules

- Version must follow semver format (`MAJOR.MINOR.PATCH`)
- Version must be greater than any existing published version
- At least one platform asset URL must be provided
- Critical updates automatically set rollout to 100%

---

## Gradual Rollout Workflow

Best practice for safe production releases:

```
Day 1:  Publish v0.1.0 with rollout_percentage = 10%
        → ~10% of users get the update
        → Monitor error rates and feedback

Day 2:  If stable, increase rollout to 25%
        → Admin updates rollout_percentage in admin panel

Day 3:  Increase to 50%

Day 5:  Increase to 100%
        → All users now get the update

(If issues found at any stage, set rollout to 0% or unpublish)
```

### How Rollout Bucketing Works

Each Electron client has a deterministic client ID (machine ID or stored UUID). The Edge Function hashes this ID to a number 0-99. If the hash is less than `rollout_percentage`, the user receives the update.

This ensures:

- The same user always gets the same bucket (no flip-flopping)
- Increasing the percentage adds new users without removing existing ones
- The distribution is approximately uniform

---

## Version Analytics

The admin panel tracks version distribution across the user base:

```
Version Distribution (Desktop)
────────────────────────────
 v0.1.0  ████████████████  70%  (234 users)
 v0.0.2  ██████            22%  (89 users)
 v0.0.1  ██                   8%  (12 users)
```

This data comes from the `push_tokens` table which stores `app_version` per device. Every time the app starts, it reports its version:

```tsx
// Called on app startup in renderer
async function reportAppVersion() {
  const supabase = createClient();
  const version = window.electronAPI?.getAppVersion();
  
  await supabase.from('push_tokens').upsert({
    user_id: currentUserId,
    platform: 'desktop',
    app_version: version,
    token: getDesktopToken(), // Unique per installation
    last_used_at: new Date().toISOString(),
  }, { onConflict: 'user_id,token' });
}
```

---

## CI/CD Build Pipeline (electron-builder)

### Build Configuration

```json
// electron-builder.json
{
  "appId": "com.ultrafinance.app",
  "productName": "UltraFinance",
  "directories": {
    "output": "dist"
  },
  "files": [
    "electron/**/*",
    ".next/**/*",
    "node_modules/**/*"
  ],
  "win": {
    "target": ["nsis"],
    "icon": "assets/icon.ico"
  },
  "mac": {
    "target": ["dmg"],
    "icon": "assets/icon.icns",
    "category": "public.app-category.finance"
  },
  "linux": {
    "target": ["AppImage", "deb"],
    "icon": "assets/icon.png",
    "category": "Office"
  },
  "publish": {
    "provider": "github",
    "owner": "your-org",
    "repo": "ultrafinance"
  }
}
```

### GitHub Actions Workflow

```yaml
# .github/workflows/release.yml
name: Build & Release

on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      
      - run: npm ci
      - run: npm run build          # Build Next.js
      - run: npx electron-builder    # Build Electron + package
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      # Upload assets to S3/R2 and update Supabase app_versions table
      - name: Register version in Supabase
        run: |
          curl -X POST "$SUPABASE_URL/functions/v1/register-version" \
            -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
            -H "Content-Type: application/json" \
            -d '{
              "version": "${{ github.ref_name }}",
              "platform": "desktop",
              "asset_url_${{ matrix.os == 'windows-latest' && 'win' || matrix.os == 'macos-latest' && 'mac' || 'linux' }}": "https://assets.ultrafinance.app/..."
            }'
```

---

## Semver Strategy

| Version Part | When to Bump | Example |
| --- | --- | --- |
| PATCH (0.0.X) | Bug fixes, minor tweaks | 0.0.1 → 0.0.2 |
| MINOR (0.X.0) | New features, non-breaking changes | 0.0.2 → 0.1.0 |
| MAJOR (X.0.0) | Breaking changes, major redesigns | 0.1.0 → 1.0.0 |

**Current version:** `0.0.1` (initial release, pre-stable)

**Target for stable release:** `1.0.0` (all core features complete and tested)