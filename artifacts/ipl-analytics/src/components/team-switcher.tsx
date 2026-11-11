import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Shield, ChevronDown, X } from "lucide-react";
import { useTeamTheme } from "@/lib/team-context";
import "./dugout-drawer.css";

export function TeamSwitcher() {
 const { theme, selectedTeam, allTeams, setSelectedTeam, clearTeam } = useTeamTheme();
 const [open, setOpen] = useState(false);
 const container = useRef<HTMLDivElement>(null);
 const trigger = useRef<HTMLButtonElement>(null);
 const reduceMotion = useReducedMotion();
 const close = () => { setOpen(false); requestAnimationFrame(() => trigger.current?.focus()); };
 useEffect(() => {
  if (!open) return;
  const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
  const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
  document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
  return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
 }, [open]);
 return <div ref={container} className={`franchise-center ${open ? 'is-expanded' : ''}`}>
  <motion.div layout transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 370, damping: 34 }} className="franchise-expander">
   <button ref={trigger} type="button" className="franchise-current" aria-label={`Choose franchise. Current: ${theme?.name ?? 'All cricket'}`} aria-expanded={open} aria-controls="header-franchise-options" onClick={() => setOpen(!open)}>
    {theme ? <img src={theme.logoImg} alt="" /> : <Shield size={18} />}<span>{theme?.shortName ?? 'Franchise'}</span><ChevronDown size={12} className={open ? 'rotate-180' : ''} />
   </button>
   {open && <motion.div id="header-franchise-options" className="franchise-inline-options" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="group" aria-label="Select franchise">
    <div className="franchise-inline-scroll">
     <button type="button" title="All cricket — neutral theme" aria-label="All cricket — neutral theme" aria-pressed={!selectedTeam} onClick={() => { clearTeam(); close(); }}><Shield size={20} /><span>ALL</span></button>
     {allTeams.map(team => <button key={team.id} type="button" title={team.name} aria-label={team.name} aria-pressed={selectedTeam === team.id} style={{ '--crest-accent': team.accent } as CSSProperties} onFocus={event => event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })} onClick={() => { setSelectedTeam(team.id); close(); }}><img src={team.logoImg} alt="" /><span>{team.shortName}</span></button>)}
    </div>
    <button type="button" className="franchise-collapse" aria-label="Collapse franchise selection" onClick={close}><X size={15} /></button>
   </motion.div>}
  </motion.div>
 </div>;
}
