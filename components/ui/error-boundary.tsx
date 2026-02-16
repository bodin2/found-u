"use client";

import { Component, type ReactNode } from "react";
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
    return { hasError: true, error };
  }

  async componentDidCatch(error: Error, errorInfo: any) {
    console.error("Error caught by boundary:", error, errorInfo);
    
    // Log the error to Firestore
    try {
      const errorId = await logClientError(
        error,
        { componentStack: errorInfo?.componentStack },
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
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              เกิดข้อผิดพลาด
            </h2>

            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              เราขออภัยในความไม่สะดวก กรุณาลองใหม่อีกครั้ง
            </p>

            {this.state.error && (
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-6 text-left">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorId && (
                  <p className="text-xs text-gray-500 mt-2">
                    Error ID: {this.state.errorId}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-[#06C755] text-white rounded-full font-medium hover:bg-[#05b34d] transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              ลองใหม่
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
