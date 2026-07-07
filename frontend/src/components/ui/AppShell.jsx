import React from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from './BrandMark'
import { STRINGS } from '../../utils/strings'

export function AppShell({
  title,
  subtitle,
  onBack,
  backTo,
  headerActions,
  children,
  maxWidth = 'max-w-7xl',
  showBrand = false,
}) {
  const navigate = useNavigate()

  function handleBack() {
    if (onBack) onBack()
    else if (backTo) navigate(backTo)
  }

  return (
    <div className="page-shell">
      <header className="sticky top-0 z-40 border-b border-forest-100/80 bg-white/85 backdrop-blur-xl">
        <div className={`${maxWidth} mx-auto px-4 py-3.5 flex justify-between items-center gap-4`}>
          <div className="flex items-center gap-4 min-w-0">
            {(onBack || backTo) && (
              <button type="button" onClick={handleBack} className="btn-ghost shrink-0 -ml-2">
                ← {STRINGS.BACK}
              </button>
            )}
            {showBrand ? (
              <BrandMark size="sm" showTagline />
            ) : (
              <div className="min-w-0">
                <h1 className="display-title text-xl truncate">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-earth truncate">{subtitle}</p>
                )}
              </div>
            )}
          </div>
          {headerActions && <div className="flex items-center gap-2 shrink-0">{headerActions}</div>}
        </div>
      </header>

      <main className={`${maxWidth} mx-auto px-4 py-6`}>{children}</main>
    </div>
  )
}