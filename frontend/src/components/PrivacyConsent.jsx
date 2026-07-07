import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { recordPrivacyConsent } from '../services/privacyService'
import { privacyPolicyVersion } from '../config/appConfig'
import { STRINGS } from '../utils/strings'
import { BrandMark } from './ui/BrandMark'

export function PrivacyConsent({ onAccepted, settings }) {
  const [checked, setChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleAccept() {
    if (!checked) return
    setSaving(true)
    setError(null)
    try {
      await recordPrivacyConsent(settings?.privacy_policy_version || privacyPolicyVersion)
      onAccepted()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  return (
    <div className="page-shell flex items-center justify-center p-4">
      <div className="card p-8 max-w-lg w-full shadow-elevated">
        <div className="flex justify-center mb-6">
          <BrandMark size="md" />
        </div>
        <h1 className="display-title text-2xl text-center mb-2">{STRINGS.PRIVACY_CONSENT_TITLE}</h1>
        <p className="text-earth text-sm mb-4">{STRINGS.PRIVACY_CONSENT_BODY}</p>
        <ul className="text-sm text-earth space-y-2 mb-6 list-disc pl-5">
          <li>{STRINGS.PRIVACY_CONSENT_ITEM_PHOTO}</li>
          <li>{STRINGS.PRIVACY_CONSENT_ITEM_LOCATION}</li>
          <li>{STRINGS.PRIVACY_CONSENT_ITEM_RETENTION}</li>
          <li>{STRINGS.PRIVACY_CONSENT_ITEM_RIGHTS}</li>
        </ul>
        {settings?.data_controller_name && (
          <p className="text-xs text-earth mb-4">
            {STRINGS.DATA_CONTROLLER}: {settings.data_controller_name}
            {settings.data_controller_email ? ` · ${settings.data_controller_email}` : ''}
          </p>
        )}
        <label className="flex items-start gap-3 mb-4 cursor-pointer">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1" />
          <span className="text-sm text-forest-900">
            {STRINGS.PRIVACY_CONSENT_CHECKBOX}{' '}
            <Link to="/privacy" className="text-forest-600 font-semibold underline">
              {STRINGS.PRIVACY_POLICY}
            </Link>
          </span>
        </label>
        {error && <div className="alert-error mb-4">{error}</div>}
        <button type="button" disabled={!checked || saving} onClick={handleAccept} className="btn-primary w-full py-3">
          {saving ? STRINGS.LOADING : STRINGS.PRIVACY_CONSENT_ACCEPT}
        </button>
      </div>
    </div>
  )
}