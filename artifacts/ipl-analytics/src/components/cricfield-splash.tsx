import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CricfieldLogo } from "./cricfield-logo";
import { MascotBallArtwork } from "./MascotBallArtwork";
import { MASCOT_REACTIONS } from "@/lib/mascot-reactions";
import "./cricfield-splash.css";

const SESSION_KEY = "cricfield-opening-delivery-v1";
let seenInMemory = false;
export const INTRO_DURATION_MS = 2300;
export function eligibleForOpening(path:string, search:string, hash:string) {
  if (!["/", "/home"].includes(path.replace(/\/$/, "") || "/")) return false;
  const query = new URLSearchParams(search);
  return !["code", "token", "access_token", "error", "state"].some(key=>query.has(key)) && !/access_token|refresh_token|type=recovery/.test(hash);
}
function shouldShow() {
 if (typeof window === "undefined" || seenInMemory) return false;
 if (!eligibleForOpening(window.location.pathname, window.location.search, window.location.hash)) return false;
 if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
 try { return sessionStorage.getItem(SESSION_KEY) !== "seen"; } catch { return true; }
}
/** Decorative session introduction. The application mounts concurrently and remains operable. */
export function CricfieldSplash(){
 const [path] = useLocation();
 const [visible,setVisible] = useState(shouldShow);
 const dismiss = ()=>setVisible(false);
 useEffect(()=>{
  if(!visible) return;
  seenInMemory = true;
  try { sessionStorage.setItem(SESSION_KEY,"seen"); } catch { /* Session memory still prevents replay. */ }
  const timer=window.setTimeout(dismiss,INTRO_DURATION_MS);
  const reduce=window.matchMedia("(prefers-reduced-motion: reduce)");
  const onReduce=()=>{if(reduce.matches)dismiss();};
  const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")dismiss();};
  const onVisibility=()=>{if(document.hidden)dismiss();};
  reduce.addEventListener("change",onReduce);
  window.addEventListener("keydown",onKey);
  document.addEventListener("visibilitychange",onVisibility);
  return ()=>{clearTimeout(timer);reduce.removeEventListener("change",onReduce);window.removeEventListener("keydown",onKey);document.removeEventListener("visibilitychange",onVisibility);};
 },[visible]);
 useEffect(()=>{if(!["/","/home"].includes(path))dismiss();},[path]);
 if(!visible)return null;
 return <div className="cf-opening" data-testid="cricfield-splash" onAnimationEnd={e=>{if(e.target===e.currentTarget)dismiss();}}>
   <div className="cf-opening-stage" aria-hidden="true">
    <div className="cf-opening-glow"/>
    <div className="cf-opening-trail"/>
    <div className="cf-opening-delivery"><svg viewBox="0 0 100 100" fill="none"><MascotBallArtwork emoji={MASCOT_REACTIONS.idle} accentColor="var(--accent-primary, #a3e635)"/></svg></div>
    <div className="cf-opening-brand"><CricfieldLogo variant="wordmark" asLink={false} className="cf-opening-logo"/></div>
   </div>
   <button type="button" className="cf-opening-skip" onClick={dismiss}>Skip Intro <span aria-hidden="true">↗</span></button>
 </div>;
}
