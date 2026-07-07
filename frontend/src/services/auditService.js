import { supabase } from './supabaseClient'

export const AUDIT_ENTITY_TYPES = [
  { value: '', label: 'All' },
  { value: 'profile', label: 'Employees' },
  { value: 'site', label: 'Sites' },
  { value: 'assignment', label: 'Assignments' },
  { value: 'punch', label: 'Punches' },
  { value: 'leave_request', label: 'Leave' },
  { value: 'holiday', label: 'Holidays' },
]

const ACTION_LABELS = {
  'profile.created': 'Employee profile created',
  'profile.updated': 'Employee profile updated',
  'site.created': 'Site created',
  'site.updated': 'Site updated',
  'site.deleted': 'Site deleted',
  'assignment.created': 'Assignment created',
  'assignment.updated': 'Assignment updated',
  'assignment.deleted': 'Assignment removed',
  'punch.recorded': 'Punch recorded',
  'punch.auto_approved': 'Punch auto-approved',
  'punch.flagged': 'Punch flagged',
  'punch.approved': 'Punch approved',
  'punch.rejected': 'Punch rejected',
  'leave.requested': 'Leave requested',
  'leave.approved': 'Leave approved',
  'leave.rejected': 'Leave rejected',
  'holiday.created': 'Holiday added',
  'holiday.updated': 'Holiday updated',
  'holiday.deleted': 'Holiday removed',
  'privacy.consent': 'Privacy consent recorded',
  'privacy.settings_updated': 'Privacy settings updated',
  'privacy.retention_purge': 'Photo retention purge run',
  'privacy.erasure_requested': 'Data erasure requested',
  'privacy.erasure_approved': 'Erasure approved',
  'privacy.erasure_rejected': 'Erasure rejected',
  'privacy.erasure_completed': 'Data erasure completed',
}

export function formatAuditAction(action) {
  return ACTION_LABELS[action] || action
}

export function formatAuditDetails(details) {
  if (!details || typeof details !== 'object') return '—'
  if (details.changes) {
    return Object.entries(details.changes)
      .map(([k, v]) => {
        if (v && typeof v === 'object' && 'old' in v && 'new' in v) {
          return `${k}: ${v.old ?? '—'} → ${v.new ?? '—'}`
        }
        return `${k}: ${JSON.stringify(v)}`
      })
      .join(' · ')
  }
  const skip = new Set(['profile_id'])
  return Object.entries(details)
    .filter(([k]) => !skip.has(k))
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join(' · ') || '—'
}

export async function getAuditLog({ limit = 200, entityType = null, search = null } = {}) {
  let q = supabase
    .from('audit_log')
    .select('*, actor:profiles!actor_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (entityType) q = q.eq('entity_type', entityType)

  const { data, error } = await q
  if (error) throw error

  let rows = data || []
  if (search?.trim()) {
    const q = search.trim().toLowerCase()
    rows = rows.filter(
      (r) =>
        r.action?.toLowerCase().includes(q) ||
        r.entity_type?.toLowerCase().includes(q) ||
        r.actor?.full_name?.toLowerCase().includes(q) ||
        JSON.stringify(r.details).toLowerCase().includes(q)
    )
  }
  return rows
}