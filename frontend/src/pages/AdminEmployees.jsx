import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { STRINGS } from '../utils/strings'

export default function AdminEmployees() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    assigned_site_id: '',
    mandatory_daily_hours: 8,
    is_active: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: empData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'employee')
      .order('full_name')

    const { data: siteData } = await supabase.from('sites').select('*').order('name')

    setEmployees(empData || [])
    setSites(siteData || [])
    setLoading(false)
  }

  async function handleSave() {
    if (editingId) {
      await supabase.from('profiles').update(formData).eq('id', editingId)
    }
    await loadData()
    setShowForm(false)
    setEditingId(null)
    setFormData({
      full_name: '',
      phone: '',
      assigned_site_id: '',
      mandatory_daily_hours: 8,
      is_active: true,
    })
  }

  async function handleDeactivate(empId) {
    await supabase.from('profiles').update({ is_active: false }).eq('id', empId)
    await loadData()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-600">{STRINGS.EMPLOYEES}</h1>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded"
          >
            {STRINGS.BACK}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <button
          onClick={() => setShowForm(true)}
          className="mb-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded"
        >
          + {STRINGS.ADD_EMPLOYEE}
        </button>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                {editingId ? STRINGS.EDIT : STRINGS.ADD_EMPLOYEE}
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder={STRINGS.FULL_NAME}
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="tel"
                  placeholder={STRINGS.PHONE}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <select
                  value={formData.assigned_site_id}
                  onChange={(e) => setFormData({ ...formData, assigned_site_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">{STRINGS.ASSIGNED_SITE}</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder={STRINGS.MANDATORY_HOURS}
                  value={formData.mandatory_daily_hours}
                  onChange={(e) => setFormData({ ...formData, mandatory_daily_hours: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded"
                  >
                    {STRINGS.SAVE}
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false)
                      setEditingId(null)
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded"
                  >
                    {STRINGS.CANCEL}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-4 text-center">{STRINGS.LOADING}...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.FULL_NAME}</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.PHONE}</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.SITE}</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.STATUS}</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.ACTIONS}</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">{emp.full_name}</td>
                      <td className="px-4 py-2 text-sm">{emp.phone || '—'}</td>
                      <td className="px-4 py-2 text-sm">{emp.assigned_site_id || '—'}</td>
                      <td className="px-4 py-2 text-sm">
                        {emp.is_active ? (
                          <span className="text-green-600">Active</span>
                        ) : (
                          <span className="text-red-600">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {emp.is_active && (
                          <button
                            onClick={() => handleDeactivate(emp.id)}
                            className="text-red-600 hover:text-red-700 font-semibold"
                          >
                            {STRINGS.DEACTIVATE}
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
      </main>
    </div>
  )
}
