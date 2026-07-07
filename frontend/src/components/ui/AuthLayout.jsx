import React from 'react'
import { BrandMark } from './BrandMark'
import { BRAND } from '../../config/brand'

export function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-forest-hero bg-forest-glow p-10 xl:p-14 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
            <circle cx="320" cy="80" r="120" fill="white" />
            <circle cx="60" cy="340" r="160" fill="white" />
          </svg>
        </div>

        <div className="relative z-10">
          <BrandMark size="lg" showTagline light />
        </div>

        <div className="relative z-10 space-y-6 max-w-md">
          <h2 className="font-display text-3xl xl:text-4xl font-semibold leading-tight">
            Track every field day with confidence
          </h2>
          <p className="text-forest-100 text-lg leading-relaxed">{BRAND.mission}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            {['GPS verified', 'Face match', 'Live admin view'].map((item) => (
              <span
                key={item}
                className="stat-pill bg-white/10 border border-white/20 text-white"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-sm text-forest-200/90">{BRAND.partnerHint}</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10 bg-cream bg-page-texture">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <BrandMark size="md" showTagline />
          </div>

          <div className="card p-8 shadow-elevated">
            {title && (
              <h1 className="display-title text-2xl text-center mb-1">{title}</h1>
            )}
            {subtitle && (
              <p className="text-center text-earth text-sm mb-6">{subtitle}</p>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}