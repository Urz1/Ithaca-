"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Optional fallback component to render on error */
  fallback?: ReactNode;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

const MAX_RETRIES = 3;

/**
 * Error Boundary specifically designed for the graph canvas.
 * Handles WebGL crashes, Sigma.js errors, and other rendering issues gracefully.
 */
export class CanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error for debugging (in development)
    if (process.env.NODE_ENV === "development") {
      console.error("[CanvasErrorBoundary] Caught error:", error);
      console.error(
        "[CanvasErrorBoundary] Component stack:",
        errorInfo.componentStack,
      );
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    const { retryCount } = this.state;

    if (retryCount < MAX_RETRIES) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
      });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  isWebGLError(): boolean {
    const { error } = this.state;
    if (!error) return false;

    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes("webgl") ||
      errorMessage.includes("canvas") ||
      errorMessage.includes("sigma") ||
      errorMessage.includes("gl_") ||
      errorMessage.includes("shader")
    );
  }

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Custom fallback provided
      if (fallback) {
        return fallback;
      }

      const isWebGL = this.isWebGLError();
      const canRetry = retryCount < MAX_RETRIES;

      return (
        <div className="bg-background/95 flex h-full w-full items-center justify-center backdrop-blur-sm">
          <div className="bg-card max-w-md rounded-lg border p-6 shadow-lg">
            <div className="text-destructive flex items-center gap-3">
              <AlertTriangle className="h-6 w-6" />
              <h2 className="text-lg font-semibold">
                {isWebGL ? "Graph Rendering Error" : "Something Went Wrong"}
              </h2>
            </div>

            <p className="text-muted-foreground mt-3 text-sm">
              {isWebGL
                ? "The graph visualization encountered a rendering issue. This may be due to WebGL compatibility or memory constraints."
                : "An unexpected error occurred while rendering the graph canvas."}
            </p>

            {process.env.NODE_ENV === "development" && error && (
              <details className="bg-muted/50 mt-4 rounded border p-3 text-xs">
                <summary className="flex cursor-pointer items-center gap-2 font-medium">
                  <Bug className="h-3 w-3" />
                  Error Details
                </summary>
                <pre className="text-destructive mt-2 overflow-auto whitespace-pre-wrap">
                  {error.message}
                </pre>
              </details>
            )}

            <div className="mt-6 flex gap-3">
              {canRetry && (
                <Button
                  variant="default"
                  onClick={this.handleRetry}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retry ({MAX_RETRIES - retryCount} left)
                </Button>
              )}
              <Button
                variant={canRetry ? "outline" : "default"}
                onClick={this.handleReload}
              >
                Reload Page
              </Button>
            </div>

            {isWebGL && (
              <p className="text-muted-foreground mt-4 text-xs">
                Tip: Try using a different browser or enabling hardware
                acceleration in your browser settings.
              </p>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

export default CanvasErrorBoundary;
