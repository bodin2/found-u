"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { logClientError } from "@/lib/logger";

interface Props {
  children: ReactNode;
  userId?: string;
  userEmail?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorId: null };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);

    try {
      const errorId = await logClientError(
        error,
        { componentStack: errorInfo?.componentStack ?? undefined },
        this.props.userId,
        this.props.userEmail
      );
      if (errorId) {
        this.setState({ errorId });
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorId: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message?.trim() || "ไม่ทราบสาเหตุ";

      return (
        <div
          className="min-h-screen flex items-center justify-center bg-bg-secondary px-4"
          role="alert"
        >
          <div className="max-w-md w-full bg-bg-card border border-border-light rounded-2xl p-8 text-center min-w-0">
            <div
              className="w-16 h-16 rounded-full bg-status-error-light flex items-center justify-center mx-auto mb-4"
              aria-hidden
            >
              <AlertCircle className="w-8 h-8 text-status-error" />
            </div>

            <h2 className="text-xl font-semibold text-text-primary mb-2 text-balance">
              เกิดข้อผิดพลาด
            </h2>

            <p className="text-text-secondary text-sm mb-6 text-pretty">
              เราขออภัยในความไม่สะดวก กรุณาลองใหม่อีกครั้ง
              {this.state.errorId
                ? " หากปัญหายังคงอยู่ แจ้งรหัสด้านล่างให้ผู้ดูแลระบบ"
                : null}
            </p>

            <div className="bg-bg-tertiary rounded-xl p-3 mb-6 text-left min-w-0">
              <p className="text-xs text-text-secondary font-mono break-all">{message}</p>
              {this.state.errorId ? (
                <p className="text-xs text-text-secondary mt-2 break-all">
                  รหัสข้อผิดพลาด: {this.state.errorId}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={this.handleReset}
              className="w-full min-h-11 py-3 bg-line-green-cta text-white rounded-full font-medium hover:bg-line-green-cta-hover transition-colors flex items-center justify-center gap-2 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/40 focus-visible:ring-offset-2"
            >
              <RefreshCw className="w-4 h-4" aria-hidden />
              ลองอีกครั้ง
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
