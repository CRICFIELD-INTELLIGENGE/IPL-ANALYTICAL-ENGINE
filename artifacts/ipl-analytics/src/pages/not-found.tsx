import { CricFieldMascot } from "@/components/CricFieldMascot";
import { Link } from "wouter";


export default function NotFound() {
  return <main className="min-h-screen w-full flex items-center justify-center bg-[#070c16] text-white p-4">
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
      <p className="text-xs font-bold tracking-widest uppercase text-cyan-300">CricField</p>
      <CricFieldMascot activity="not-found" size={64} ariaLabel="CricField mascot looking puzzled: page not found" />
      <h1 className="text-2xl font-bold">404 — Page not found</h1>
      <p className="text-sm text-white/70">This link may have moved or the page is no longer available.</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/home" className="rounded-lg bg-cyan-400 text-black px-4 py-3 font-bold">Return to Home</Link>
        <Link href="/feed" className="rounded-lg border border-white/20 px-4 py-3">Explore Feed</Link>
      </div>
    </div>
  </main>;
}
