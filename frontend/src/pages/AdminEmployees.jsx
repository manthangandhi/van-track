import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../services/supabaseClient'
import { filterActiveSites } from '../services/sitesService'
import { createEmployee } from '../services/employeeService'
import { uploadReferenceSelfie, getSignedPhotoUrl } from '../services/punchService'
import { compressImage } from '../services/imageService'
import { extractFaceDescriptor } from '../services/faceService'
import { PunchCamera } from '../components/PunchCamera'
import { SearchableSelect } from '../components/SearchableSelect'
import { STRINGS } from '../utils/strings'
import { validateEmail, validatePassword } from '../utils/validators'
import { AppShell } from '../components/ui/AppShell'
import { StatusToggle } from '../components/ui/StatusToggle'
import {
  createSiteAssignment,
  getActiveAssignments,
  updateSiteAssignment,
  endOpenAssignments,
} from '../services/siteAssignmentService'
import { getLocalDateKey, addDays } from '../utils/helpers'

const emptyForm = {
  email: '',
  password: '',
  full_name: '',
  phone: '',
  assigned_site_id: '',
  mandatory_daily_hours: 8,
  is_active: true,
}

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formError, setFormError] = useState(null)
  const [pageError, setPageError] = useState(null)
  const [referencePreview, setReferencePreview] = useState(null)
  const [pendingSelfiePath, setPendingSelfiePath] = useState(null)
  const [pendingFaceDescriptor, setPendingFaceDescriptor] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [showInactive, setShowInactive] = useState(true)

  const siteNameById = Object.fromEntries(sites.map((s) => [s.id, s.name]))
  const siteOptions = filterActiveSites(sites).map((site) => ({
    value: site.id,
    label: site.name,
  }))

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase()
    return employees.filter((emp) => {
      if (!showInactive && !emp.is_active) return false
      if (!query) return true
      const siteName = siteNameById[emp.assigned_site_id] || ''
      return (
        emp.full_name?.toLowerCase().includes(query) ||
        emp.phone?.toLowerCase().includes(query) ||
        siteName.toLowerCase().includes(query)
      )
    })
  }, [employees, employeeSearch, siteNameById, showInactive])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [{ data: empData, error: empError }, { data: siteData, error: siteError }] =
      await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'employee').order('full_name'),
        supabase.from('sites').select('*').order('name'),
      ])

    if (empError || siteError) {
      setPageError(empError?.message || siteError?.message || STRINGS.SERVER_ERROR)
    }

    setEmployees(empData || [])
    setSites(siteData || [])
    setLoading(false)
  }

  function openCreate() {
    setIsCreating(true)
    setEditingId(null)
    setFormData(emptyForm)
    setPendingSelfiePath(null)
    setReferencePreview(null)
    setFormError(null)
    setShowForm(true)
  }

  async function openEdit(emp) {
    setIsCreating(false)
    setEditingId(emp.id)
    setFormData({
      email: '',
      password: '',
      full_name: emp.full_name || '',
      phone: emp.phone || '',
      assigned_site_id: emp.assigned_site_id || '',
      mandatory_daily_hours: emp.mandatory_daily_hours ?? 8,
      is_active: emp.is_active ?? true,
    })
    setPendingSelfiePath(null)
    setPendingFaceDescriptor(null)
    setFormError(null)

    if (emp.reference_selfie_url) {
      const url = await getSignedPhotoUrl(emp.reference_selfie_url)
      setReferencePreview(url)
    } else {
      setReferencePreview(null)
    }

    setShowForm(true)
  }

  async function handleSelfieCapture(photoBlob) {
    setShowCamera(false)
    if (!editingId) return

    try {
      const descriptor = await extractFaceDescriptor(photoBlob)
      const compressed = await compressImage(photoBlob, 640, 640, 0.88)
      const path = await uploadReferenceSelfie(editingId, compressed)
      setPendingSelfiePath(path)
      setPendingFaceDescriptor(descriptor)
      const url = await getSignedPhotoUrl(path)
      setReferencePreview(url)
    } catch (err) {
      setFormError(
        err.message === 'NO_FACE_DETECTED' ? STRINGS.NO_FACE_DETECTED : err.message || 'Failed to upload reference selfie'
      )
    }
  }

  async function handleSave() {
    setFormError(null)

    if (!formData.full_name.trim()) {
      setFormError(STRINGS.REQUIRED)
      return
    }

    setSaving(true)

    try {
      if (isCreating) {
        if (!validateEmail(formData.email)) {
          setFormError(STRINGS.INVALID_EMAIL)
          return
        }
        if (!validatePassword(formData.password)) {
          setFormError(STRINGS.PASSWORD_TOO_SHORT)
          return
        }

        const newUser = await createEmployee({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name.trim(),
          phone: formData.phone || null,
          assigned_site_id: formData.assigned_site_id || null,
          mandatory_daily_hours: formData.mandatory_daily_hours,
          is_active: formData.is_active,
        })
        if (formData.assigned_site_id && newUser.id) {
          const today = getLocalDateKey()
          try {
            await createSiteAssignment({
              employeeId: newUser.id,
              siteId: formData.assigned_site_id,
              startDate: today,
              syncProfileSite: false,
            })
          } catch (assignErr) {
            await loadData()
            closeForm()
            setPageError(
              `${STRINGS.CREATE_EMPLOYEE_ASSIGNMENT_FAILED} (${assignErr.message || STRINGS.SERVER_ERROR})`
            )
            return
          }
        }
      } else {
        const updates = {
          full_name: formData.full_name.trim(),
          phone: formData.phone || null,
          assigned_site_id: formData.assigned_site_id || null,
          mandatory_daily_hours: formData.mandatory_daily_hours,
          is_active: formData.is_active,
        }
        if (pendingSelfiePath) {
          updates.reference_selfie_url = pendingSelfiePath
          updates.reference_selfie_enrolled_at = new Date().toISOString()
        }
        if (pendingFaceDescriptor) {
          updates.face_descriptor = pendingFaceDescriptor
        }

        const { error } = await supabase.from('profiles').update(updates).eq('id', editingId)
        if (error) throw error

        const today = getLocalDateKey()
        const yesterday = getLocalDateKey(addDays(new Date(), -1))

        if (formData.assigned_site_id) {
          const active = await getActiveAssignments(editingId, today)
          const alreadyAssigned = active.some((a) => a.site_id === formData.assigned_site_id)
          if (!alreadyAssigned) {
            for (const assignment of active) {
              if (assignment.site_id !== formData.assigned_site_id) {
                await updateSiteAssignment(assignment.id, { end_date: yesterday })
              }
            }
            const { data: { user } } = await supabase.auth.getUser()
            await createSiteAssignment({
              employeeId: editingId,
              siteId: formData.assigned_site_id,
              startDate: today,
              createdBy: user?.id,
              syncProfileSite: true,
            })
          }
        } else {
          await endOpenAssignments(editingId, yesterday)
        }
      }

      await loadData()
      closeForm()
    } catch (err) {
      setFormError(err.message || STRINGS.SERVER_ERROR)
    } finally {
      setSaving(false)
    }
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setIsCreating(false)
    setReferencePreview(null)
    setPendingSelfiePath(null)
    setPendingFaceDescriptor(null)
    setFormData(emptyForm)
    setFormError(null)
  }

  async function setEmployeeActive(empId, isActive) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', empId)

    if (error) {
      setPageError(error.message)
      return
    }

    await loadData()
  }

  return (
    <AppShell
      title={STRINGS.EMPLOYEES}
      backTo="/admin"
      maxWidth="max-w-6xl"
      headerActions={
        <button type="button" onClick={openCreate} className="btn-primary">
          + {STRINGS.ADD_EMPLOYEE}
        </button>
      }
    >
      <p className="mb-4 text-sm text-earth">{STRINGS.ENROLLMENT_HINT}</p>
      {pageError && <div className="alert-error mb-4">{pageError}</div>}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="display-title text-lg text-forest-900 mb-4">
              {isCreating ? STRINGS.ADD_EMPLOYEE : STRINGS.EDIT}
            </h2>
            {formError && <div className="alert-error mb-3">{formError}</div>}
            <div className="space-y-4">
              {isCreating && (
                <>
                  <input
                    type="email"
                    placeholder={STRINGS.EMAIL}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                  />
                  <input
                    type="password"
                    placeholder={STRINGS.TEMP_PASSWORD}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-field"
                  />
                </>
              )}
              <input
                type="text"
                placeholder={STRINGS.FULL_NAME}
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="input-field"
              />
              <input
                type="tel"
                placeholder={STRINGS.PHONE}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-field"
              />
              <SearchableSelect
                label={STRINGS.ASSIGNED_SITE}
                placeholder={STRINGS.ASSIGNED_SITE}
                options={siteOptions}
                value={formData.assigned_site_id}
                onChange={(assigned_site_id) =>
                  setFormData({ ...formData, assigned_site_id })
                }
              />
              <input
                type="number"
                placeholder={STRINGS.MANDATORY_HOURS}
                value={formData.mandatory_daily_hours}
                onChange={(e) => {
                  const value = parseFloat(e.target.value)
                  setFormData({
                    ...formData,
                    mandatory_daily_hours: Number.isFinite(value) ? value : 8,
                  })
                }}
                className="input-field"
              />

              {!isCreating && (
                <div>
                  <p className="label-field mb-2">{STRINGS.REFERENCE_SELFIE}</p>
                  {referencePreview ? (
                    <img
                      src={referencePreview}
                      alt="Reference selfie"
                      className="w-full max-h-40 object-cover rounded mb-2"
                    />
                  ) : (
                    <p className="text-sm text-earth mb-2">{STRINGS.NO_REFERENCE_SELFIE}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="btn-secondary w-full"
                  >
                    📷 {STRINGS.CAPTURE_REFERENCE_SELFIE}
                  </button>
                </div>
              )}

              {isCreating && (
                <p className="text-xs text-earth">{STRINGS.CREATE_THEN_SELFIE_HINT}</p>
              )}

              <StatusToggle
                active={formData.is_active}
                onChange={(is_active) => setFormData({ ...formData, is_active })}
                activeHint={STRINGS.ACCOUNT_ACTIVE}
                inactiveHint={STRINGS.ACCOUNT_INACTIVE}
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary flex-1"
                >
                  {saving ? STRINGS.LOADING : STRINGS.SAVE}
                </button>
                <button type="button" onClick={closeForm} className="btn-secondary flex-1">
                  {STRINGS.CANCEL}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCamera && (
        <PunchCamera onCapture={handleSelfieCapture} onClose={() => setShowCamera(false)} />
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-forest-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            type="search"
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            placeholder={STRINGS.SEARCH_EMPLOYEES}
            className="input-field max-w-md"
          />
          <label className="flex items-center gap-2 text-sm text-earth shrink-0">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-forest-300"
            />
            {STRINGS.SHOW_INACTIVE}
          </label>
        </div>
        {loading ? (
          <div className="p-4 text-center">{STRINGS.LOADING}...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-forest-50 border-b border-forest-100">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.FULL_NAME}</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.PHONE}</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.SITE}</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.REFERENCE_SELFIE}</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.STATUS}</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.ACTIONS}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="border-b border-forest-50 hover:bg-forest-50/50">
                    <td className="px-4 py-2 text-sm">{emp.full_name}</td>
                    <td className="px-4 py-2 text-sm">{emp.phone || '—'}</td>
                    <td className="px-4 py-2 text-sm">
                      {siteNameById[emp.assigned_site_id] || '—'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {emp.reference_selfie_url ? (
                        <span className="text-forest-600">✓</span>
                      ) : (
                        <span className="text-amber-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          emp.is_active
                            ? 'bg-forest-100 text-forest-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {emp.is_active ? STRINGS.ACTIVE : STRINGS.INACTIVE}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm space-x-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(emp)}
                        className="text-forest-600 hover:text-forest-700 font-semibold"
                      >
                        {STRINGS.EDIT}
                      </button>
                      {emp.is_active ? (
                        <button
                          type="button"
                          onClick={() => setEmployeeActive(emp.id, false)}
                          className="text-red-600 hover:text-red-700 font-semibold"
                        >
                          {STRINGS.DEACTIVATE}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEmployeeActive(emp.id, true)}
                          className="text-forest-600 hover:text-forest-700 font-semibold"
                        >
                          {STRINGS.REACTIVATE}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}