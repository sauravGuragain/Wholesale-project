import { Component, type ReactNode, Suspense } from "react";
import { CenteredSpinner } from "./Card";
import { Button } from "./Button";

interface EBProps {
  children: ReactNode;
}
interface EBState {
  hasError: boolean;
}

/** Top-level error boundary so a render error shows a recovery UI, not a blank page. */
export class ErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false };

  static getDerivedStateFromError(): EBState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // In production this is where you'd forward to an error reporter.
    console.error("Render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="font-display text-xl font-bold text-content">Something went wrong</h2>
          <p className="max-w-sm text-sm text-muted">
            An unexpected error occurred while rendering this page. Reloading usually fixes it.
          </p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Suspense wrapper for lazily-loaded route components. */
export function LazyBoundary({ children }: { children: ReactNode }) {
  return <Suspense fallback={<CenteredSpinner label="Loading…" />}>{children}</Suspense>;
}
