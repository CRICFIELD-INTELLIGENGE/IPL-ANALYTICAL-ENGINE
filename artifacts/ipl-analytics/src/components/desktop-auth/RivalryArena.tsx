import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Trophy } from 'lucide-react';
import CricFieldLogo from '@/components/CricFieldLogo';
import { CricFieldMascot } from '@/components/CricFieldMascot';
import { TEAM_REGISTRY, useTeamTheme } from '@/lib/team-context';
import type { MascotEmoji } from '@/lib/mascot-reactions';
import {authPalette} from './auth-palette';
import type { AuthResult } from './use-desktop-auth';
export type FormInteraction = 'email' | 'typing' | 'password' | 'peek' | 'signup' | null;
type ArenaPhase = 'rivalry'|'interacting'|'travelling'|'loading'|'returning'|'success'|'error';
const faces: readonly [MascotEmoji,MascotEmoji][]=[['🤨','😏'],['😤','😎'],['😠','😉'],['😲','😵‍💫'],['😂','😁']];
function pose(emoji:MascotEmoji){
 if(['😲','😳','😯','🤯','😟','🥺'].includes(emoji))return '50% 0%';
 if(['😂','🥳','🤩','😃','🥰','😊'].includes(emoji))return '100% 0%';
 if(['🤔','🧐','🤨','🤓','😤'].includes(emoji))return '0% 100%';
 if(['😉','😏','😜','🤭'].includes(emoji))return '50% 100%';
 if(['🫣','😌','😴','😵‍💫'].includes(emoji))return '100% 100%';
 return '0% 0%';
}
const cuts=[2000,4000,7000,10000,12000];
export function RivalryArena({pending,result,interaction,onComplete}:{pending:string|null;result:AuthResult;interaction:FormInteraction;onComplete:()=>void}) {
 const {selectedTeam}=useTeamTheme();const {team:primary,rival}=authPalette(selectedTeam);
 const [scene,setScene]=useState(0),[hidden,setHidden]=useState(document.hidden),[phase,setPhase]=useState<ArenaPhase>('rivalry');
 const secondaryActor=useRef<HTMLDivElement>(null),arena=useRef<HTMLDivElement>(null);
 const actor=useRef<HTMLDivElement>(null),ball=useRef<HTMLDivElement>(null),target=useRef<HTMLDivElement>(null),move=useRef<Animation|null>(null);
 const clock=useRef(0), sceneRef=useRef(0);
 useEffect(()=>{
  const measure=()=>{const floor=arena.current,a=actor.current,b=secondaryActor.current,trophy=document.querySelector('.auth-trophy-frame-art');if(!floor||!a||!b||!trophy)return;const scale=floor.getBoundingClientRect().width/floor.offsetWidth||1;const x=a.getBoundingClientRect(),y=b.getBoundingClientRect(),t=trophy.getBoundingClientRect();const center=t.x+t.width/2;
   const compact=document.querySelector('.auth-desktop')?.getAttribute('data-layout')==='compact';
   floor.style.setProperty('--auth-approach-primary',`${compact?4:Math.max(0,(center-t.width*.375-x.x-x.width*.94)/scale)}px`);
   floor.style.setProperty('--auth-approach-secondary',`${compact?4:Math.max(0,(y.x+y.width*.06-center-t.width*.375)/scale)}px`);
  };
  measure();const observer=new ResizeObserver(measure);if(arena.current)observer.observe(arena.current);addEventListener('resize',measure);return()=>{observer.disconnect();removeEventListener('resize',measure);};
 },[]);

 const paused=hidden||Boolean(pending)||Boolean(interaction)||phase==='returning'||phase==='success'||phase==='error';
 useEffect(()=>{const change=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',change);return()=>document.removeEventListener('visibilitychange',change);},[]);
 useEffect(()=>{
  if(paused)return;let last=performance.now();
  const timer=setInterval(()=>{const now=performance.now();clock.current=(clock.current+now-last)%12000;last=now;const next=cuts.findIndex(c=>clock.current<c);if(next!==sceneRef.current){sceneRef.current=next;setScene(next);}},100);
  return()=>clearInterval(timer);
 },[paused]);
 const settledResult=pending?null:result;
 useEffect(()=>{
  let alive=true;let celebrate:ReturnType<typeof setTimeout>|undefined;
  const settle=()=>{if(!alive)return;const next=result==='success'?'success':result==='error'?'error':'rivalry';setPhase(next);if(next==='success')celebrate=setTimeout(onComplete,matchMedia('(prefers-reduced-motion: reduce)').matches?150:1800);if(next==='error')celebrate=setTimeout(()=>{if(alive)setPhase('rivalry');},1800);};
  if(pending){
   setPhase('travelling');
   const rect=ball.current?.getBoundingClientRect(),goal=target.current?.getBoundingClientRect();
   if(rect&&goal&&actor.current){
    const parent=actor.current.parentElement!;
    const scale=parent.getBoundingClientRect().width/parent.offsetWidth || 1;
    const dx=(goal.x+goal.width/2-(rect.x+rect.width/2))/scale,dy=(goal.y+goal.height/2-(rect.y+rect.height/2))/scale;
    move.current?.cancel();
    move.current=actor.current.animate([{transform:'translate(0,0)'},{transform:`translate(${dx*.55}px,${dy*.35-70}px)`,offset:.55},{transform:`translate(${dx}px,${dy}px)`}],{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:700,easing:'cubic-bezier(.22,.7,.26,1)',fill:'forwards'});
    void move.current.finished.then(()=>{if(alive)setPhase('loading');}).catch(()=>{});
   }else setPhase('loading');
  }else if(move.current){
   setPhase('returning');const animation=move.current;animation.reverse();
   void animation.finished.then(()=>{animation.cancel();if(move.current===animation)move.current=null;settle();}).catch(()=>{});
  }else settle();
  return()=>{alive=false;clearTimeout(celebrate);};
 },[pending,settledResult,onComplete]);
 useEffect(()=>()=>move.current?.cancel(),[]);
 useEffect(()=>{if(!pending)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[pending]);
 let pair=faces[scene];
 if(phase==='success')pair=['🥳','🤩'];else if(phase==='error')pair=['😲','🥺'];else if(pending)pair=['🤔','🥹'];else if(interaction==='password')pair=['🫣','😉'];else if(interaction==='peek')pair=['😳','🤭'];else if(interaction==='typing')pair=['🧐','🤔'];else if(interaction==='email')pair=['😉','😊'];else if(interaction==='signup')pair=['🥰','😃'];
 const traveling=phase==='travelling'||phase==='loading'||phase==='returning';
 return <section className="auth-arena" data-phase={phase==='rivalry'&&interaction?'interacting':phase} data-hidden={hidden||undefined} data-paused={paused||undefined} data-scene={scene} aria-label={`${primary} and ${rival} cricket mascot rivalry`}>
  <div className="auth-arena-brand"><CricFieldLogo variant="wordmark" className="auth-wordmark"/></div>
  <div className="auth-arena-copy"><span className="auth-kicker">TWO RIVALS. ONE GAME. YOUR DUGOUT.</span><h2>Two Rivals.<br/><em>One Game.</em></h2><p>Your cricket universe is waiting. ♡</p></div>
  <div className="auth-handwritten-note auth-note-left">Different Teams.<br/>Same Love for Cricket. ♡</div>
  <div className="auth-handwritten-note auth-note-right">Cricket Brings<br/>People Together ♡<svg viewBox="0 0 100 20" fill="none" aria-hidden="true"><path d="M4 15 Q40 -2 95 6 M18 18 Q58 3 91 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div>
  <svg className="auth-crown-doodle" viewBox="0 0 50 40" fill="none" aria-hidden="true"><path d="M5 12 L14 21 L23 4 L32 21 L44 10 L37 31 L11 31Z M13 37 Q25 33 35 37" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  <div ref={arena} className="auth-mini-arena">
   <div className="auth-stadium-stands" aria-hidden="true"><i/><i/><i/><div className="auth-team-pennant auth-pennant-primary"><img src={TEAM_REGISTRY[primary].logoImg} alt=""/></div><div className="auth-team-pennant auth-pennant-rival"><img src={TEAM_REGISTRY[rival].logoImg} alt=""/></div></div>
   <div className="auth-floodlight auth-floodlight-left"/><div className="auth-floodlight auth-floodlight-right"/>
   <div className="auth-ground"><div className="auth-ground-inner"/><div className="auth-mini-pitch"><i/><i/></div></div>
   <div className="auth-dust auth-dust-one"/><div className="auth-dust auth-dust-two"/>
   <div ref={actor} className={`auth-actor-travel ${traveling?'is-travelling':''}`} style={{'--rival-color':'var(--accent-primary)'} as CSSProperties}>
    <div ref={ball} className="auth-rival-track auth-rival-primary"><div className="auth-actor-ball auth-cinematic-ball auth-primary-ball"><div key={pair[0]} className="auth-mascot-leather" style={{'--auth-pose-position':pose(pair[0])} as CSSProperties} data-rendered-pose={pair[0]} aria-hidden="true"/><CricFieldMascot team={primary} emoji={pair[0]} size={120} ariaLabel={`${primary} rival mascot`}/><span className="auth-mascot-teamname">{primary}</span><svg className="auth-mascot-hand" viewBox="0 0 100 80" aria-hidden="true"><path d="M3 47 Q9 30 25 32 Q22 10 36 11 Q48 8 51 24 Q56 8 67 15 L72 30 Q83 22 89 33 Q99 47 86 62 Q70 77 48 68 L23 66 Q7 65 3 47Z" fill="var(--auth-ball-color)" stroke="color-mix(in srgb,var(--auth-ball-color) 65%,#000)" strokeWidth="2"/><path d="M28 34 Q42 22 50 39 M51 25 L57 40 M72 30 L73 43" fill="none" stroke="#fff6" strokeWidth="3" strokeLinecap="round"/></svg><i className="auth-mascot-gloss"/></div></div><div className="auth-ground-contact auth-ground-contact-primary" aria-hidden="true"/>
   </div>
   <div ref={secondaryActor} className="auth-actor-secondary"><div className="auth-rival-track auth-rival-secondary"><div className="auth-actor-ball auth-cinematic-ball auth-secondary-ball"><div key={pair[1]} className="auth-mascot-leather" style={{'--auth-pose-position':pose(pair[1])} as CSSProperties} data-rendered-pose={pair[1]} aria-hidden="true"/><CricFieldMascot team={rival} emoji={pair[1]} size={120} ariaLabel={`${rival} rival mascot`}/><span className="auth-mascot-teamname">{rival}</span><svg className="auth-mascot-hand" viewBox="0 0 100 80" aria-hidden="true"><path d="M3 47 Q9 30 25 32 Q22 10 36 11 Q48 8 51 24 Q56 8 67 15 L72 30 Q83 22 89 33 Q99 47 86 62 Q70 77 48 68 L23 66 Q7 65 3 47Z" fill="var(--auth-ball-color)" stroke="color-mix(in srgb,var(--auth-ball-color) 65%,#000)" strokeWidth="2"/><path d="M28 34 Q42 22 50 39 M51 25 L57 40 M72 30 L73 43" fill="none" stroke="#fff6" strokeWidth="3" strokeLinecap="round"/></svg><i className="auth-mascot-gloss"/></div></div><div className="auth-ground-contact auth-ground-contact-secondary" aria-hidden="true"/></div>
   <div className="auth-mini-trophy"><Trophy size={50} strokeWidth={1.5}/><span>ONE GAME</span></div>
   <div className="auth-rival-labels"><span>{primary}<i>THE CHALLENGER</i></span><b>VS</b><span>{rival}<i>THE RIVAL</i></span></div>
  </div>
  <div className="auth-arena-bottom"><span><i/> A LITTLE RIVALRY. A LOT OF CRICKET.</span><span>YOUR INNINGS AWAITS ↗</span></div>
  <div ref={target} className="auth-loading-target" aria-hidden="true"/>
  {traveling&&<div className="auth-travel-scrim" aria-hidden="true"/>}
  {(pending||traveling)&&<div className="auth-loading-caption" role="status" aria-live="polite"><span className="auth-loading-orbit"/><strong>{pending==='google'||pending==='apple'?'OPENING SECURE SIGN-IN…':pending==='forgot'?'SENDING RESET LINK…':pending==='magic'?'SENDING SIGN-IN LINK…':'LOADING INTELLIGENCE…'}</strong><p>{pending==='google'||pending==='apple'?'Continue with your provider.':'Preparing your Dugout.'}</p></div>}
  {phase==='success'&&<div className="auth-arena-success" role="status">You're In!<span>Welcome to Your Dugout.</span></div>}
 </section>;
}
