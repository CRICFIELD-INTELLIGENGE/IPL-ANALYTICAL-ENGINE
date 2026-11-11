import type { Request } from 'express';
export async function verifiedUser(req:Request){
  const token=req.get('authorization');
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
  if(!token?.startsWith('Bearer ')||!url||!key)return null;
  try{const response=await fetch(`${url}/auth/v1/user`,{headers:{Authorization:token,apikey:key},signal:AbortSignal.timeout(5000)});if(!response.ok)return null;const user=await response.json();return typeof user.id==='string'&&typeof user.email==='string'&&user.email_confirmed_at?{id:user.id,email:user.email}:null;}catch{return null;}
}
let cached:{value:number;at:number}|undefined;
export async function registeredCount(){if(cached&&Date.now()-cached.at<60000)return cached.value;
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_PUBLISHABLE_KEY)return null;
  try{const response=await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/public_registered_count`,{method:'POST',headers:{apikey:process.env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});if(!response.ok)return null;const raw=await response.json();if(typeof raw!=='number'&&!(typeof raw==='string'&&/^\d+$/.test(raw)))return null;const value=Number(raw);if(!Number.isSafeInteger(value)||value<0)return null;cached={value,at:Date.now()};return value;}catch{return null;}
}
