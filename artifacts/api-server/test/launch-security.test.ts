import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { securityHeaders, publicErrorHandler } from "../src/lib/http-security";
import videoRouter from "../src/routes/video";
import aiRouter from "../src/routes/ai-commentary";

test("launch guards protect maintenance, provider access and malformed requests", async () => {
  const app = express();
  app.use(securityHeaders, express.json({limit:"100kb"}));
  app.use("/video", videoRouter); app.use(aiRouter);
  app.get("/explode", () => { throw new Error("private SQL and filesystem details"); });
  app.use(publicErrorHandler);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(r => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const previous = process.env.ADMIN_API_TOKEN;
  const enabled = process.env.AI_COMMENTARY_ENABLED;
  delete process.env.ADMIN_API_TOKEN; delete process.env.AI_COMMENTARY_ENABLED;
  try {
    for (const route of ["refresh","sync-hotstar","add-clip","webhooks/anakin"]) {
      const r = await fetch(`${base}/video/${route}`, {method:"POST"});
      assert.equal(r.status,404);
    }
    const fail = await fetch(base+"/explode");
    assert.equal(fail.status,500); assert.deepEqual(await fail.json(),{error:"internal_error"});
    assert.equal(fail.headers.get("x-content-type-options"),"nosniff");
    assert.ok(fail.headers.get("content-security-policy")?.includes("object-src 'none'"));
    for (const [body,status] of [["{",400],[JSON.stringify({x:"x".repeat(110000)}),413]] as const) {
      assert.equal((await fetch(base+"/ai/commentary",{method:"POST",headers:{"content-type":"application/json"},body})).status,status);
    }
    const r = await fetch(base+"/ai/commentary",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt:"Explain this innings"})});
    assert.equal(r.status,503);
  } finally {
    if(previous===undefined) delete process.env.ADMIN_API_TOKEN; else process.env.ADMIN_API_TOKEN=previous;
    if(enabled===undefined) delete process.env.AI_COMMENTARY_ENABLED; else process.env.AI_COMMENTARY_ENABLED=enabled;
    await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  }
});
