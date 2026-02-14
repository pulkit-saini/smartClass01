import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled dashboard error", error, info);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="login-shell">
          <div className="login-card">
            <p className="overline">System Notice</p>
            <h1>Dashboard encountered an unexpected error.</h1>
            <p className="section-hint">
              Please reload the application. If the issue persists, contact state support team.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
