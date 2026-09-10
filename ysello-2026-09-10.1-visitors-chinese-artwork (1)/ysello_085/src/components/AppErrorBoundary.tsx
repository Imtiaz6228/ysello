import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application render failed", {
      message: error.message,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="app-failure" id="main-content">
        <span>Something went wrong</span>
        <h1>This page could not be displayed.</h1>
        <p>
          Your account data has not been changed. Reload the page, or return to
          the marketplace.
        </p>
        <div>
          <button type="button" onClick={() => window.location.reload()}>
            Reload page
          </button>
          <a href="/">Go to marketplace</a>
        </div>
      </main>
    );
  }
}
