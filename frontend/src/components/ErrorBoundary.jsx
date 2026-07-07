import React from 'react'
import { reportError } from '../utils/errorReporting'
import { STRINGS } from '../utils/strings'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    reportError(error, { componentStack: info.componentStack, type: 'react.boundary' })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-shell flex items-center justify-center p-4">
          <div className="card p-8 max-w-md text-center shadow-elevated">
            <h1 className="display-title text-xl text-red-700 mb-2">{STRINGS.ERROR}</h1>
            <p className="text-earth mb-6">{STRINGS.UNEXPECTED_ERROR}</p>
            <button type="button" onClick={() => window.location.reload()} className="btn-primary">
              {STRINGS.RELOAD_APP}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}