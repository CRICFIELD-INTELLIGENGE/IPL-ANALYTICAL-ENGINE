import type { MascotEmoji } from '@/lib/mascot-reactions';
import './mascot-face.css';

/** Vector facial features only: the franchise-colored ball and seam stay visible. */
export function MascotFace({ emoji }: { emoji: MascotEmoji }) {
 const has = (list: string) => list.split('|').includes(emoji);
 const closed = has('😄|😆|😂|🤣|☺️|😊|😇|😌|😙|😚|😝|😣|😖|😫|😩|😭|😑|😴|😪');
 const sad = has('🥲|😞|😔|😟|😕|🙁|☹️|😣|😖|😫|😩|🥺|😢|😭|😨|😰|😥|😓|🤒|🤕');
 const angry = has('😤|😠|😡|🤬');
 const heart = has('😍|🥰|😘');
 const star = has('🤩|🥳');
 const wink = has('😉|😜|😏');
 const tongue = has('😋|😛|😝|😜|🤪|🥵|🥴');
 const round = has('😳|😱|😯|😦|😧|😮|😲|🤯|🫨|🥱');
 const neutral = has('😶|😶‍🌫️|😐|😑|🤐|🫥|🤥|🙂‍↔️|😒|🧐|🤨|🤔|🫪|🫩');
 const tear = has('😂|🤣|🥲|🥹|🥺|😢|😭|😰|😥');
 const sweat = has('😅|🥵|😰|😓|😨');
 const glasses = has('🤓|😎|🥸|🧐');
 const dizzy = has('😵|😵‍💫|🥴|🫨');
 const accessory = has('🫣|🫡|🤔|🫢|🤭|🤫|🤧|🤒|🤕|🤠|🥳|🤯|😮‍💨|😤|😶‍🌫️|😷|🤬|🥶|🤮|🤑|😇|🥰|😴|🤤|🤢|🥸|🫠|🙂‍↕️|🙂‍↔️|🫪|🫩');
 const symbols: Partial<Record<MascotEmoji, string>> = {'🫣':'🖐','🫡':'╱','🤔':'☞','🫢':'✋','🤭':'✋','🤫':'☝','🤧':'▱','🤒':'╱','🤕':'▰','🤠':'▰','🥳':'◀','🤯':'✹','😮‍💨':'≋','😤':'≋','😶‍🌫️':'☁','😷':'▱','🤬':'#*!','🥶':'❄','🤮':'≋','🤑':'$','😇':'◯','🥰':'♥','😴':'zZ','🤤':'﹏','🤢':'≈','🥸':'⌁','🫠':'﹏','🙂‍↕️':'↕','🙂‍↔️':'↔','🫪':'↔','🫩':'…'};
 return <g data-mascot-emoji={emoji} className={`cf-face ${emoji === '🙃' ? 'cf-face-upside' : ''}`} fill="none" stroke="#071018" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
  <g className="cf-face-eyes">
   {[36,64].map((x,i) => <g key={x}>
    {heart ? <path d={`M${x} 46 c-14 -8 -8 -18 0 -11 c8 -7 14 3 0 11`} fill="#f43f5e" stroke="#fff" strokeWidth="1"/> : star ? <text x={x} y="47" textAnchor="middle" fill="#fde047" stroke="none" fontSize="19">★</text> : dizzy ? <path d={`M${x-5} 36 l10 12 m0 -12 l-10 12`}/> : closed || (wink && i===1) ? <path d={`M${x-7} 43 q7 ${sad ? 8 : -9} 14 0`}/> : <><ellipse cx={x} cy="42" rx="7" ry={has('🥹|🥺') ? 11 : 9} fill="white" stroke="none"/><circle cx={x+(emoji==='🙄'?1:0)} cy={emoji==='🙄'?36:43} r="4" fill="#071018" stroke="none"/><circle cx={x+1} cy="40" r="1.5" fill="white" stroke="none"/></>}
   </g>)}
  </g>
  {(angry || sad || has('🤨|🧐|😏|😒|🫩')) && <path d={angry?'M28 27 l16 7 M56 34 l16 -7':sad?'M28 30 l16 -5 M56 25 l16 5':'M28 28 l16 4 M56 27 l16 -4'}/>}
  {glasses && <g fill={emoji==='😎'?'#071018':'none'} stroke="white"><rect x="25" y="33" width="22" height="19" rx="6"/><path d="M47 40 h6"/>{emoji!=='🧐' && <rect x="53" y="33" width="22" height="19" rx="6"/>}</g>}
  {emoji==='😶'||emoji==='🫥'||emoji==='😶‍🌫️' ? null : round ? <ellipse cx="50" cy="65" rx="7" ry="10" fill="#071018" stroke="white" strokeWidth="1"/> : neutral ? <path d="M37 66 h26"/> : sad || angry ? <path d="M34 71 Q50 53 66 71"/> : has('😘|😗|😙|😚') ? <path d="M45 60 l8 4 -8 4 8 4"/> : <path d="M31 60 Q50 87 69 60 Z" fill="#071018" stroke="white" strokeWidth="1.5"/>}
  {tongue && <path d="M48 69 h15 v8 q-7 12 -15 0Z" fill="#fb7185" stroke="none"/>}
  {emoji==='😁'||emoji==='😬'||emoji==='🥶' ? <g><rect x="32" y="59" width="36" height="14" rx="4" fill="white"/><path d="M33 66 h34 M42 60 v12 M51 60 v12 M60 60 v12" strokeWidth="1"/></g>:null}
  {tear && <g fill="#38bdf8" stroke="white" strokeWidth=".7"><path d="M23 49 q-12 17 0 17 q9 -3 0 -17"/>{emoji==='😭'&&<path d="M77 49 q12 25 0 25 q-9 -3 0 -25"/>}</g>}
  {sweat && <path d="M79 25 q-12 17 0 17 q9 -3 0 -17" fill="#38bdf8" stroke="white" strokeWidth=".7"/>}
  {has('☺️|😊|🥰|😳|😚|🥹')&&<g stroke="none" fill="#fb7185" opacity=".65"><ellipse cx="24" cy="56" rx="7" ry="4"/><ellipse cx="76" cy="56" rx="7" ry="4"/></g>}
  {emoji==='🤥'&&<path d="M50 52 h28 l-28 4" fill="#eab308"/>}
  {emoji==='🤐'&&<path d="M36 62 v8 m7 -8 v8 m7 -8 v8 m7 -8 v8 m7 -8 v8" stroke="white"/>}
  {accessory && <text x={has('😇|🤠|🤯|🥳|🤕')?'50':'73'} y={has('😇|🤠|🤯|🥳|🤕')?'22':'76'} textAnchor="middle" fontSize={emoji==='🤬'?'14':'23'} fill={has('🤢|🤮')?'#86efac':has('🥰')?'#fb7185':'white'} stroke="none">{symbols[emoji]}</text>}
 </g>;
}
