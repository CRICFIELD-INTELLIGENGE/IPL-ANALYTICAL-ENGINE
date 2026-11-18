// /scout presentation for phase 1: Pressure Intelligence. The cinematic Scout Lab (pages/scout-home.tsx) is kept
// intact for the full Scout Lab restoration; it is simply not mounted here.
import { useEffect } from "react";
import { Layout } from "@/components/layout";
import { PressureIntelligence } from "@/components/pressure-intel/pressure-intelligence";

export default function PressureIntelligencePage() {
  useEffect(() => { document.title = "Pressure Intelligence · CricField"; }, []);
  return (
    <Layout>
      <div className="min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-[#050B11] text-slate-900 dark:text-[#EFF5F7]">
        <PressureIntelligence />
      </div>
    </Layout>
  );
}
