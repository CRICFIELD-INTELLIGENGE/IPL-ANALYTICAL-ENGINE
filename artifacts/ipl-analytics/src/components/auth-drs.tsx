import { CricFieldMascot } from "@/components/CricFieldMascot";
import { useEffect, useState } from "react";

export function DRSBackground({ success = false, onDone }: { success?: boolean; onDone?: () => void }) {
  const [hidden, setHidden] = useState(document.hidden);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => onDone?.(), matchMedia("(prefers-reduced-motion: reduce)").matches ? 100 : 3800);
    return () => clearTimeout(timer);
  }, [success, onDone]);
  return <div className={`drs-scene ${success ? "drs-success" : ""} ${hidden ? "drs-paused" : ""}`}>
    <CricFieldMascot activity={success ? "success" : "login"} size={56} />
    <p className="account-eyebrow">DRS / THE DECISION IS YOURS</p>
    <svg viewBox="0 0 440 340" role="img" aria-label="Cricket ball tracking toward three stumps">
      <g fill="none" stroke="currentColor" strokeWidth="1" opacity=".18"><path d="M40 90H400M40 150H400M40 210H400M40 270H400M90 50V300M170 50V300M250 50V300M330 50V300"/><path d="M65 290L125 70H270L380 290Z"/></g>
      <g fill="none" stroke="currentColor" strokeWidth="2"><path d="M112 248V132H118V248M133 248V132H139V248M154 248V132H160V248M109 127H139M135 127H163"/></g>
      <path className="drs-track" d="M390 90Q300 270 137 185" fill="none" stroke="#B8F35B" strokeWidth="2" strokeDasharray="5 7"/>
      <circle className="drs-ball" r="6" fill="#B8F35B"/><circle className="drs-ring" cx="137" cy="185" r="24" stroke="#B8F35B" fill="none"/>
      <g fill="currentColor" fontSize="10" fontFamily="monospace"><text x="290" y="80">TRACKING</text><text x="85" y="285">IMPACT</text></g>
    </svg>
    {success ? <><div className="drs-decision" role="status"><span>REVIEW IN PROGRESS</span><strong>IDENTITY VERIFIED</strong><b>DECISION: YOU’RE IN!</b></div><div className="drs-logo"><span>CRICFIELD</span><small>GLOBAL INTELLIGENCE</small><p>YOUR INNINGS BEGINS HERE.</p></div><button type="button" className="drs-skip" onClick={onDone}>Skip animation</button></> : <p className="drs-caption">Every angle. Every decision. Your innings.</p>}
  </div>;
}
