import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppShell } from '../components/ui/AppShell'
import { ActionRow } from '../components/ui/ActionRow'
import { KpiStrip } from '../components/ui/KpiStrip'
import { STRINGS } from '../utils/strings'
import { getAdminOverview } from '../services/analyticsService'
import {
  IconChart,
  IconFlag,
  IconUsers,
  IconTree,
  IconClipboard,
  IconInsights,
  IconMapPin,
  IconClock,
} from '../components/ui/Icons'
import { AppTour } from '../components/AppTour'
import { useAppTour } from '../hooks/useAppTour'
import { ADMIN_TOUR_STEPS } from '../config/tourSteps'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { signOut, profile, user } = useAuth()
  const { isOpen: tourOpen, stepIndex, skipTour, replayTour, goNext, goBack } = useAppTour(
    user?.id,
    'admin'
  )
  const [overview, setOverview] = useState(null)

  useEffect(() => {
    getAdminOverview().then(setOverview)
  }, [])

  const actions = [
    {
      title: STRINGS.TODAY_VIEW,
      icon: <IconChart className="w-5 h-5" />,
      path: '/admin/today',
      description: 'Live attendance across all field teams',
      accent: 'forest',
    },
    {
      title: STRINGS.REVIEW_QUEUE,
      icon: <IconFlag className="w-5 h-5" />,
      path: '/admin/review',
      description: 'Review flagged punches and face matches',
      accent: 'gold',
      badge: overview?.flaggedCount,
    },
    {
      title: STRINGS.STAFF_SITE_MAPPING,
      icon: <IconUsers className="w-5 h-5" />,
      path: '/admin/assignments',
      description: 'Assign employees to sites for specific date ranges',
      accent: 'teal',
    },
    {
      title: STRINGS.WORKFORCE,
      icon: <IconClock className="w-5 h-5" />,
      path: '/admin/workforce',
      description: 'Leave requests and public holidays',
      accent: 'slate',
    },
    {
      title: STRINGS.AUDIT_LOG,
      icon: <IconClipboard className="w-5 h-5" />,
      path: '/admin/audit',
      description: 'Full activity log — employees, sites, punches, leave',
      accent: 'earth',
    },
    {
      title: STRINGS.PRIVACY_COMPLIANCE,
      icon: <IconMapPin className="w-5 h-5" />,
      path: '/admin/privacy',
      description: 'Consent, retention, erasure requests, legal hold',
      accent: 'teal',
    },
    {
      title: STRINGS.TIMESHEETS,
      icon: <IconClipboard className="w-5 h-5" />,
      path: '/admin/timesheet',
      description: 'Payroll register and attendance exports',
      accent: 'slate',
    },
    {
      title: STRINGS.INSIGHTS,
      icon: <IconInsights className="w-5 h-5" />,
      path: '/admin/insights',
      description: 'Trends, site hours, and team leaderboard',
      accent: 'canopy',
    },
    {
      title: STRINGS.EMPLOYEES,
      icon: <IconUsers className="w-5 h-5" />,
      path: '/admin/employees',
      description: 'Enroll and manage field staff',
      accent: 'earth',
    },
    {
      title: STRINGS.SITES,
      icon: <IconTree className="w-5 h-5" />,
      path: '/admin/sites',
      description: 'Pin forest sites and geofence radii',
      accent: 'forest',
    },
  ]

  return (
    <AppShell
      showBrand
      headerActions={
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={replayTour}
            className="btn-ghost text-sm py-1.5 px-2"
            title={STRINGS.TOUR_REPLAY}
          >
            {STRINGS.TOUR_REPLAY}
          </button>
          <span className="hidden sm:block text-sm text-earth">{profile?.full_name}</span>
          <button type="button" onClick={signOut} className="btn-danger">
            {STRINGS.LOGOUT}
          </button>
        </div>
      }
    >
      <div className="mb-6">
        <p className="section-label">{STRINGS.ADMIN_DASHBOARD}</p>
        <h2 className="display-title text-2xl sm:text-3xl mb-1">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h2>
        <p className="text-earth text-sm max-w-2xl">
          Monitor field attendance, verify punches, and keep your conservation teams accountable.
        </p>
      </div>

      {overview && (
        <div className="mb-8">
          <p className="section-label text-earth mb-3">{STRINGS.TODAY_SNAPSHOT}</p>
          <KpiStrip
            items={[
              {
                icon: <IconUsers className="w-5 h-5" />,
                label: STRINGS.ACTIVE_EMPLOYEES,
                value: overview.employeeCount,
                sub: `${overview.activeToday} checked in today`,
              },
              {
                icon: <IconClock className="w-5 h-5" />,
                label: STRINGS.TODAYS_ATTENDANCE,
                value: `${overview.attendanceRate}%`,
                sub: `${overview.activeToday} of ${overview.employeeCount} present`,
              },
              {
                icon: <IconMapPin className="w-5 h-5" />,
                label: STRINGS.SITES,
                value: overview.siteCount,
                sub: 'Geofenced locations',
              },
              {
                icon: <IconFlag className="w-5 h-5" />,
                label: STRINGS.FLAGGED_PUNCHES,
                value: overview.flaggedCount,
                sub: 'Awaiting review',
                valueClass: overview.flaggedCount > 0 ? 'text-red-300' : '',
              },
            ]}
          />
        </div>
      )}

      <div>
        <p className="section-label text-earth mb-3">{STRINGS.QUICK_ACTIONS}</p>
        <div className="space-y-2">
          {actions.map((action) => (
            <ActionRow
              key={action.path}
              title={action.title}
              description={action.description}
              icon={action.icon}
              accent={action.accent}
              badge={action.badge}
              onClick={() => navigate(action.path)}
            />
          ))}
        </div>
      </div>

      {tourOpen && (
        <AppTour
          steps={ADMIN_TOUR_STEPS}
          stepIndex={stepIndex}
          onNext={() => goNext(ADMIN_TOUR_STEPS.length)}
          onBack={goBack}
          onSkip={skipTour}
          isLastStep={stepIndex === ADMIN_TOUR_STEPS.length - 1}
        />
      )}
    </AppShell>
  )
}