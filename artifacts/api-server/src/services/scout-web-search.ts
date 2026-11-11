export type WebEvidence = { id:string; title:string; url:string; snippet:string; retrievedAt:string };
export function parseWebResults(raw:unknown):WebEvidence[]{
 const rows=(raw as {organic_results?:unknown[]})?.organic_results;if(!Array.isArray(rows))return [];
 return rows.slice(0,5).flatMap((item,index)=>{const row=item as Record<string,unknown>;if(typeof row.link!=='string'||typeof row.title!=='string')return [];try{const u=new URL(row.link);if(u.protocol!=='https:'||u.username||u.password)return [];}catch{return [];}
 return [{id:`W${index+1}`,title:row.title.slice(0,200),url:row.link,snippet:typeof row.snippet==='string'?row.snippet.slice(0,1000):'',retrievedAt:new Date().toISOString()}];});
}
export async function searchCricketWeb(query:string,fetcher:typeof fetch=fetch):Promise<{results:WebEvidence[];status:string}>{
 const key=process.env.SERPAPI_API_KEY?.trim();if(process.env.SCOUT_WEB_SEARCH_ENABLED!=='true'||!key)return {results:[],status:'Web search is not configured; only warehouse evidence is available.'};
 const url=new URL('https://serpapi.com/search.json');url.search=new URLSearchParams({engine:'google',q:`cricket ${query.slice(0,300)}`,api_key:key,num:'5'}).toString();
 try{const response=await fetcher(url,{signal:AbortSignal.timeout(10000)});if(!response.ok)return {results:[],status:'Web search temporarily unavailable.'};const raw=await response.json();if(raw.error)return {results:[],status:'Web search temporarily unavailable.'};const results=parseWebResults(raw);return {results,status:results.length?'Search snippets retrieved; linked pages have not been independently verified.':'No web results found.'};}catch{return {results:[],status:'Web search timed out or is unavailable.'};}
}
