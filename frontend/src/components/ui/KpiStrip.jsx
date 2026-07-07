import React from 'react'

export function KpiStrip({ items }) {
  return (
    <div className="kpi-strip rounded-2xl overflow-hidden bg-gradient-to-br from-forest-900 via-forest-800 to-forest-700 text-white shadow-elevated">
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/10">
        {items.map((item) => (
          <div key={item.label} className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex items-start gap-3">
              {item.icon && (
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-forest-100">
                  {item.icon}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-forest-200/90 mb-1">
                  {item.label}
                </p>
                <p className={`text-2xl sm:text-3xl font-display font-bold leading-none ${item.valueClass || ''}`}>
                  {item.value}
                </p>
                {item.sub && (
                  <p className="text-xs text-forest-200/80 mt-1.5 truncate">{item.sub}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}