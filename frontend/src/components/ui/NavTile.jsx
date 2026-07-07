import React from 'react'

const ACCENTS = {
  forest: 'from-forest-600 to-forest-800',
  canopy: 'from-canopy to-forest-700',
  earth: 'from-earth to-forest-900',
  gold: 'from-amber-600 to-amber-800',
  slate: 'from-slate-600 to-slate-800',
  teal: 'from-teal-600 to-forest-700',
}

export function NavTile({ title, description, icon, accent = 'forest', onClick, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card group text-left p-6 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-300 w-full relative"
    >
      {badge != null && badge > 0 && (
        <span className="absolute top-4 right-4 min-w-[1.5rem] h-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
      <div
        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${ACCENTS[accent] || ACCENTS.forest} flex items-center justify-center text-white mb-4 shadow-soft group-hover:scale-105 transition-transform`}
      >
        {icon}
      </div>
      <h3 className="font-display font-semibold text-lg text-forest-900 mb-1">{title}</h3>
      <p className="text-sm text-earth leading-relaxed">{description}</p>
    </button>
  )
}