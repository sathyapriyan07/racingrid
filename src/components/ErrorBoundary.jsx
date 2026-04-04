import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
          <div className="text-center space-y-4 max-w-md">
            <div className="text-5xl font-black" style={{ color: 'var(--accent)' }}>!</div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Something went wrong</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => this.setState({ hasError: false, error: null })}
                className="btn-primary text-sm">Try Again</button>
              <Link to="/" className="btn-ghost text-sm">Go Home</Link>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
