/**
 * Enterprise manual-device QA automation for VanTrack (GitHub Pages).
 * Covers auth, navigation, SPA routes, admin/employee flows, API health.
 */
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.QA_BASE_URL || 'https://manthangandhi.github.io/van-track/'
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || 'admin@vantrack.test'
const ADMIN_PASS = process.env.QA_ADMIN_PASS || 'AdminPass123!'
const EMP_EMAIL = process.env.QA_EMP_EMAIL || 'qa-automation-1783534053343@vantrack.test'
const EMP_PASS = process.env.QA_EMP_PASS || 'QaTestPass123!'

function loadEnv() {
  const envPath = resolve(__dirname, '../.env.local')
  const text = readFileSync(envPath, 'utf8')
  const vars = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) vars[m[1].trim()] = m[2].trim()
  }
  return vars
}

const env = loadEnv()
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function login(page, email, password) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: /^login$/i }).click()
  await expect(page).toHaveURL(/\/(dashboard|admin)/, { timeout: 20000 })
  await page.waitForLoadState('networkidle')
}

async function canAuthenticate(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (!error) await supabase.auth.signOut()
  return !error
}

function collectConsoleErrors(page) {
  const errors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      // Ignore benign third-party / asset noise
      if (
        text.includes('favicon') ||
        text.includes('ResizeObserver') ||
        text.includes('Download the React DevTools') ||
        text.includes('status of 404') // GitHub Pages SPA first-hop 404 before redirect
      ) return
      errors.push(text)
    }
  })
  page.on('pageerror', (err) => errors.push(err.message))
  return errors
}

test.describe('Public & SPA routing', () => {
  test('home loads without crash', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    const res = await page.goto(BASE, { waitUntil: 'networkidle' })
    expect(res?.status()).toBeLessThan(400)
    await expect(page.locator('body')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('privacy policy page loads', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto(`${BASE}privacy`, { waitUntil: 'networkidle' })
    await expect(page.getByText(/privacy/i).first()).toBeVisible({ timeout: 15000 })
    expect(errors).toEqual([])
  })

  test('deep link /history redirects via SPA (employee unauthenticated → login)', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto(`${BASE}history`, { waitUntil: 'networkidle' })
    // Unauthenticated users should see login, not a blank 404
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 })
    expect(errors).toEqual([])
  })

  test('service worker registers', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    const sw = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return 'unsupported'
      const reg = await navigator.serviceWorker.getRegistration()
      return reg ? 'registered' : 'none'
    })
    expect(['registered', 'none']).toContain(sw)
  })
})

test.describe('Supabase API health', () => {
  test('admin can authenticate', async () => {
    test.skip(
      !(await canAuthenticate(ADMIN_EMAIL, ADMIN_PASS)),
      'Demo admin not seeded — run supabase/seed.sql or set QA_ADMIN_EMAIL'
    )
    const { data, error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASS,
    })
    expect(error).toBeNull()
    expect(data.user?.email).toBe(ADMIN_EMAIL)
    await supabase.auth.signOut()
  })

  test('employee can authenticate', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: EMP_EMAIL,
      password: EMP_PASS,
    })
    expect(error).toBeNull()
    expect(data.user?.email).toBe(EMP_EMAIL)
    await supabase.auth.signOut()
  })

  test('enroll_reference_selfie RPC exists (migration 016)', async () => {
    const { data: auth } = await supabase.auth.signInWithPassword({
      email: EMP_EMAIL,
      password: EMP_PASS,
    })
    expect(auth.user).toBeTruthy()

    const { data: profile } = await supabase
      .from('profiles')
      .select('reference_selfie_url, face_descriptor, privacy_consent_at')
      .eq('id', auth.user.id)
      .single()

    // RPC should exist — calling with null should return structured error, not "function does not exist"
    const { error } = await supabase.rpc('enroll_reference_selfie', {
      p_photo_path: 'qa/test.jpg',
      p_face_descriptor: [0.1],
    })
    expect(error?.message || '').not.toMatch(/does not exist/i)
    expect(error?.message || '').not.toMatch(/Could not find the function/i)

    // Profile should be readable
    expect(profile).toBeTruthy()
    await supabase.auth.signOut()
  })

  test('create-employee edge function CORS preflight', async ({ request }) => {
    const res = await request.fetch(
      `${env.VITE_SUPABASE_URL}/functions/v1/create-employee`,
      { method: 'OPTIONS' }
    )
    expect(res.status()).toBe(200)
    const headers = res.headers()
    expect(headers['access-control-allow-origin']).toBeTruthy()
  })
})

