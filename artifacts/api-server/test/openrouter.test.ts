import { test } from "node:test";
import assert from "node:assert/strict";
import { isFreeOpenRouterModel, openRouterCompletion } from "../src/services/openrouter";
test("only free routing/model variants are allowed", () => {
  assert.equal(isFreeOpenRouterModel("openrouter/free"),true);
  assert.equal(isFreeOpenRouterModel("vendor/model:free"),true);
  for (const value of ["openrouter/auto","vendor/paid","vendor/free:free?fallback=paid","https://bad"]) assert.equal(isFreeOpenRouterModel(value),false);
});
test("OpenRouter sends zero-price constraints and correlates tool messages", async () => {
  const requests: any[] = [];
  const fetcher = (async (url, init) => {
    assert.equal(url,"https://openrouter.ai/api/v1/chat/completions");
    assert.equal((init?.headers as Record<string,string>).Authorization,"Bearer fake");
    requests.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({model:"vendor/model:free",choices:[{message:{content:"Answer"}}]}));
  }) as typeof fetch;
  const result = await openRouterCompletion({ key:"fake",model:"openrouter/free",messages:[{role:"tool",tool_call_id:"id",content:"data"}],tools:[],toolChoice:"required",signal:AbortSignal.timeout(1000),fetcher });
  assert.equal(result.model,"vendor/model:free");
  assert.deepEqual(requests[0].provider,{require_parameters:true,max_price:{prompt:0,completion:0}});
  assert.equal(requests[0].tool_choice,"required");
  assert.equal(requests[0].messages[0].tool_call_id,"id");
  assert.equal(requests[0].models,undefined);
});
test("paid models rejected before network call", async () => {
  await assert.rejects(openRouterCompletion({ key:"fake",model:"vendor/paid",messages:[],signal:AbortSignal.timeout(1000),fetcher:async()=>{throw new Error("network should not run");} }),/free_model_required/);
});
