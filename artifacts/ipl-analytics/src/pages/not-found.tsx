import { CricFieldMascot } from "@/components/CricFieldMascot";
import { Link } from "wouter";
import { Home, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#070c16] text-white p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B1020] p-6 sm:p-8 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black tracking-widest uppercase text-cyan-400 font-mono">
            CricField
          </p>
        </div>
        <CricFieldMascot activity="not-found" size={64} ariaLabel="CricField mascot looking puzzled: page not found" />
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          404 — Page not found
        </h1>
        <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
          This link may have moved or the page is no longer available.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/home"
            className="rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black px-4 py-2.5 font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all inline-flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Home</span>
          </Link>
          <Link
            href="/feed"
            className="rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 font-bold text-xs uppercase tracking-wider transition-all inline-flex items-center gap-1.5 shadow-xs"
          >
            <Compass className="w-3.5 h-3.5 text-white/60" />
            <span>Explore Feed</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
