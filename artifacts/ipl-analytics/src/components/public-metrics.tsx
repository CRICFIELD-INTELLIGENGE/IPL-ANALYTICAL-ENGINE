import { useEffect,useState,useSyncExternalStore } from 'react';
import { useLocation } from 'wouter';
function feature(path:string){return path.startsWith('/ai-analyst')?'analyst':['scout','stats','arcade','account','dugout','scores'].find(name=>path.startsWith('/'+name))??(path==='/'||path==='/home'?'home':'other');}
const usageKey='cricfield_analytics_optin';
function useUsageConsent(){return useSyncExternalStore(notify=>{window.addEventListener('cf:usage',notify);window.addEventListener('storage',notify);return()=>{window.removeEventListener('cf:usage',notify);window.removeEventListener('storage',notify);};},()=>{try{return localStorage.getItem(usageKey)==='true';}catch{return false;}},()=>false);}
export function UsageTracker(){
 const [location]=useLocation(); const consent=useUsageConsent();
 useEffect(()=>{if(!consent)return;let session:string;try{session=sessionStorage.getItem('cricfield_metrics_session')||crypto.randomUUID();sessionStorage.setItem('cricfield_metrics_session',session);}catch{return;}
 const track=(action:string)=>{try{if(localStorage.getItem(usageKey)!=='true')return;}catch{return;}void fetch(`${import.meta.env.BASE_URL}api/analytics/events`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session,feature:feature(location),action}),keepalive:true}).catch(()=>{});};
 const first=setTimeout(()=>{if(!document.hidden)track('page_view');},0);const timer=setInterval(()=>{if(!document.hidden)track('heartbeat');},30000);
 let last=0;const engage=(event:Event)=>{if(!event.isTrusted||Date.now()-last<10000)return;last=Date.now();track('engagement');};document.addEventListener('click',engage);return()=>{clearTimeout(first);clearInterval(timer);document.removeEventListener('click',engage);};},[consent,location]);
 return null;
}
export function PublicMetrics(){
 const consent=useUsageConsent();
 const [metrics,setMetrics]=useState<any>(null);
 useEffect(()=>{let alive=true;const load=()=>fetch(`${import.meta.env.BASE_URL}api/analytics/public`).then(r=>r.ok?r.json():null).then(value=>{if(alive)setMetrics(value);}).catch(()=>{});void load();const timer=setInterval(()=>void load(),60000);return()=>{alive=false;clearInterval(timer);};},[]);

 return <div className="mt-3 text-[10px] space-y-2">{metrics&&<p>{metrics.registeredUsers!=null&&<span>{metrics.registeredUsers} confirmed accounts · </span>}{metrics.onlineOptIn} opted-in visitors active · {metrics.pageViews30d} measured views / 30 days</p>}<label className="inline-flex items-center gap-2"><input type="checkbox" checked={consent} onChange={event=>{const value=event.target.checked;try{localStorage.setItem(usageKey,String(value));if(!value)sessionStorage.removeItem('cricfield_metrics_session');}catch{}window.dispatchEvent(new Event('cf:usage'));}}/>Share page and feature usage</label><p>Activity counts cover opted-in browsers and are not bot-verified.{metrics?.measuredAt&&` Updated ${new Date(metrics.measuredAt).toLocaleTimeString()}.`}</p></div>;
}
