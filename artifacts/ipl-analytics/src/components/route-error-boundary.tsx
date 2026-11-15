import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; error?: Error }> {
  state = {
    failed: false,
    error: undefined as Error | undefined,
  };

  static getDerivedStateFromError(error: Error) {
    return { failed: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("RouteErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="min-h-screen bg-[#070c16] text-white flex items-center justify-center p-6 antialiased">
        <div
          role="alert"
          className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0B1020] p-6 sm:p-8 space-y-4 shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400 font-mono">
                CricField
              </p>
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            This page couldn’t load
          </h1>

          <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
            Please reload to try again, or return to Home.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              className="rounded-xl bg-cyan-400 hover:bg-cyan-300 px-4 py-2.5 text-black font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
              onClick={() => {
                this.setState({ failed: false, error: undefined });
                window.location.reload();
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reload page</span>
            </button>
            <a
              className="rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
              href={`${import.meta.env.BASE_URL}home`}
            >
              <Home className="w-3.5 h-3.5 text-white/60" />
              <span>Return to Home</span>
            </a>
          </div>
        </div>
      </main>
    );
  }
}
