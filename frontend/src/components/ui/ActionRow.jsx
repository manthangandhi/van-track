import React from 'react'

const ACCENTS = {
  forest: 'bg-forest-600',
  canopy: 'bg-canopy',
  earth: 'bg-earth',
  gold: 'bg-amber-600',
  slate: 'bg-slate-600',
  teal: 'bg-teal-600',
}

export function ActionRow({ title, description, icon, accent = 'forest', onClick, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="action-row group w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border border-forest-100 bg-white hover:border-forest-200 hover:bg-forest-50/40 transition text-left"
    >
      <div
        className={`w-10 h-10 rounded-xl ${ACCENTS[accent] || ACCENTS.forest} flex items-center justify-center text-white shrink-0 shadow-soft`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-forest-900 group-hover:text-forest-800">
          {title}
        </p>
        <p className="text-sm text-earth truncate">{description}</p>
      </div>
      {badge != null && badge > 0 && (
        <span className="min-w-[1.5rem] h-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
          {badge}
        </span>
      )}
      <span className="text-forest-300 group-hover:text-forest-500 text-lg shrink-0">→</span>
    </button>
  )
}