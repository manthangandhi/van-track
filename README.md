# VanTrack — Forest Field Attendance

A Progressive Web App (PWA) for GPS + selfie-based employee attendance at remote forest sites. Built with **React + Vite**, **Supabase**, and **Leaflet** — deployable to **Vercel** or **Netlify** on a free-tier stack.

VanTrack is designed for conservation field teams who need reliable check-ins without enterprise hardware: live camera capture, geofence verification, face matching, offline sync, and a full admin console.

## Features

### Employee
- **Live camera capture** — front-facing selfie only (no gallery uploads)
- **GPS verification** — accuracy shown before each punch
- **Three daily punches** — check-in, midday verification, check-out
- **Site assignments** — punch only at admin-assigned sites for the active date range
- **Reference selfie** — one-time setup on first login; used for face match on every punch
- **Offline support** — punches saved locally (IndexedDB), auto-sync when online
- **History** — calendar of past attendance with day detail and flags
- **Leave requests** — request time off from My Timesheet → Leave tab
- **First-login app tour** — step-by-step guide on the dashboard (replay anytime)
- **PWA installable** — add to home screen on Android, iPhone, and desktop

### Admin
- **Today's snapshot** — KPIs for active staff, attendance rate, sites, flagged punches
- **Today's attendance** — live view of who has checked in, midday, and out
- **Review queue** — approve/reject flagged punches with comments
- **Staff & site mapping** — time-bounded assignments (who can punch where, and when)
- **Employees** — create accounts, reference selfies, mandatory hours, active/inactive
- **Sites** — geofences on a map, active/inactive status
- **Timesheets** — filter and export CSV/XLSX
- **Insights** — trends, hours by site, employee leaderboard
- **Leave & holidays** — employee leave requests, admin approval, org/site holidays
- **Audit log** — full app activity (employees, sites, assignments, punches, leave, holidays)
- **Privacy & compliance** — consent before biometrics, retention purge, data export, erasure requests
- **First-login app tour** — admin walkthrough on the dashboard

## App Tour (First Login)

On the first visit to the dashboard after login, VanTrack shows a short guided tour. Completion is stored per user in the browser — it does not appear again unless replayed.

| Role | When it appears | Replay |
|------|-----------------|--------|
| **Employee** | After reference selfie setup, on the punch dashboard | Header → **App tour** |
| **Admin** | First visit to Admin Dashboard | Header → **App tour** |

### Employee tour (6 steps)

1. **Welcome** — what VanTrack does and how to replay the tour
2. **Site assignment** — you need an active assignment for today to punch
3. **Three daily punches** — check-in → midday → check-out order
4. **Selfie & GPS** — live camera + location; stay inside the geofence
5. **History** — My Timesheet calendar and day detail
6. **Offline** — punches queue locally and sync when back online

### Admin tour (6 steps)

1. **Welcome** — admin overview
2. **Today's snapshot** — KPI strip at the top of the dashboard
3. **Quick actions** — navigation to all admin modules
4. **Assignments** — assign employees to sites before they can punch
5. **Review queue** — handle flagged punches
6. **Setup** — add sites and enroll employees

Tour copy lives in `frontend/src/utils/strings.js` (`TOUR_*` keys). Steps are defined in `frontend/src/config/tourSteps.js`.

## Quick Start

See [QUICKSTART.md](QUICKSTART.md) for a 15-minute local setup guide.

### Prerequisites

