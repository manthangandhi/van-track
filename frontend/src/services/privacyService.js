import { supabase } from './supabaseClient'
import { privacyPolicyVersion } from '../config/appConfig'

export async function getOrgSettings() {
  const { data, error } = await supabase.from('org_settings').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  return data
}

export async function updateOrgSettings(updates) {
  const { data: user } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('org_settings')
    .update({ ...updates, updated_at: new Date().toISOString(), updated_by: user.user?.id })
    .eq('id', 1)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function recordPrivacyConsent(version = privacyPolicyVersion) {
  const { error } = await supabase.rpc('record_privacy_consent', { p_version: version })
  if (error) throw error
}

export function needsPrivacyConsent(profile, settings) {
  if (!profile) return false
  const version = settings?.privacy_policy_version || privacyPolicyVersion
  return !profile.privacy_consent_at || profile.privacy_consent_version !== version
}

export async function exportEmployeeData(employeeId) {
  const [profileRes, punchesRes, leaveRes, assignmentsRes, settings] = await Promise.all([
    supabase.from('profiles').select('id, full_name, phone, role, mandatory_daily_hours, is_active, privacy_consent_at, created_at').eq('id', employeeId).single(),
    supabase.from('punches').select('id, punch_type, latitude, longitude, gps_accuracy_meters, server_timestamp, status, flag_reasons, photo_url').eq('employee_id', employeeId).order('server_timestamp'),
    supabase.from('leave_requests').select('*').eq('employee_id', employeeId),
    supabase.from('site_assignments').select('*, sites(name)').eq('employee_id', employeeId),
    getOrgSettings(),
  ])

  const punches = (punchesRes.data || []).map((p) => ({
    ...p,
    photo_url: p.photo_url === 'purged' ? '[purged per retention policy]' : '[stored — not included in export]',
  }))

  return {
    exported_at: new Date().toISOString(),
    data_controller: settings?.data_controller_name || null,
    profile: profileRes.data,
    punches,
    leave_requests: leaveRes.data || [],
    site_assignments: assignmentsRes.data || [],
    notice: 'Photo binaries are excluded. Request full erasure via Privacy settings if required under DPDP/GDPR.',
  }
}

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function requestDataErasure(employeeId, reason) {
  const { data, error } = await supabase
    .from('data_erasure_requests')
    .insert({ employee_id: employeeId, reason: reason || null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getErasureRequests(status = null) {
  let q = supabase
    .from('data_erasure_requests')
    .select('*, employee:profiles!employee_id(full_name, legal_hold)')
    .order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function reviewErasureRequest(id, status, admin_comment = '') {
  const { data: user } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('data_erasure_requests')
    .update({
      status,
      admin_comment,
      reviewed_by: user.user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function completeDataErasure(requestId) {
  const { error } = await supabase.rpc('complete_data_erasure', { p_request_id: requestId })
  if (error) throw error
}

export async function runPhotoRetentionPurge() {
  const { data, error } = await supabase.rpc('run_photo_retention_purge')
  if (error) throw error
  return data
}

export async function setLegalHold(profileId, legalHold) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ legal_hold: legalHold, updated_at: new Date().toISOString() })
    .eq('id', profileId)
    .select()
    .single()
  if (error) throw error
  return data
}