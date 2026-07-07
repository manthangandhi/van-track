# VanTrack System Architecture

High-level overview of VanTrack's architecture, data flow, and deployment model.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      EMPLOYEE MOBILE (PWA)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ React App (Vite) - index.html + bundle.js (~2 MB)       │   │
│  │  • Login page, Dashboard, History, Punch flow           │   │
│  │  • PunchCamera component (getUserMedia)                 │   │
│  │  • GPSDisplay (Geolocation API)                         │   │
│  │  • Image compression (client-side)                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Service Worker (offline support)                         │   │
│  │  • Cache app shell, API responses                       │   │
│  │  • Background sync (future)                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ IndexedDB (local punch storage)                          │   │
│  │  • Punch photos (base64)                                │   │
│  │  • Sync queue (pending uploads)                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              │ Supabase JS Client
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE (Backend)                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ PostgeSQL Database (free tier 500 MB)                    │   │
│  │  • profiles, sites, punches, attendance_days (VIEW)      │   │
│  │  • Row-Level Security (RLS) enforced at DB level        │   │
│  │  • Triggers: compute geofence, flags, day status        │   │
│  │  • Auth: email/password, session management             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Storage Bucket: punch-photos (PRIVATE, free 1 GB)        │   │
│  │  • Folder: punch-photos/{employee_id}/{punch_id}.jpg    │   │
│  │  • RLS: Employees upload own, admins download all       │   │
│  │  • Signed URLs: Expire after 7 days                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ REST API (auto-generated)                                │   │
│  │  • /rest/v1/profiles, /rest/v1/punches, etc.            │   │
│  │  • Rate limit: 200 req/min (free tier)                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ CDN (Supabase hosted)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ADMIN DASHBOARD (Desktop/Web)                   │
│  • Today view: real-time punch status, flags                     │
│  • Review queue: approve/reject flagged punches                  │
│  • Employees: CRUD, reference selfie upload                      │
│  • Sites: CRUD, map picker (Leaflet + OpenStreetMap)            │
│  • Timesheet: export CSV/XLSX (SheetJS, client-side)            │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Employee Punch

```
1. Employee taps "Check In" button
   ↓
2. requestCameraPermission() → navigator.mediaDevices.getUserMedia()
   ↓
3. Show live video stream (front-facing camera)
   ↓
4. Employee taps "Capture" → canvas.toBlob() → photo captured
   ↓
5. requestLocation() → navigator.geolocation.getCurrentPosition() [enableHighAccuracy: true]
   ↓
6. Wait for GPS (accuracy shown to user; retry if > 100m)
   ↓
7. Compress image → compressImage(blob, 480, 0.7) → ~50–70 KB
   ↓
8. IF online:
     → uploadPunchPhoto() → Supabase Storage
     → createPunch() → INSERT into punches table
     → Postgres trigger computes: distance, flags, status
   ↓
   ELSE (offline):
     → Convert blob to base64
     → savePunchOffline() → IndexedDB
     → addToSyncQueue() → queue for later
     → Show "Saved offline, will sync" message
   ↓
9. Reload today's punches → GET /rest/v1/punches?...
   ↓
10. Update UI: show punch in slot with time + flags (if any)
```

## Data Flow: Admin Review Flagged Punch

```
1. Admin sees punch flagged (e.g., "outside_geofence", "poor_gps_accuracy")
   ↓
2. Click punch in review queue
   ↓
3. Fetch punch + employee profile + photo URL (signed)
   ↓
4. Display:
     • Selfie (preview)
     • Map (Leaflet): punch location + site geofence circle
     • Accuracy, distance from site
     • Flags list
     • Input field for comment
   ↓
5. Admin clicks "Approve" or "Reject"
   ↓
6. updatePunchStatus(punchId, status, comment) → UPDATE punches SET status='approved', admin_comment='...'
   ↓
7. Punch removed from flagged list
   ↓
8. Attendance_days VIEW recomputed automatically (punch now counts toward hours worked)
```

## RLS Policy Examples

### Employee reads own punch
```sql
-- In punches RLS policy:
SELECT
USING (
  employee_id = auth.uid() 
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
)
```
Employee with UUID `abc-123` can only see punches WHERE employee_id='abc-123' (unless admin).

### Admin updates punch status
```sql
-- In punches RLS policy:
UPDATE
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
```
Only users with role='admin' can modify punch records.

## Database Triggers

### Trigger: `compute_punch_flags()`
Fires BEFORE INSERT on punches table:
1. Get employee's assigned site (lat, lon, radius)
2. Calculate Haversine distance
3. Check if distance > radius → add `outside_geofence` flag
4. Check if GPS accuracy > 100m → add `poor_gps_accuracy` flag
5. Check if device_timestamp ≠ server_timestamp > 600s → add `device_time_mismatch` flag
6. Check if punch_type=midday/check_out but no check_in today → add `no_check_in` flag
7. Set status = 'flagged' if any flags, else 'auto_approved'

## Offline Sync Strategy

### Scenario: Employee goes offline at site
```
1. Capture punch (no network)
   → savePunchOffline() → IndexedDB
   → show "Saved offline, will sync when online"

2. (later, back at lodge with WiFi)
   → window "online" event fires
   → processSyncQueue() iterates pending punches
   → uploadPunchPhoto() to Supabase Storage
   → createPunch() with synced_late=true
   → Postgres trigger runs again, recomputes flags
   → punch synced ✓
```

### Retry logic
- If upload fails: keep in queue, retry on next "online" event
- Max retries: 3 (configurable)
- Manual sync: User can tap "Sync now" button on dashboard

## Deployment Architectures

### Vercel/Netlify Deployment
```
GitHub repo
  ↓
Push to main branch
  ↓
Vercel / Netlify CI/CD
  ↓
Run: npm run build
  ↓
Deploy: dist/ folder to CDN
  ↓
Set environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
  ↓
https://vantrack.vercel.app (or Netlify domain)
```

### Self-Hosted Option
```
Own server (e.g., DigitalOcean, AWS EC2)
  ↓
Run: npm run build
  ↓
Serve dist/ via Nginx/Apache + HTTPS (Let's Encrypt)
  ↓
Static files cached, forwarded to Supabase API
```

## Monitoring & Alerting

### Recommended (free tier):
- **Sentry**: Error tracking (~500 errors/month free)
- **LogRocket**: Session replay, performance (~500 sessions/month free)
- **Supabase dashboard**: Built-in metrics (DB size, API calls)

### Metrics to watch:
- API error rate (> 5% = issue)
- Average response time (target < 500ms)
- Storage usage (vs 500 MB / 1 GB limits)
- Auth success rate (< 95% = alert)

## Future Enhancements

### Phase 2 (Months 3–6)
- Real-time admin dashboard (Supabase Realtime)
- Biometric auth (fingerprint unlock)
- Multi-language (Hindi, Marathi)
- Advanced reports (payroll integration)

### Phase 3 (Months 6–12)
- Offline maps (MBTiles for remote areas)
- Face liveness detection (ML model, optional paid tier)
- Mobile app (React Native) for deeper OS integration
- SMS/WhatsApp punch alerts

### Phase 4+ (Year 2+)
- Self-hosted Supabase (on customer's server)
- Data residency compliance (EU, India specific)
- Advanced analytics (ML-based anomaly detection)
- Integration with payroll systems

---

**Architecture Version**: 1.0  
**Last Updated**: 2024-07-07
