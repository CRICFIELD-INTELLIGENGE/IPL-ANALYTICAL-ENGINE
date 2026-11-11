import { Zap } from "lucide-react";
import { Layout } from "@/components/layout";
import { ModuleHeader } from "@/components/decision/module-shell";
import { PlayingXiPanel } from "@/components/decision/playing-xi-panel";

export default function PlayingXiPage() {
  return (
    <Layout hideRightPanel>
      <div className="space-y-6 pb-16 max-w-5xl mx-auto w-full min-w-0">
        <ModuleHeader phase="Phase 1 · Squad" title="Build Playing XI" tagline="Optimize balance, venue roles and phase depth: 11 players, at most 4 overseas, at least 1 keeper and 20 overs of bowling." icon={<Zap className="w-5 h-5 text-blue-400" />} />
        <PlayingXiPanel />
      </div>
    </Layout>
  );
}