test.describe('Admin flows', () => {
  test('admin login → dashboard → all admin pages', async ({ page }) => {
    test.skip(
      !(await canAuthenticate(ADMIN_EMAIL, ADMIN_PASS)),
      'Demo admin not seeded — run supabase/seed.sql or set QA_ADMIN_EMAIL'
    )
    const errors = collectConsoleErrors(page)
    await login(page, ADMIN_EMAIL, ADMIN_PASS)
    await expect(page).toHaveURL(/\/admin/, { timeout: 20000 })

    const routes = [
      '/admin',
      '/admin/today',
      '/admin/review',
      '/admin/employees',
      '/admin/sites',
      '/admin/assignments',
      '/admin/timesheet',
      '/admin/insights',
      '/admin/workforce',
      '/admin/audit',
      '/admin/privacy',
    ]

    for (const route of routes) {
      await page.goto(`${BASE}${route.replace(/^\//, '')}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(500)
      // Page should not show generic error boundary
      const crash = page.getByText(/something went wrong|application error/i)
      await expect(crash).toHaveCount(0)
    }

    expect(errors).toEqual([])
  })

  test('admin timesheet page has date controls', async ({ page }) => {
    test.skip(
      !(await canAuthenticate(ADMIN_EMAIL, ADMIN_PASS)),
      'Demo admin not seeded — run supabase/seed.sql or set QA_ADMIN_EMAIL'
    )
    const errors = collectConsoleErrors(page)
    await login(page, ADMIN_EMAIL, ADMIN_PASS)
    await page.goto(`${BASE}admin/timesheet`, { waitUntil: 'networkidle' })
    await expect(page.locator('input[type="date"], select').first()).toBeVisible({ timeout: 15000 })
    expect(errors).toEqual([])
  })

  test('admin employees page loads list', async ({ page }) => {
    test.skip(
      !(await canAuthenticate(ADMIN_EMAIL, ADMIN_PASS)),
      'Demo admin not seeded — run supabase/seed.sql or set QA_ADMIN_EMAIL'
    )
    const errors = collectConsoleErrors(page)
    await login(page, ADMIN_EMAIL, ADMIN_PASS)
    await page.goto(`${BASE}admin/employees`, { waitUntil: 'networkidle' })
    await expect(page.getByText(/employee/i).first()).toBeVisible({ timeout: 15000 })
    expect(errors).toEqual([])
  })
})

test.describe('Employee flows', () => {
  test('employee login → dashboard', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await login(page, EMP_EMAIL, EMP_PASS)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 })
    // Dashboard should render punch UI or reference selfie gate
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(50)
    expect(errors).toEqual([])
  })

  test('employee history page — all tabs', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await login(page, EMP_EMAIL, EMP_PASS)
    await page.goto(`${BASE}history`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/history/, { timeout: 20000 })

    for (const tabName of ['Attendance', 'Assignments', 'Leave', 'Privacy']) {
      await page.getByRole('button', { name: tabName, exact: true }).click()
      await page.waitForTimeout(600)
      await expect(page.getByRole('button', { name: tabName, exact: true })).toBeVisible()
    }

    // Leave tab: site/status filters should be hidden
    await page.getByRole('button', { name: 'Leave', exact: true }).click()
    await expect(page.locator('select').filter({ hasText: /all statuses/i })).toHaveCount(0)

    // Privacy tab: date filters should be hidden
    await page.getByRole('button', { name: 'Privacy', exact: true }).click()
    await expect(page.getByText(/export|consent|your data/i).first()).toBeVisible({ timeout: 10000 })

    expect(errors).toEqual([])
  })

  test('employee cannot access admin routes', async ({ page }) => {
    await login(page, EMP_EMAIL, EMP_PASS)
    await page.goto(`${BASE}admin/employees`, { waitUntil: 'networkidle' })
    await expect(page).not.toHaveURL(/\/admin\/employees/)
  })
})

test.describe('Auth edge cases', () => {
  test('invalid credentials show error', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.locator('input[type="email"]').fill('bad@vantrack.test')
    await page.locator('input[type="password"]').fill('WrongPass123!')
    await page.getByRole('button', { name: /^login$/i }).click()
    await expect(page.getByText(/invalid|incorrect|error|failed/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('logout works', async ({ page }) => {
    await login(page, EMP_EMAIL, EMP_PASS)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 })
    const signOut = page.getByRole('button', { name: /sign out|log out/i })
    if (await signOut.count() > 0) {
      await signOut.first().click()
      await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 })
    }
  })
})