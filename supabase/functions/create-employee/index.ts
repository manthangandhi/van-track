import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ error: 'Server misconfigured' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser()

    if (callerError || !caller) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (profileError || callerProfile?.role !== 'admin') {
      return json({ error: 'Forbidden' }, 403)
    }

    const body = await req.json()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const fullName = String(body.full_name || '').trim()
    const phone = body.phone ? String(body.phone).trim() : null
    const assignedSiteId = body.assigned_site_id || null
    const mandatoryDailyHours = body.mandatory_daily_hours ?? 8
    const isActive = body.is_active !== false

    if (!email || !password || !fullName) {
      return json({ error: 'Email, password, and full name are required' }, 400)
    }

    if (password.length < 6) {
      return json({ error: 'Password must be at least 6 characters' }, 400)
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (createError) {
      const message = createError.message?.toLowerCase().includes('already')
        ? 'An account with this email already exists'
        : createError.message
      return json({ error: message }, 400)
    }

    const userId = created.user?.id
    if (!userId) {
      return json({ error: 'Failed to create user' }, 500)
    }

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        full_name: fullName,
        phone,
        assigned_site_id: assignedSiteId || null,
        mandatory_daily_hours: mandatoryDailyHours,
        is_active: isActive,
        role: 'employee',
      })
      .eq('id', userId)

    if (updateError) {
      await adminClient.auth.admin.deleteUser(userId)
      return json({ error: updateError.message }, 500)
    }

    return json({
      user: {
        id: userId,
        email,
        full_name: fullName,
        phone,
        assigned_site_id: assignedSiteId,
        mandatory_daily_hours: mandatoryDailyHours,
        is_active: isActive,
        role: 'employee',
      },
    })
  } catch (err) {
    return json({ error: err?.message || 'Unexpected error' }, 500)
  }
})

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}