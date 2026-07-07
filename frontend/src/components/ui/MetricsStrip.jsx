import React from 'react'

export function MetricsStrip({ items }) {
  return (
    <div className="metrics-strip flex flex-wrap items-stretch divide-x divide-forest-100 border border-forest-100 rounded-xl bg-white overflow-hidden">
      {items.map((item) => (
        <div key={item.label} className="flex-1 min-w-[8rem] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-earth mb-0.5">
            {item.label}
          </p>
          <p className={`text-sm font-semibold text-forest-900 ${item.accent || ''}`}>{item.value}</p>
          {item.hint && <p className="text-xs text-earth mt-0.5">{item.hint}</p>}
        </div>
      ))}
    </div>
  )
}