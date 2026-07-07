import React from 'react'
import { BRAND } from '../../config/brand'
import { VanTrackLogo } from './Icons'

export function BrandMark({ size = 'md', showTagline = false, light = false }) {
  const sizes = {
    sm: { icon: 'w-9 h-9', title: 'text-lg', tag: 'text-xs' },
    md: { icon: 'w-11 h-11', title: 'text-xl', tag: 'text-sm' },
    lg: { icon: 'w-14 h-14', title: 'text-2xl', tag: 'text-sm' },
  }
  const s = sizes[size] || sizes.md
  const titleClass = light ? 'text-white' : 'text-forest-900'
  const tagClass = light ? 'text-forest-200' : 'text-earth'

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${s.icon} rounded-2xl shadow-soft shrink-0 overflow-hidden ring-1 ring-forest-900/10`}
        aria-hidden
      >
        <VanTrackLogo className="w-full h-full" />
      </div>
      <div>
        <p className={`${s.title} font-display font-bold ${titleClass} leading-tight tracking-tight`}>
          {BRAND.name}
        </p>
        {showTagline && (
          <p className={`${s.tag} ${tagClass} font-medium`}>{BRAND.tagline}</p>
        )}
      </div>
    </div>
  )
}