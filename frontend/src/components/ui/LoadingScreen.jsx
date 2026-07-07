import React from 'react'
import { BrandMark } from './BrandMark'
import { STRINGS } from '../../utils/strings'

export function LoadingScreen() {
  return (
    <div className="page-shell flex flex-col items-center justify-center gap-4">
      <BrandMark size="md" showTagline />
      <div className="flex items-center gap-2 text-forest-600 text-sm font-medium">
        <span className="w-2 h-2 rounded-full bg-forest-500 animate-pulse" />
        {STRINGS.LOADING}
      </div>
    </div>
  )
}