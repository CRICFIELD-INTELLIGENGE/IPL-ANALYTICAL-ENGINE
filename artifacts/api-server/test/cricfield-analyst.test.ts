import { test } from "node:test";
import assert from "node:assert/strict";
import { analystToolSchema, runAnalyst } from "../src/services/cricfield-analyst";
const call = (name: string, args: unknown) => ({ model: "test/free:free", choices: [{ message: { role: "assistant", content: null, tool_calls: [{ id: "call_1", type: "function", function: { name, arguments: JSON.stringify(args) } }] } }] });
const answer = { model: "test/free:free", choices: [{ message: { role: "assistant", content: "Runs: 42 [S1]" } }] };
function mockFetch(values: unknown[]) {
  let index = 0;
  return (async () => new Response(JSON.stringify(values[index++]), { status: 200 })) as typeof fetch;
}
test("analyst executes bounded tool and returns server evidence", async () => {
  const seen: string[] = [];
  const result = await runAnalyst("Most runs", { key:"fake", model:"openrouter/free", fetcher:mockFetch([call("statistics",{question:"Most runs"}),answer]), runTool:async tool => {seen.push(tool.name); return {source:"/api/ask",data:{runs:42}};} });
  assert.deepEqual(seen,["statistics"]);
  assert.equal(result.evidence[0].id,"S1");
  assert.deepEqual(result.evidence[0].data,{runs:42});
  assert.equal(result.generatedTextVerified,false);
});
test("analyst rejects invented tools, SQL parameters and oversized arguments", () => {
  assert.equal(analystToolSchema.safeParse({name:"execute_sql",args:{sql:"delete from profiles"}}).success,false);
  assert.equal(analystToolSchema.safeParse({name:"statistics",args:{question:"Runs",sql:"select 1"}}).success,false);
  assert.equal(analystToolSchema.safeParse({name:"player_summary",args:{player:"x".repeat(81)}}).success,false);
});
test("analyst refuses an answer without evidence", async () => {
  await assert.rejects(runAnalyst("Most runs",{key:"fake",model:"openrouter/free",fetcher:mockFetch([answer]),runTool:async()=>{throw new Error("must not call");}}),/missing_evidence/);
});
test("analyst enforces tool budget", async () => {
  const request = call("auction_records",{});
  await assert.rejects(runAnalyst("auction",{key:"fake",model:"openrouter/free",fetcher:mockFetch([request,request,request,request]),runTool:async()=>({source:"/api/auction-2027",data:[]})}),/tool_budget_exceeded/);
});
test("provider failure is not converted into a generated answer", async () => {
  await assert.rejects(runAnalyst("runs",{key:"fake",model:"openrouter/free",fetcher:(async()=>new Response("",{status:429})) as typeof fetch,runTool:async()=>({source:"",data:[]})}),/provider_rate_limited/);
});
