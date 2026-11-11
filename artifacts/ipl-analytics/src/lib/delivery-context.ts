import {useSyncExternalStore} from 'react';
export type DeliveryScenario={season:string;bowler:string;line:string;length:string;phase:string};
export type DeliveryContext={player:string;a:DeliveryScenario;b:DeliveryScenario};
export const EMPTY_SCENARIO:DeliveryScenario={season:'',bowler:'',line:'',length:'',phase:''};
const key='cricfield-delivery-context-v1';let state:DeliveryContext={player:'',a:{...EMPTY_SCENARIO},b:{...EMPTY_SCENARIO}};
try{const saved=JSON.parse(sessionStorage.getItem(key)??'null');if(saved&&typeof saved.player==='string')state={player:saved.player,a:{...EMPTY_SCENARIO,...saved.a},b:{...EMPTY_SCENARIO,...saved.b}};}catch{}
const listeners=new Set<()=>void>();
export function updateDeliveryContext(patch:Partial<DeliveryContext>){state={...state,...patch};try{sessionStorage.setItem(key,JSON.stringify(state));}catch{}listeners.forEach(fn=>fn());}
export function useDeliveryContext(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},()=>state);}
