// /scout presentation for phase 1: Pressure Intelligence. The cinematic Scout Lab (pages/scout-home.tsx) is kept
// intact for the full Scout Lab restoration; it is simply not mounted here.
import { useEffect } from "react";
import { Layout } from "@/components/layout";
import { PressureIntelligence } from "@/components/pressure-intel/pressure-intelligence";

export default function PressureIntelligencePage() {
  useEffect(() => { document.title = "Pressure Intelligence · CricField"; }, []);
  return (
    <Layout>
      <div className="min-h-[calc(100vh-56px)] bg-[#040812] text-slate-100">
        <PressureIntelligence />
      </div>
    </Layout>
  );
}
