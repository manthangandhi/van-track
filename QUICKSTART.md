# Quick Start Guide — VanHajri

Get VanHajri running locally in 15 minutes.

## Step 1: Supabase Setup (5 min)

```bash
# 1. Go to https://app.supabase.com → Create new project
# 2. Save the password, note the project URL
# 3. In SQL Editor, paste and run each migration in order:
#    - supabase/migrations/001_init_auth_rls.sql
#    - supabase/migrations/002_sites_and_punches.sql
#    - supabase/migrations/003_attendance_days_view.sql
#    - supabase/migrations/004_punch_rules_triggers.sql
#    - supabase/migrations/005_storage_bucket.sql

# 4. Go to Storage → Create bucket "punch-photos" (PRIVATE)

# 5. Go to Authentication → Users → Add:
#    - admin@vanhajri.test / AdminPass123!
#    - raj@vanhajri.test / EmpPass123!
#    - priya@vanhajri.test / EmpPass123!

# 6. Run seed script: supabase/seed.sql (to create profiles & sites)

# 7. Settings → API → Copy Project URL and Anon Key
```

## Step 2: Frontend Setup (5 min)

```bash
cd frontend

# Copy .env.local example and fill in credentials
cp .env.local.example .env.local
# Edit .env.local:
# VITE_SUPABASE_URL=https://[your-project].supabase.co
# VITE_SUPABASE_ANON_KEY=[your-anon-key]

# Install dependencies
npm install

# Start dev server
npm run dev
# Opens http://localhost:5173
```

## Step 3: Test (5 min)

### Admin Flow
1. Login: `admin@vanhajri.test` / `AdminPass123!`
2. → Admin Dashboard
3. Explore: Today View, Employees, Sites, Timesheet

### Employee Flow
1. Logout → Login: `raj@vanhajri.test` / `EmpPass123!`
2. → Dashboard (3 punch slots)
3. Tap "Check In" → Camera opens → Capture selfie → GPS requested → Punch recorded ✓
4. Tap History → View past attendance

### Test Offline
1. DevTools → Network → Set to "Offline"
2. Try another punch → "Saved offline, will sync" message ✓
3. Go back online → Punches sync automatically

## Step 4: Deploy (Choose One)

### Option A: Vercel (Recommended)
```bash
# Build locally first
npm run build

# Then deploy:
vercel deploy

# Or connect GitHub repo to Vercel for auto-deploy

# Set environment variables in Vercel dashboard
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
```

### Option B: Netlify
```bash
npm run build

# Drag frontend/dist folder to https://app.netlify.com
# Or use Netlify CLI:
npm install -g netlify-cli
netlify deploy --prod --dir frontend/dist
```

## Troubleshooting

### Camera permission denied
- Check browser console for errors
- On mobile: Settings → Permissions → allow camera access
- Try in incognito/private mode (sometimes helps)

### GPS not available
- Needs HTTPS (or localhost on dev)
- Enable high accuracy in phone settings
- Wait 10+ seconds for GPS lock

### "Offline" message stuck
- Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
- Clear service worker: DevTools → Application → Service Workers → Unregister

### Supabase auth not working
- Check email/password are correct
- Verify user exists in Supabase Auth dashboard
- Check VITE_SUPABASE_URL is correct (no trailing slash)

## File Structure Cheat Sheet

```
frontend/
  ├── src/pages/           # Login, Dashboard, Admin pages
  ├── src/components/      # PunchCamera, GPSDisplay, MapViewer
  ├── src/hooks/           # useAuth, useGPS, usePunch, useOfflineSync
  ├── src/services/        # Supabase, offline, images, punch logic
  ├── src/utils/           # strings (i18n), geo (haversine), helpers
  ├── public/
  │   ├── manifest.json    # PWA metadata
  │   ├── service-worker.js
  │   ├── offline.html
  │   └── icons/           # App icons
  ├── index.html
  └── package.json

supabase/
  ├── migrations/          # SQL files (001–005)
  └── seed.sql

docs/
  ├── README.md
  ├── decisions.md         # Known limitations
  └── ARCHITECTURE.md      # System design
```

## Next Steps

1. ✅ Test all flows locally
2. 📱 Test on mobile (Chrome, Safari)
3. 🔐 Create real users in Supabase (replace test accounts)
4. 🚀 Deploy to Vercel or Netlify
5. 📊 Monitor with Sentry (optional)
6. 🌍 Share with team!

## Support

- **Docs**: [README.md](../README.md)
- **Architecture**: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
- **Supabase**: [supabase/README.md](../supabase/README.md)
- **Decisions**: [docs/decisions.md](../docs/decisions.md)

---

**VanHajri** is ready to go. Build with ❤️ for forest workers. Zero cost, zero vendor lock-in.
