import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home, Sun, Moon } from "lucide-react";

export class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; isDark: boolean }> {
  state = {
    failed: false,
    isDark: typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : true,
  };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  toggleTheme = () => {
    const nextDark = !this.state.isDark;
    this.setState({ isDark: nextDark });
    if (typeof document !== "undefined") {
      if (nextDark) {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
        try {
          localStorage.setItem("cricfield-theme", "dark");
        } catch {}
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
        try {
          localStorage.setItem("cricfield-theme", "light");
        } catch {}
      }
    }
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#070c16] text-slate-900 dark:text-white flex items-center justify-center p-6 transition-colors">
        <div
          role="alert"
          className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1020] p-6 sm:p-8 space-y-4 shadow-xl dark:shadow-2xl transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-400 font-mono">
                CricField
              </p>
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>

            <button
              onClick={this.toggleTheme}
              aria-label="Toggle theme"
              title={this.state.isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="w-8 h-8 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-amber-300 transition-colors cursor-pointer"
            >
              {this.state.isDark ? (
                <Moon className="w-4 h-4 text-amber-300" />
              ) : (
                <Sun className="w-4 h-4 text-amber-600" />
              )}
            </button>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            This page couldn’t load
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70 leading-relaxed">
            Please reload to try again, or return to Home.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              className="rounded-xl bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-400 dark:hover:bg-cyan-300 px-4 py-2.5 text-white dark:text-black font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
              onClick={() => window.location.reload()}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reload page</span>
            </button>
            <a
              className="rounded-xl border border-slate-300 dark:border-white/20 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 px-4 py-2.5 text-slate-800 dark:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
              href={`${import.meta.env.BASE_URL}home`}
            >
              <Home className="w-3.5 h-3.5 text-slate-500 dark:text-white/60" />
              <span>Return to Home</span>
            </a>
          </div>
        </div>
      </main>
    );
  }
}
