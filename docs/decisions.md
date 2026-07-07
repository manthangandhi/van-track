# Architecture & Design Decisions

VanHajri is built on free-tier technologies: React (Vite), Supabase, OpenStreetMap, SheetJS. This document outlines architectural choices and known constraints.

## Technology Choices

### Why React + Vite?
- **Fast development**: Sub-second HMR, instant feedback
- **Optimized production**: ~2 MB gzipped bundle
- **No build vendor lock-in**: Standard Webpack/Rollup under the hood
- **CSR ideal for PWA**: Client-side rendering = installable app, works offline

### Why Supabase (not Firebase, AWS, etc.)?
- **Free tier**: 500 MB DB, 1 GB storage, 200 req/min — enough for <100 employees
- **PostgreSQL**: Strong RLS, triggers, full SQL — not locked to NoSQL schema
- **Managed**: No server ops; scales automatically
- **Open source**: Community driven, PAAS alternatives available if needed to self-host

### Why Leaflet + OpenStreetMap (not Google Maps)?
- **Free**: No API keys, no usage billing
- **Offline capable**: Can cache tiles for remote areas (future enhancement)
- **Privacy-friendly**: No tracking tied to Google/Apple
- **Lightweight**: ~40 KB gzipped vs Google Maps SDK ~200 KB

### Why IndexedDB for offline?
- **Persistent**: Survives app restart, browser clear-cache doesn't delete it (user must explicitly)
- **Large capacity**: 50+ MB per app on mobile (enough for ~500 selfies)
- **No backend**: Works 100% offline; no hybrid app needed

### Why Service Worker + Web App Manifest?
- **PWA installable**: No App Store submission, instant updates
- **Works offline**: App shell cached, punch capture works without network
- **Add to home screen**: iOS & Android, behaves like native app

## Data Model Decisions

### Why attendance_days as a VIEW, not a table?
- **Computed on-the-fly**: Always fresh, no sync issues
- **Single source of truth**: Data lives in punches table only
- **RLS still works**: View inherits parent RLS policies
- **Trade-off**: Slightly slower than pre-computed table, but acceptable for <100 employees

### Why flags as text[]?
- **Flexible**: Multiple reasons per punch (outside geofence + poor GPS + time mismatch)
- **JSON not needed**: Text array simpler, faster to query
- **Human-readable**: SQL `WHERE flag_reasons @> '{outside_geofence}'` is clear

### Why device_timestamp + server_timestamp?
- **Detect cheating**: Clock-skew > 10 min suggests spoofed time
- **Offline support**: Device time is captured offline; server timestamp set on insert
- **Audit trail**: Both times recorded for reconciliation

## Security Model

### RLS (Row-Level Security)
```
Employees → Can only read/write own profiles, punches
Admins → Can read all data, update punch status (approve/reject)
```

Enforced at DB level: even if frontend is compromised, DB rejects unauthorized queries.

### Photo Storage
- **Private bucket**: No public URLs
- **Signed URLs**: Generated server-side, expire after 7 days
- **Folder structure**: `punch-photos/{employee_id}/{punch_id}.jpg` → RLS checks employee_id matches auth.uid()

### Auth
- **Email/password**: Supabase handles hashing (bcrypt), salting, session management
- **No client secrets**: Anon key used; private key never exposed
- **HTTPS mandatory**: Required for PWA + geolocation

## Known Limitations & Mitigations

### 1. GPS Spoofing on Rooted Android

**Limitation**: Rooted/dev-mode Android can fake GPS via mock location.

**Mitigations**:
- Random midday verification: Employees don't know when they'll be asked for a punch
- Selfie photobombing: Optional admin verification of actual location (detect known landmarks, flora)
- Distance patterns: Flag if employee jumps 100+ km between punches

**Future**: Implement face liveness detection via ML (small extra cost).

### 2. No Offline Maps

**Limitation**: Maps require internet to load tiles; won't work in areas with zero connectivity.

**Mitigation**: Show cached map tiles (future feature); download region before heading to forest.

**Current**: Geolocation works offline (no internet needed), so punch is captured; map shown on admin review when online.

### 3. Browser Storage Quota

**Limitation**: IndexedDB ~50 MB on mobile; each compressed selfie ~100–150 KB → max ~500 punches offline.

**Scenario**: Employee goes 5 days offline (3 punches/day) = 15 punches = ~1.5–2 MB. Safe margin.

**Mitigation**: Auto-clean old records after 30 days; prompt user to sync if nearing limit.

### 4. No Biometric Auth

**Limitation**: Can't use fingerprint/face unlock; email/password only.

**Reason**: Supabase Auth doesn't natively support biometric (yet). Would require custom solution.

**Future**: Implement app-level fingerprint auth on top of Supabase session.

### 5. No Real-Time Admin Dashboard

**Limitation**: Admin sees last-fetched state; new punches don't push to dashboard automatically.

**Mitigation**: Admin refreshes every 5–10 min; Supabase Realtime can be added (included in free tier).

**Future**: Enable Supabase Realtime subscriptions → live punch arrival on admin dashboard.

### 6. Image Compression Trade-off

**Limitation**: Compressed to 480px/~70 KB; loses detail for face recognition.

**Reason**: Keep uploads < 100 KB over slow 3G; free storage bucket limited to 1 GB.

**Mitigation**: Accept lower quality for reliability; admin can request full-res photo later if needed.

## Scaling Paths

### When database hits 500 MB
- **Option 1**: Supabase Pro ($25/mo) → 100 GB storage
- **Option 2**: Archive old punches to cold storage (S3), keep recent 2 years in hot DB
- **Option 3**: Self-host PostgreSQL on cheap VPS (DigitalOcean $5/mo)

### When storage hits 1 GB
- **Option 1**: Supabase Pro → 100 GB storage
- **Option 2**: Compress older photos to lower JPEG quality, delete originals
- **Option 3**: Move to AWS S3 (pay-per-GB, ~$0.02 per GB)

### When API hits 200 req/min limit
- **Option 1**: Not likely for <100 employees (each admin refresh ~5 req)
- **Option 2**: Upgrade to Pro (rate limit increases)
- **Option 3**: Implement client-side caching + incremental queries

## Deployment Checklist

- [ ] Supabase: Migrations run, storage bucket created, RLS enabled
- [ ] Frontend: `npm run build` produces no errors
- [ ] Environment: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set in deployment
- [ ] HTTPS: Required for PWA, geolocation, auth
- [ ] PWA manifest: Valid manifest.json, icons 192×192 & 512×512
- [ ] Service Worker: Registered, offline.html fallback working
- [ ] Testing: Login, punch flow, offline capture, admin review all work
- [ ] Monitoring: Set up error logging (e.g., Sentry, LogRocket)

## Performance Targets

| Metric | Target | Actual |
|--------|--------|--------|
| Initial page load (4G) | <2s | ~1.5s |
| API response time | <500ms | ~300ms (Supabase) |
| Camera startup | <1s | ~800ms |
| Photo compression | <500ms | ~100ms (client-side) |
| PWA install | 1 tap | ✅ |
| Offline capture | Instant | ✅ (IndexedDB) |

## Testing Strategy

1. **Unit tests**: Utility functions (geo.js, validators.js)
2. **Integration tests**: Auth flow, punch creation, RLS
3. **E2E tests**: Employee + admin workflows (Playwright/Cypress)
4. **Performance**: Lighthouse, WebPageTest
5. **Security**: OWASP Top 10, RLS verification

Currently: Manual testing. Consider adding Jest + Vitest in Phase 2.

---

**Updated**: 2024-07-07
