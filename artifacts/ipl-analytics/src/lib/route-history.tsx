import {useEffect,useSyncExternalStore} from 'react';
import {useLocation} from 'wouter';
type Entry={path:string;scroll:number};
let trail:Entry[]=[];let current='';let version=0;const listeners=new Set<()=>void>();
const emit=()=>{version++;listeners.forEach(fn=>fn());};
const fullPath=()=>location.pathname+location.search+location.hash;
const internal=(value:string)=>{try{const url=new URL(value,location.origin);return value.startsWith('/')&&!value.startsWith('//')&&url.origin===location.origin;}catch{return false;}};
export function routeLabel(path:string){const base=path.split(/[?#]/)[0];const labels:Record<string,string>={scores:'Scores & Match Center',intelligence:'Intelligence Hub',feed:'Intel Feed',scout:'Scout Lab',home:'Home',stats:'Tournament Stats',dugout:'Dugout',teams:'Teams',venues:'Venues',players:'Players'};const segments=base.split('/').filter(Boolean);return /^(match|matches)$/.test(segments[0])?`Match #${segments[1]}`:labels[segments[0]]??'Previous Page';}
export function RouteHistoryTracker(){
 const [route]=useLocation();
 useEffect(()=>{
  const next=fullPath();
  if(!current){current=next;try{const saved=JSON.parse(sessionStorage.getItem('cricfield-route-trail')??'null');if(saved?.current===next&&Array.isArray(saved.trail))trail=saved.trail.filter((e:Entry)=>internal(e.path)&&Number.isFinite(e.scroll));}catch{trail=[];}}
  else if(current.split(/[?#]/)[0]!==next.split(/[?#]/)[0]){const backIndex=trail.map(e=>e.path).lastIndexOf(next);if(backIndex>=0){trail=trail.slice(0,backIndex);current=next;}else{trail.push({path:current,scroll:Number(sessionStorage.getItem('cricfield-route-scroll')??0)});trail=trail.slice(-40);current=next;}}
  else current=next;
  const save=()=>{if(fullPath().split(/[?#]/)[0]===current.split(/[?#]/)[0])current=fullPath();try{sessionStorage.setItem('cricfield-route-scroll',String(window.scrollY));sessionStorage.setItem('cricfield-route-trail',JSON.stringify({current,trail}));}catch{}};
  save();emit();window.addEventListener('scroll',save,{passive:true});return()=>window.removeEventListener('scroll',save);
 },[route]);return null;
}
export function useRouteHistory(fallbackPath='/home'){
 const [,navigate]=useLocation();useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},()=>version);
 const previous=trail.at(-1);const previousPath=previous&&internal(previous.path)?previous.path:null;
 const goBack=()=>{const destination=previousPath??fallbackPath;const scroll=previous?.scroll??0;if(previousPath)trail.pop();current=destination;try{sessionStorage.setItem('cricfield-route-trail',JSON.stringify({current,trail}));}catch{}emit();navigate(destination);requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo(0,scroll)));};
 return {previousPath,previousLabel:routeLabel(previousPath??fallbackPath),goBack};
}
