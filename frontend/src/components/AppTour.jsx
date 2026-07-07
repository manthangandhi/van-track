import React from 'react'
import { STRINGS } from '../utils/strings'
import { BRAND } from '../config/brand'

export function AppTour({ steps, stepIndex, onNext, onBack, onSkip, isLastStep }) {
  if (!steps?.length) return null

  const step = steps[stepIndex]
  const progress = ((stepIndex + 1) / steps.length) * 100

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-tour-title"
    >
      <div className="absolute inset-0 bg-forest-950/40 backdrop-blur-sm" aria-hidden />

      <div className="relative w-full max-w-lg card shadow-elevated overflow-hidden">
        <div className="h-1 bg-forest-100">
          <div
            className="h-full bg-forest-600 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 mb-5">
            <p className="text-xs font-medium text-forest-600">
              {STRINGS.TOUR_STEP_OF.replace('{current}', stepIndex + 1).replace(
                '{total}',
                steps.length
              )}
            </p>
            <button
              type="button"
              onClick={onSkip}
              className="text-sm font-medium text-earth hover:text-forest-800 transition"
            >
              {STRINGS.TOUR_SKIP}
            </button>
          </div>

          <p className="text-xs font-medium text-forest-500 mb-1">{BRAND.name}</p>
          <h2 id="app-tour-title" className="display-title text-xl sm:text-2xl mb-3">
            {step.title}
          </h2>
          <p className="text-earth text-[15px] leading-relaxed mb-6">{step.body}</p>

          <div className="flex items-center justify-center gap-1.5 mb-6">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === stepIndex ? 'w-6 bg-forest-600' : 'w-1.5 bg-forest-200'
                }`}
                aria-hidden
              />
            ))}
          </div>

          <div className="flex gap-3">
            {stepIndex > 0 ? (
              <button type="button" onClick={onBack} className="btn-secondary flex-1 py-3">
                {STRINGS.PREVIOUS}
              </button>
            ) : (
              <div className="flex-1" />
            )}
            <button type="button" onClick={onNext} className="btn-primary flex-1 py-3">
              {isLastStep ? STRINGS.TOUR_GET_STARTED : STRINGS.NEXT}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}