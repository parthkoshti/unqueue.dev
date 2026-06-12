import { Component } from "react";
import type { ReactNode } from "react";
import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  resetKey?: string;
};

type State = {
  error: Error | null;
  resetKey: string | undefined;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: undefined };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) {
      return { error: null, resetKey: props.resetKey };
    }
    return null;
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          reset={this.reset}
        />
      );
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircleIcon className="size-5 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Something went wrong</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          {error.message || "An unexpected error occurred."}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={reset}>
        <RefreshCwIcon className="size-3.5" />
        Try again
      </Button>
    </div>
  );
}

export function SilentErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary fallback={null}>{children}</ErrorBoundary>;
}
