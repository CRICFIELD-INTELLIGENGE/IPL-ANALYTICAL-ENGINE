export function groqConfig(){
 const key=process.env.GROQ_API_KEY?.trim();const model=process.env.GROQ_MODEL?.trim()||'openai/gpt-oss-20b';
 return key && !/your_generated|placeholder|your_key/i.test(key) ? {key,model} : null;
}
export async function groqCompletion(options:{key:string;model:string;messages:unknown[];signal:AbortSignal;tools?:unknown[];toolChoice?:string;fetcher?:typeof fetch}){
 const response=await (options.fetcher??fetch)('https://api.groq.com/openai/v1/chat/completions',{method:'POST',signal:options.signal,headers:{'Content-Type':'application/json','User-Agent':'CricField',Authorization:`Bearer ${options.key}`},body:JSON.stringify({model:options.model,messages:options.messages,max_tokens:2400,temperature:0.1,...(options.model.startsWith('openai/gpt-oss')?{reasoning_effort:'low'}:{}),...(options.tools?{tools:options.tools,tool_choice:options.toolChoice??'auto',parallel_tool_calls:false}:{})})});
 if(!response.ok)throw new Error(response.status===429?'provider_rate_limited':'provider_unavailable');
 const raw=await response.json();const message=raw.choices?.[0]?.message;
 if(raw.error||!message||typeof message!=='object')throw new Error('empty_response');
 return {message,model:typeof raw.model==='string'?raw.model:options.model};
}
