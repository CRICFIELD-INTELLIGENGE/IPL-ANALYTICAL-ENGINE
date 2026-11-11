import { test } from "node:test";
import assert from "node:assert/strict";
import { runAnalyst } from "../src/services/cricfield-analyst";
import { ollamaSettings } from "../src/services/ollama";
test("Ollama retrieves evidence before local inference without native tool calling", async () => {
  const order:string[]=[];
  const result=await runAnalyst("Most runs in IPL 2025",{provider:"ollama",model:"llama3:latest",key:"",runTool:async tool=>{order.push(tool.name);return {source:"/api/ask",data:{runs:42}};},fetcher:(async(url,init)=>{
    order.push("inference");assert.equal(url,"http://127.0.0.1:11434/api/chat");
    const body=JSON.parse(String(init?.body));assert.equal(body.stream,false);assert.equal(body.tools,undefined);assert.match(body.messages[1].content,/42/);
    return new Response(JSON.stringify({message:{content:"42 [S1]"}}));
  }) as typeof fetch});
  assert.deepEqual(order,["statistics","inference"]);assert.equal(result.text,"42 [S1]");assert.equal(result.evidence[0].id,"S1");
});
test("Ollama auction question uses server auction records", async()=>{
  await runAnalyst("Auction purchases",{provider:"ollama",model:"llama3:latest",key:"",runTool:async tool=>{assert.equal(tool.name,"auction_records");return{source:"/api/auction-2027",data:[]};},fetcher:(async()=>new Response(JSON.stringify({message:{content:"No records [S1]"}}))) as typeof fetch});
});
test("Ollama URL must remain local",()=>{
  const saved=process.env.OLLAMA_BASE_URL;
  try{process.env.OLLAMA_BASE_URL="https://external.example";assert.throws(ollamaSettings,/ollama_local_url_required/);}finally{if(saved===undefined)delete process.env.OLLAMA_BASE_URL;else process.env.OLLAMA_BASE_URL=saved;}
});
test("Ollama failure preserves a labeled verified warehouse answer",async()=>{
  const result=await runAnalyst("Most runs",{provider:"ollama",model:"llama3:latest",key:"",runTool:async()=>({source:"/api/ask",data:{result:{answer:"Player A: 42 runs"}}}),fetcher:async()=>{throw new Error("timeout");}});
  assert.equal(result.model,"CricField warehouse fallback");assert.match(result.text,/local AI explanation unavailable/);assert.match(result.text,/42/);
});
