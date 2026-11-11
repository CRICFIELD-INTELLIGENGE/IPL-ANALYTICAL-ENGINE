import { useSyncExternalStore } from 'react';
const rawClient=(import.meta.env.VITE_ADSENSE_CLIENT || '').trim().replace(/^(ca-)?pub-/, '');
export const adsenseClient=/^\d{16}$/.test(rawClient) ? 'ca-pub-'+rawClient : undefined;
const GA_ID=/^G-[A-Z0-9]+$/.test(import.meta.env.VITE_GA_MEASUREMENT_ID || '') ? import.meta.env.VITE_GA_MEASUREMENT_ID : undefined;
export const hasAnalytics=Boolean(GA_ID);
// This is an operator switch, not evidence of approval. Default is off.
export const hasAds=Boolean(adsenseClient)&&import.meta.env.VITE_ADSENSE_ENABLED==='true';
const KEY='iae:consent:v1';
export type ConsentChoice='granted'|'denied';
declare global {interface Window {
 dataLayer?:unknown[];gtag?:(...args:unknown[])=>void;adsbygoogle?:unknown[];
 __tcfapi?:(command:string,version:number,callback:(data:any,success:boolean)=>void,parameter?:unknown)=>void;
}}
export function readConsent():ConsentChoice|null {try{const v=localStorage.getItem(KEY);return v==='granted'||v==='denied'?v:null;}catch{return null;}}
function emit(){window.dispatchEvent(new Event('cf:ads-consent'));}
function writeConsent(choice:ConsentChoice){try{localStorage.setItem(KEY,choice);}catch{}emit();}
function stub(){window.dataLayer ||= [];window.gtag ||= function(){window.dataLayer!.push(arguments);};}
export function initConsentDefaults(){stub();window.gtag!('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});}
// The existing banner cannot replace a certified CMP. Fail closed until its TCF API
// reports a completed choice; deploy the CMP independently of the ad script.
let cmpAllowed=false,cmpStarted=false;
function startCmp(){if(cmpStarted||!hasAds)return;cmpStarted=true;
 const attach=()=>{if(!window.__tcfapi)return false;
 window.__tcfapi('addEventListener',2,(data,success)=>{
   // Opening the preference dialog is not a withdrawal; wait for a choice.
   if(success&&data?.cmpStatus==='loaded'&&data.eventStatus==='cmpuishown')return;
   const ready=success&&data?.cmpStatus==='loaded'&&['tcloaded','useractioncomplete'].includes(data.eventStatus);
   const previouslyAllowed=cmpAllowed;
   cmpAllowed=Boolean(ready&&(data.gdprApplies===false || (data.gdprApplies===true&&data.tcString&&data.vendor?.consents?.[755]&&[1,2,3,4,7,9,10].every(id=>data.purpose?.consents?.[id]))));
   emit();
   if(previouslyAllowed&&!cmpAllowed&&scripts.size)window.location.reload();
 });return true;};
 if(!attach()){const timer=setInterval(()=>{if(attach())clearInterval(timer);},1000);}
}
function subscribe(notify:()=>void){window.addEventListener('cf:ads-consent',notify);window.addEventListener('storage',notify);startCmp();return()=>{window.removeEventListener('cf:ads-consent',notify);window.removeEventListener('storage',notify);};}
function adAllowed(){return hasAds&&cmpAllowed&&readConsent()==='granted';}
export function useAdConsent(){return useSyncExternalStore(subscribe,()=>adAllowed()?'granted':'denied',()=> 'denied');}
const scripts=new Map<string,Promise<void>>();
function loadScript(src:string,attrs:Record<string,string>={}){let pending=scripts.get(src);if(pending)return pending;
 pending=new Promise<void>((resolve,reject)=>{const el=document.createElement('script');el.src=src;el.async=true;Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));el.onload=()=>resolve();el.onerror=()=>{scripts.delete(src);el.remove();reject(new Error('Optional service unavailable'));};document.head.append(el);});scripts.set(src,pending);return pending;
}
let gaReady=false,gaPending:Promise<void>|undefined;
export async function resumeIfConsented(){if(readConsent()!=='granted'||!GA_ID)return;stub();window.gtag!('consent','update',{analytics_storage:'granted'});
 if(gaReady)return;
 return gaPending ??= loadScript('https://www.googletagmanager.com/gtag/js?id='+GA_ID).then(()=>{
 if(readConsent()!=='granted')return;
 window.gtag!('js',new Date());window.gtag!('config',GA_ID,{send_page_view:false,page_location:window.location.origin+window.location.pathname,page_referrer:''});gaReady=true;pageview(window.location.pathname);
 }).catch(()=>{}).finally(()=>{gaPending=undefined;});
}
export async function grantConsent(){writeConsent('granted');await resumeIfConsented();}
export function denyConsent(){writeConsent('denied');stub();window.gtag!('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
 // Previously loaded third-party code cannot reliably be unloaded. Reload after
 // persisting refusal so no tag starts again, including in other open tabs.
 if(gaReady||scripts.size)window.location.reload();
}
if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key===KEY&&event.newValue!=='granted'&&scripts.size)window.location.reload();});
export function pageview(path:string){if(!gaReady||!GA_ID||readConsent()!=='granted')return;const clean=path.split(/[?#]/)[0];window.gtag?.('event','page_view',{page_path:clean,page_location:window.location.origin+clean,page_referrer:'',page_title:'CricField'});}
export function trackEvent(name:string,params:Record<string,unknown>={}){if(gaReady&&readConsent()==='granted')window.gtag?.('event',name,params);}
export function trackOutbound(slug:string,title:string,platform?:string){trackEvent('outbound_article_click',{article_slug:slug,platform:platform??'unknown'});}
const requested=new WeakSet<HTMLElement>();
export function mountAd(element:HTMLElement){let cancelled=false;let observer:ResizeObserver|undefined;
 if(!adAllowed())return()=>{};
 void loadScript('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+adsenseClient,{crossorigin:'anonymous'}).then(()=>{
 const request=()=>{if(cancelled||!adAllowed()||!element.isConnected||requested.has(element)||element.hasAttribute('data-adsbygoogle-status')||element.getBoundingClientRect().width<=0)return;requested.add(element);observer?.disconnect();try{(window.adsbygoogle ||= []).push({});}catch{}};
 if(cancelled)return;observer=new ResizeObserver(request);observer.observe(element);request();
 }).catch(()=>{});return()=>{cancelled=true;observer?.disconnect();};
}
