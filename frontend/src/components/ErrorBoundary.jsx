/**
 * Error Boundary — catches render errors so a single component failure
 * never blanks the entire app. Shows a themed fallback with retry.
 */

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
          <div
            style={{
              background: 'var(--glass-bg-2)',
              backdropFilter: 'blur(var(--glass-blur-2))',
              border: '1px solid rgba(226,59,59,0.3)',
              borderTop: '1px solid var(--glass-highlight)',
              boxShadow: 'var(--elevation-shadow-1)',
              borderRadius: '2px',
              padding: '32px',
              maxWidth: '400px',
              textAlign: 'center',
            }}
          >
            <div className="text-3xl mb-3">⚠</div>
            <h2 className="font-mono text-lg mb-2" style={{ color: 'var(--status-danger)' }}>
              Component Error
            </h2>
            <p className="text-xs mb-4 font-mono" style={{ color: 'var(--ink-muted)' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button onClick={this.handleReset} className="btn-primary text-xs">
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
