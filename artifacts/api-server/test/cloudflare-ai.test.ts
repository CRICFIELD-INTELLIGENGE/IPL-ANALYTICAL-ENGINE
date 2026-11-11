import { test } from "node:test";
import assert from "node:assert/strict";
import { aiCompletion, aiConfig } from "../src/services/ai-provider";
test("Cloudflare uses account endpoint, bearer token and tool schema", async () => {
  const result = await aiCompletion({ provider:"cloudflare",accountId:"a".repeat(32),key:"fake",model:"@cf/meta/llama-3.3-70b-instruct-fp8-fast",messages:[{role:"user",content:"runs"}],tools:[],toolChoice:"required",signal:AbortSignal.timeout(1000),fetcher:(async (url,init) => {
    assert.equal(url,`https://api.cloudflare.com/client/v4/accounts/${"a".repeat(32)}/ai/v1/chat/completions`);
    assert.equal((init?.headers as Record<string,string>).Authorization,"Bearer fake");
    const body=JSON.parse(String(init?.body));
    assert.equal(body.tool_choice,"required");assert.equal(body.provider,undefined);assert.equal(body.max_tokens,1200);
    return new Response(JSON.stringify({choices:[{message:{role:"assistant",content:"answer"}}]}));
  }) as typeof fetch });
  assert.equal(result.message.content,"answer");
});
test("Cloudflare rejects malformed account ID before network", async () => {
  await assert.rejects(aiCompletion({provider:"cloudflare",accountId:"bad",key:"fake",model:"model",messages:[],signal:AbortSignal.timeout(1000),fetcher:async()=>{throw new Error("network should not run");}}),/invalid_account_id/);
});
test("Cloudflare provider errors are not returned as answers", async () => {
  await assert.rejects(aiCompletion({provider:"cloudflare",accountId:"a".repeat(32),key:"fake",model:"model",messages:[],signal:AbortSignal.timeout(1000),fetcher:(async()=>new Response(JSON.stringify({success:false,errors:[]}))) as typeof fetch}),/provider_unavailable/);
});
test("configuration requires complete credentials", () => {
  const names=["AI_PROVIDER","CLOUDFLARE_API_TOKEN","CLOUDFLARE_ACCOUNT_ID","CLOUDFLARE_AI_MODEL"];
  const saved=names.map(name=>process.env[name]);
  try {
    process.env.AI_PROVIDER="cloudflare";process.env.CLOUDFLARE_API_TOKEN="fake";process.env.CLOUDFLARE_ACCOUNT_ID="bad";delete process.env.CLOUDFLARE_AI_MODEL;
    assert.equal(aiConfig(),null);
    process.env.CLOUDFLARE_ACCOUNT_ID="a".repeat(32);
    assert.equal(aiConfig()?.provider,"cloudflare");
  } finally { names.forEach((name,i)=>{if(saved[i]===undefined)delete process.env[name];else process.env[name]=saved[i];}); }
});