- Node.js 18+
- Supabase account ([supabase.com](https://supabase.com))
- Vercel or Netlify (for deployment)

### 1. Supabase

1. Create a project at [app.supabase.com](https://app.supabase.com)
2. **SQL Editor** — run migrations in order (`supabase/migrations/001` through `012`)
3. **Storage** — create private bucket `punch-photos`
4. **Authentication** — add test users (or run `supabase/seed.sql`)
5. **Settings → API** — copy Project URL and Anon Key

Important migrations beyond the initial five:

| File | Purpose |
|------|---------|
| `008_fix_flag_array_append.sql` | Punch flag array handling |
| `009_enable_realtime.sql` | Realtime subscriptions |
| `010_face_match_client_flags.sql` | Client-side face match flags |
| `011_site_assignments.sql` | Site assignments + punch authorization |
| `012_sites_is_active.sql` | Site active/inactive toggle |
| `013_workforce_audit.sql` | Leave requests, holidays, audit log |
| `014_app_audit_triggers.sql` | Audit triggers for profiles, sites, assignments, punches |
| `015_privacy_compliance.sql` | Consent, retention, erasure requests, legal hold |

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 3. Test accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@vantrack.test` | `AdminPass123!` |
| Employee | `raj@vantrack.test` | `EmpPass123!` |
| Employee | `priya@vantrack.test` | `EmpPass123!` |

Create these in Supabase Auth → Users if not using the seed script.

### 4. Build & deploy

```bash
cd frontend
npm run build          # root path (Vercel, Netlify custom domain)
npm run build:pages    # GitHub Pages at /van-track/
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your hosting dashboard. HTTPS is required for PWA, camera, and geolocation.

## GitHub Pages

Live URL (after setup): **https://manthangandhi.github.io/van-track/**

### One-time repo setup

1. **GitHub → Settings → Secrets and variables → Actions** — add:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon key

2. **GitHub → Settings → Pages** — set **Source** to **GitHub Actions** (not “Deploy from a branch”).  
   If you see the README instead of the login screen, this setting is wrong — switch it to **GitHub Actions**, then re-run the workflow.

3. **Supabase → Authentication → URL configuration** — add redirect URLs:
   - `https://manthangandhi.github.io/van-track/`
   - `https://manthangandhi.github.io/van-track/reset-password`

### Re-run deployment after adding secrets

Adding secrets does **not** automatically re-run a failed workflow. Either:

- Push any new commit to `main`, or
- Go to **Actions → Deploy to GitHub Pages → Run workflow** (manual trigger)

### How deployment works

Every push to `main` runs `.github/workflows/deploy-pages.yml`, which:

1. Builds the frontend with `VITE_BASE_PATH=/van-track/`
2. Copies `index.html` → `404.html` for SPA routing on refresh
3. Deploys `frontend/dist` to GitHub Pages

### Local preview (GitHub Pages path)

```bash
cd frontend
npm run preview:pages
# Opens at http://localhost:4173/van-track/
```

## Architecture

### Frontend

- React 18 + Vite
- React Router
- Tailwind CSS (Inter typeface — readable on all devices)
- Leaflet + OpenStreetMap
- face-api.js (client-side face detection/match)
- Supabase JS client

### Backend (Supabase)

- PostgreSQL with RLS (employees see own data; admins see all)
- Auth (email/password)
- Storage (`punch-photos` bucket, signed URLs)
- Triggers for geofence distance, flags, punch ordering, assignment checks

### Core tables

```
profiles     — full_name, role, reference_selfie, face_descriptor, is_active
sites        — name, lat/lon, radius_meters, is_active
site_assignments — employee_id, site_id, start_date, end_date
punches      — check_in | midday | check_out, photo, GPS, flags, status
attendance_days (view) — daily hours and status rollup
```

## User flows

### Employee punch flow

1. Login → reference selfie setup (first time only)
2. **App tour** on first dashboard visit
3. Confirm active site assignment for today
4. Tap a punch slot → camera → GPS → upload (or offline queue)
5. View **My Timesheet** for history

### Admin flow

1. Login → Admin Dashboard + **app tour** (first visit)
2. Add **Sites** with geofence radius
3. Add **Employees** and capture reference selfie (employee does this on first login)
4. **Staff & Site Mapping** — assign employees to sites with date ranges
5. Monitor **Today's Attendance** and **Review Queue**
6. Export **Timesheets** for payroll

## Offline

- Service worker caches the app shell
- IndexedDB stores pending punches (photo + metadata)
- Sync queue uploads when connectivity returns
- `synced_late` flag applied to offline punches

## Flag reasons

| Flag | Meaning |
|------|---------|
| `outside_geofence` | Beyond site radius |
| `outside_assigned_site` | Not at an assigned site |
| `no_active_assignment` | No assignment for punch date |
| `poor_gps_accuracy` | Accuracy > 100 m |
| `face_mismatch` | Selfie does not match reference |
| `no_face_detected` | No face in punch photo |
| `synced_late` | Uploaded after offline storage |
| `no_check_in` | Midday/check-out without check-in |

## Project structure

```
van-track/
├── frontend/
│   ├── src/
│   │   ├── pages/           # Dashboards, admin screens, login
│   │   ├── components/      # PunchCamera, AppTour, MapViewer, …
│   │   ├── hooks/           # useAuth, usePunch, useAppTour, …
│   │   ├── services/        # Supabase, offline, face, sites
│   │   ├── config/          # brand, tour steps
│   │   └── utils/           # strings, geo, helpers
│   └── public/              # PWA manifest, icons, service worker
├── supabase/
│   ├── migrations/
│   └── seed.sql
└── docs/
```

## Deployment checklist

- [ ] All migrations applied (through `012`)
- [ ] `punch-photos` storage bucket (private)
- [ ] Environment variables set in hosting
- [ ] HTTPS enabled
- [ ] PWA manifest and icons valid
- [ ] Test employee punch + admin review flows
- [ ] Assign at least one employee to a site before field testing

## License

MIT — free to use and modify.

---

**VanTrack** — GPS-verified attendance for forest conservation teams. Built for field reliability, not boardroom complexity.