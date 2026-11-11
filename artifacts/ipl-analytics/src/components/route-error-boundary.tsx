import { Component, type ReactNode } from "react";

export class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="min-h-screen bg-[#070c16] text-white flex items-center justify-center p-6">
      <div role="alert" className="max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <p className="text-xs uppercase tracking-widest text-cyan-300">CricField</p>
        <h1 className="text-2xl font-bold">This page couldn’t load</h1>
        <p className="text-white/70">Please reload to try again, or return to Home.</p>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-lg bg-cyan-400 px-4 py-3 text-black font-bold" onClick={() => window.location.reload()}>Reload page</button>
          <a className="rounded-lg border border-white/20 px-4 py-3" href={`${import.meta.env.BASE_URL}home`}>Return to Home</a>
        </div>
      </div>
    </main>;
  }
}
