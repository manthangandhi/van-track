import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrgSettings } from '../services/privacyService'
import { privacyPolicyVersion } from '../config/appConfig'
import { STRINGS } from '../utils/strings'
import { AppShell } from '../components/ui/AppShell'

export default function PrivacyPolicyPage() {
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    getOrgSettings().then(setSettings).catch(() => {})
  }, [])

  const version = settings?.privacy_policy_version || privacyPolicyVersion

  return (
    <AppShell title={STRINGS.PRIVACY_POLICY} maxWidth="max-w-3xl">
      <p className="text-sm text-earth mb-6">
        {STRINGS.PRIVACY_POLICY_VERSION}: {version}
      </p>

      <div className="card p-6 space-y-6 text-sm text-earth leading-relaxed">
        <section>
          <h2 className="display-title text-lg text-forest-900 mb-2">{STRINGS.PRIVACY_SECTION_DATA}</h2>
          <p>{STRINGS.PRIVACY_SECTION_DATA_BODY}</p>
        </section>
        <section>
          <h2 className="display-title text-lg text-forest-900 mb-2">{STRINGS.PRIVACY_SECTION_PURPOSE}</h2>
          <p>{STRINGS.PRIVACY_SECTION_PURPOSE_BODY}</p>
        </section>
        <section>
          <h2 className="display-title text-lg text-forest-900 mb-2">{STRINGS.PRIVACY_SECTION_RETENTION}</h2>
          <p>
            {STRINGS.PRIVACY_SECTION_RETENTION_BODY.replace(
              '{days}',
              String(settings?.photo_retention_days ?? 365)
            )}
          </p>
        </section>
        <section>
          <h2 className="display-title text-lg text-forest-900 mb-2">{STRINGS.PRIVACY_SECTION_RIGHTS}</h2>
          <p>{STRINGS.PRIVACY_SECTION_RIGHTS_BODY}</p>
        </section>
        <section>
          <h2 className="display-title text-lg text-forest-900 mb-2">{STRINGS.PRIVACY_SECTION_SECURITY}</h2>
          <p>{STRINGS.PRIVACY_SECTION_SECURITY_BODY}</p>
        </section>
        {(settings?.data_controller_name || settings?.data_controller_email) && (
          <section>
            <h2 className="display-title text-lg text-forest-900 mb-2">{STRINGS.DATA_CONTROLLER}</h2>
            <p>
              {settings.data_controller_name}
              {settings.data_controller_email ? (
                <>
                  <br />
                  <a href={`mailto:${settings.data_controller_email}`} className="text-forest-600">
                    {settings.data_controller_email}
                  </a>
                </>
              ) : null}
            </p>
          </section>
        )}
      </div>

      <div className="mt-6">
        <Link to="/" className="btn-ghost text-sm">
          ← {STRINGS.BACK_TO_LOGIN}
        </Link>
      </div>
    </AppShell>
  )
}