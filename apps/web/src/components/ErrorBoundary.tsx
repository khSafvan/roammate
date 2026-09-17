import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal, Trash2 } from 'lucide-react';


interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MojoLog Uncaught Application Error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.href = '/';
  };

  private handleResetStorage = () => {
    if (confirm('Clear local vault session & itinerary cache and reload?')) {
      localStorage.clear();
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-screen-container">
          <div className="error-card">
            <div className="error-badge-icon">
              <AlertTriangle size={36} className="text-rose" />
            </div>

            <h2 className="error-title">Application Error Encountered</h2>
            <p className="error-description">
              MojoLog encountered an unexpected error while rendering this view. Your cryptographic vault and data are safe.
            </p>

            <div className="error-actions-group">
              <button className="primary-brand-btn" onClick={this.handleReload}>
                <RefreshCw size={15} />
                <span>Reload Itinerary</span>
              </button>

              <button className="secondary-action-btn" onClick={this.handleResetStorage}>
                <Trash2 size={15} />
                <span>Reset Local Cache</span>
              </button>

              <button
                className="ghost-action-btn"
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
              >
                <Terminal size={15} />
                <span>{this.state.showDetails ? 'Hide Details' : 'Show Error Details'}</span>
              </button>
            </div>

            {this.state.showDetails && (
              <div className="error-details-box">
                <div className="error-message-line">
                  <strong>Error:</strong> {this.state.error?.message || 'Unknown error'}
                </div>
                {this.state.error?.stack && (
                  <pre className="error-stack-trace">{this.state.error.stack}</pre>
                )}
                {this.state.errorInfo?.componentStack && (
                  <pre className="error-stack-trace">{this.state.errorInfo.componentStack}</pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
