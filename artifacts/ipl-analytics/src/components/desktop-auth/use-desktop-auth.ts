import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase, getAuthProviders, supabaseConfigured } from '@/lib/supabase';
export type AuthMode = 'signin' | 'signup' | 'forgot' | 'recovery';
export type AuthResult = 'success' | 'error' | 'notice' | null;
export const accountRedirect = () => new URL(`${import.meta.env.BASE_URL}account`, window.location.origin).href;
export function safeDestination(value: string | null) {
 if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
 try { const url = new URL(value, location.origin); return url.origin === location.origin ? url.pathname + url.search + url.hash : null; } catch { return null; }
}
export function useDesktopAuth() {
 const returning = /(?:access_token|code)=/.test(location.hash + location.search);
 const [user,setUser] = useState<User|null>(null);
 const [checking,setChecking] = useState(supabaseConfigured);
 const [pending,setPending] = useState<string|null>(returning && supabaseConfigured ? 'returning' : null);
 const [mode,setMode] = useState<AuthMode>('signin');
 const [result,setResult] = useState<AuthResult>(null);
 const [message,setMessage] = useState('');
 const [providers,setProviders] = useState<Record<string,boolean>|null>(null);
 const [providerError,setProviderError] = useState(false);
 const [retry,setRetry] = useState(0);
 const redirecting=useRef(false), recovery=useRef(location.hash.includes("type=recovery"));
 const lock = useRef(false), mounted = useRef(true), interactive = useRef(returning);
 useEffect(() => {
  mounted.current = true;
  const query = new URLSearchParams(location.search), hash = new URLSearchParams(location.hash.slice(1));
  const next = safeDestination(query.get('next')); if(next) sessionStorage.setItem('cricfield-auth-next',next);
  if (query.has('error') || hash.has('error')) {setResult('error');setMessage(hash.get('error_code')==='otp_expired'?'That sign-in link is invalid or has expired. Please request a new one.':'Sign-in was cancelled or the link has expired. Please try again.');setPending(null);['error','error_code','error_description'].forEach(k=>query.delete(k));history.replaceState(null,'',location.pathname+(query.size?'?'+query:''));}
  if(!supabaseConfigured) return () => {mounted.current=false;};
  const api=getSupabase();
  const {data}=api.auth.onAuthStateChange((event,session)=>{
   if(!mounted.current)return;
   setUser(session?.user??null);
   if(event==='PASSWORD_RECOVERY'){recovery.current=true;interactive.current=false;setMode('recovery');setPending(null);}
   else if(event==='SIGNED_IN' && interactive.current){setResult('success');setMessage("You're In! Welcome to Your Dugout.");}
  });
  void api.auth.getUser().then(({data,error})=>{
   if(!mounted.current)return;
   setUser(data.user);
   if(data.user && interactive.current && !recovery.current){setResult('success');setMessage("You're In! Welcome to Your Dugout.");}
   if(error && error.name!=='AuthSessionMissingError'){setResult('error');setMessage('Could not verify your session. Please sign in again.');}
  }).catch(()=>{if(mounted.current){setResult('error');setMessage('Account service unavailable. Please try again.');}}).finally(()=>{if(mounted.current){setChecking(false);setPending(null);}});
  return ()=>{mounted.current=false;data.subscription.unsubscribe();};
 },[]);
 useEffect(()=>{
  if(!supabaseConfigured)return;
  const controller=new AbortController();setProviderError(false);
  void getAuthProviders(controller.signal).then(value=>{if(!controller.signal.aborted)setProviders(value);}).catch(()=>{if(!controller.signal.aborted)setProviderError(true);});
  return ()=>controller.abort();
 },[retry]);
 const perform = async (kind:string, job:()=>Promise<void>)=>{
  if(lock.current || checking || !supabaseConfigured)return;
  lock.current=true;setPending(kind);setResult(null);setMessage('');
  try{await job();}catch(error){redirecting.current=false;if(mounted.current){setResult('error');setMessage(error instanceof Error ? error.message : 'Sign-in could not be completed. Please try again.');}}
  finally{lock.current=false;if(mounted.current&&!redirecting.current)setPending(null);}
 };
 const submit = (email:string,password:string)=>perform(mode,async()=>{
  const api=getSupabase();interactive.current=mode==='signin'||mode==='recovery';
  if(mode==='forgot'){const {error}=await api.auth.resetPasswordForEmail(email,{redirectTo:accountRedirect()});if(error)throw error;setResult('notice');setMessage('If an account exists for this email, a password reset link is on its way.');}
  else if(mode==='recovery'){const {error}=await api.auth.updateUser({password});if(error)throw error;setResult('success');setMessage('Password updated. Welcome to Your Dugout.');}
  else if(mode==='signup'){const {data,error}=await api.auth.signUp({email,password,options:{emailRedirectTo:accountRedirect()}});if(error)throw error;if(data.session){interactive.current=true;setUser(data.user);setResult('success');setMessage("You're In! Welcome to Your Dugout.");}else{setResult('notice');setMessage('Check your email to confirm your account before signing in.');}}
  else{const {data,error}=await api.auth.signInWithPassword({email,password});if(error)throw error;if(!data.session)throw new Error('No session was returned. Please try again.');setUser(data.user);setResult('success');setMessage("You're In! Welcome to Your Dugout.");}
 });
 const magicLink=(email:string)=>perform('magic',async()=>{interactive.current=false;const {error}=await getSupabase().auth.signInWithOtp({email,options:{emailRedirectTo:accountRedirect()}});if(error)throw error;setResult('notice');setMessage('Check your email for a secure sign-in link.');});
 const social=(provider:'google'|'apple')=>perform(provider,async()=>{
  if(!providers?.[provider])throw new Error(`${provider==='apple'?'Apple':'Google'} sign-in is not enabled yet.`);
  const {data,error}=await getSupabase().auth.signInWithOAuth({provider,options:{redirectTo:accountRedirect(),skipBrowserRedirect:true}});if(error)throw error;if(!data.url)throw new Error('The provider did not return a sign-in address.');
  // Leave via the provider URL supplied by Supabase; a new page handles the callback.
  redirecting.current=true;window.location.assign(data.url);
 });
 const finish=useCallback(()=>{const next=safeDestination(sessionStorage.getItem('cricfield-auth-next'));sessionStorage.removeItem('cricfield-auth-next');window.location.assign(next??new URL(import.meta.env.BASE_URL+'dugout',location.origin).pathname);},[]);
 const changeMode=(next:AuthMode)=>{if(lock.current)return;setMode(next);setMessage('');setResult(null);};
 return {user,checking,pending,mode,result,message,providers,providerError,submit,magicLink,social,finish,changeMode,retryProviders:()=>setRetry(n=>n+1)};
}
