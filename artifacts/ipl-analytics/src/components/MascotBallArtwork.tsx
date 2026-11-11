import { useEffect, useState } from 'react';
import { MascotFace } from './MascotFace';
import { MASCOT_REACTIONS, type MascotActivity, type MascotEmoji } from '@/lib/mascot-reactions';

const SEQUENCES: Partial<Record<MascotActivity, readonly MascotEmoji[]>> = {
 idle: ['🙂','😊','😉'], loading: ['🤔','😯','🤓','😉'], analyzing: ['🧐','😯','🤔','🤓'],
 searching: ['🧐','🤔','🤨'], login: ['😉','😊','😃'], authenticating: ['🫣','🤔','🥹'],
 success: ['🥳','😁','🤩'], error: ['😟','🥺','😕'], 'not-found': ['😕','🤔','🥺'],
 saving: ['🤔','😯','😉'], saved: ['😁','🥳','😉'], warning: ['🤨','😯','🤔'],
 offline: ['😶‍🌫️','😕','🥺'], wicket: ['🤯','😲','🥳'], six: ['🤩','😲','😁'], boundary: ['😎','😁','😉'], dot: ['😌','🤔','😉'],
 empty: ['🥺','😕','🙂'], analyst: ['🤓','🧐','😌'], commentary: ['😃','😎','🤔'],
};
/** Every instance owns its timer; activity changes reset immediately; explicit emoji stays selected. */
export function useMascotExpression(activity?: MascotActivity, emoji?: MascotEmoji): MascotEmoji {
 const sequence = SEQUENCES[activity ?? 'idle'] ?? [MASCOT_REACTIONS[activity ?? 'idle']];
 const key = `${activity ?? 'idle'}:${emoji ?? ''}`;
 const [frame, setFrame] = useState({ key, index: 0 });
 useEffect(() => {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer: ReturnType<typeof setInterval> | undefined;
  const restart = () => {
   clearInterval(timer);
   setFrame({key, index:0});
   if (!emoji && !motion.matches && sequence.length > 1) timer = setInterval(() => setFrame(f => ({key,index:(f.index+1)%sequence.length})),1100);
  };
  restart(); motion.addEventListener('change',restart);
  return () => { clearInterval(timer); motion.removeEventListener('change',restart); };
 }, [key]);
 return emoji ?? sequence[frame.key === key ? frame.index % sequence.length : 0];
}
/** The exact same silhouette, white outline and diagonal stitching as the ball on C. */
export function MascotBallArtwork({emoji, accentColor}: {emoji: MascotEmoji; accentColor: string}) {
 return <g data-cricfield-mascot="logo-ball">
  <circle cx="50" cy="50" r="46" fill={accentColor} stroke="white" strokeWidth="4" />
  <path d="M18 24 Q57 47 81 79" stroke="white" strokeWidth="2.5" strokeDasharray="4 3" fill="none" />
  <g className="cf-face-motion"><g key={emoji} className="cf-face-change"><MascotFace emoji={emoji}/></g></g>
 </g>;
}
