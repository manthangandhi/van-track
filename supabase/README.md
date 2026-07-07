# Supabase Setup Guide

Complete steps to set up VanTrack database on Supabase free tier.

## 1. Create Supabase Project

1. Go to https://app.supabase.com
2. Sign in / create account (free tier available)
3. Click **New Project**
4. Choose region closest to your offices
5. Set password (save it!)
6. Wait for initialization (~2 min)

## 2. Run Migrations

In Supabase dashboard → **SQL Editor**:

1. Click **New Query**
2. Copy-paste contents of **001_init_auth_rls.sql** → run
3. Repeat for files 002, 003, 004, 005 **in order**

Each migration will show ✅ if successful.

## 3. Create Storage Bucket

1. Go to **Storage** in sidebar
2. Click **New Bucket**
3. Name: `punch-photos`
4. Make PRIVATE (toggle off public)
5. Click **Create**

## 4. Set Storage Policies

1. In **Storage**, click `punch-photos` bucket
2. Go to **Policies** tab
3. Click **New Policy** → **For full customization**

Add these policies:

### Policy 1: Employees upload own photos
- **Name**: `employees_upload_punch_photos`
- **Allowed operations**: INSERT
- **Target roles**: authenticated
- **Using expression**:
  ```
  bucket_id = 'punch-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  ```
- **With check**: (same as Using)

### Policy 2: Employees read own photos
- **Name**: `employees_read_own_punch_photos`
- **Allowed operations**: SELECT
- **Using expression**:
  ```
  bucket_id = 'punch-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  ```

### Policy 3: Admins read all photos
- **Name**: `admins_read_all_punch_photos`
- **Allowed operations**: SELECT
- **Using expression**:
  ```
  bucket_id = 'punch-photos'
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  ```

## 5. Deploy `create-employee` Edge Function (required for Admin → Employees)

Admin "Add employee" calls a Supabase Edge Function (browser cannot create auth users with the anon key alone). If this is not deployed, the app shows a CORS / network error.

From the repo root:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy create-employee --project-ref YOUR_PROJECT_REF
```

Replace `YOUR_PROJECT_REF` with your project ref (Settings → General → Reference ID, e.g. `wockkjrllzrspwwsxxjb`).

Verify deployment:

```bash
curl -i -X OPTIONS "https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-employee" \
  -H "Origin: https://manthangandhi.github.io" \
  -H "Access-Control-Request-Method: POST"
```

You should get **HTTP 200** (not 404). Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` automatically — no extra secrets needed.

`supabase/config.toml` sets `verify_jwt = false` for this function so OPTIONS preflight works; the function still checks the caller is an admin.

## 6. Create Test Users

1. Go to **Authentication** → **Users**
2. Click **Add user** (or **Invite**)
3. Email: `admin@vantrack.test`, Password: `AdminPass123!`
4. Repeat for:
   - `raj@vantrack.test` (Employee)
   - `priya@vantrack.test` (Employee)

After users are created, run **seed.sql** to populate profiles/sites/permissions.

## 7. Get API Credentials

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://xxx.supabase.co`)
   - **Anon Key** (starts with `eyJh...`)
3. Paste into frontend `.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJh...
   ```

## 8. Enable Auth Providers (Optional)

1. **Settings** → **Auth** → **Providers**
2. For **Email**:
   - Confirm email required: Yes / No (choose based on preference)
   - Enable auto-confirm for testing: Yes (development only!)
3. For **Phone OTP** (optional):
   - Enable Phone provider
   - Add Twilio credentials if you want SMS (not free, but optional)

## 9. Database Backups & Monitoring

Supabase free tier includes:
- ✅ Automatic backups (7-day retention)
- ✅ Real-time metrics
- ✅ Query performance monitoring
- ✅ Row-level security (included)

No additional setup needed.

## 10. Verify Setup

In Supabase SQL Editor, run:

```sql
-- Check profiles table exists and has test data
SELECT * FROM public.profiles LIMIT 5;

-- Check sites
SELECT * FROM public.sites LIMIT 5;

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
```

All three should return results ✅

## 11. Test Auth Flow

1. Navigate to frontend (http://localhost:5173 or deployed URL)
2. Try login: `admin@vantrack.test` / `AdminPass123!`
3. Should redirect to admin dashboard
4. Try logout → login with employee account

## Common Issues

### "CORS error accessing Supabase"
- Check environment variables are set
- Verify URL doesn't have trailing `/`
- Clear browser cache

### "RLS policy violates" error
- Run SQL migrations in order (don't skip!)
- Check auth.users exist for profile IDs

### "Storage bucket not found"
- Create bucket manually in dashboard (name must be `punch-photos`)
- Set to PRIVATE

### "Session expired"
- Supabase sessions expire after 1 hour by default
- Implement refresh token logic (optional enhancement)

## Free Tier Limits

- **Database**: 500 MB storage (~1 million punches)
- **Storage**: 1 GB (~20,000 selfies at 50 KB each)
- **Auth users**: Unlimited
- **API calls**: Rate-limited to 200 req/min (plenty for <100 employees)
- **Real-time**: 100 concurrent connections

For a forest company with <100 employees, free tier is sufficient for 1–2 years of data.

## Upgrade When Needed

If you outgrow free tier:
- **Pro**: $25/month, 100 GB storage
- **Pay-as-you-go**: Scale automatically

---

**All set!** Your Supabase backend is ready. Now run the frontend and test.
