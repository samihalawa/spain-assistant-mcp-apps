import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createHttpServer } from "../src/server.js";
import { PRODUCTS } from "../src/registry.js";
import { readFileSync } from "node:fs";

test("seven distinct, read-only tools have real MCP Apps resources",async()=>{
 const server=createHttpServer();
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const port=server.address().port;
 let client;
 try {
  const health=await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(health.status,200);assert.equal((await health.json()).tools,7);
  client=new Client({name:"independent-mcp-test",version:"0.0.1"});
  await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)));
  const listed=(await client.listTools()).tools;
  assert.equal(listed.length,7);
  const resources=(await client.listResources()).resources;
  assert.equal(resources.length,7);
  for(const p of PRODUCTS){
   const tool=listed.find(t=>t.name===p.tool);
   assert.ok(tool,p.tool);
   assert.equal(tool.annotations.readOnlyHint,true);
   assert.equal(tool.annotations.destructiveHint,false);
   assert.equal(tool.annotations.openWorldHint,true);
   assert.equal(tool._meta.ui.resourceUri,`ui://spain-assistant/${p.slug}/v3.html`);
   const r=await client.readResource({uri:tool._meta.ui.resourceUri});
   assert.equal(r.contents[0].mimeType,"text/html;profile=mcp-app");
   assert.ok(r.contents[0].text.includes("<html"));
   assert.ok(r.contents[0].text.includes(p.slug));
  }
  const bad=await client.callTool({name:"compare_spanish_public_grants",arguments:{query:""}});
  assert.equal(bad.isError,true); // Invalid input must not trigger a source fetch.
 } finally {await client?.close();await new Promise(resolve=>server.close(resolve));}
});

test("worker disallows unknown commands and returns a structured error",async()=>{
 const {callPython}=await import("../src/worker.js");
 const r=await callPython("not_an_official_operation",{query:"test"});
 assert.equal(r.ok,false);assert.equal(r.error.code,"unknown_tool");
});

test("UI templates must have no pending marker or external script dependency",()=>{
 for(const p of PRODUCTS){
  const html=readFileSync(new URL(`../public/dist/${p.slug}.html`,import.meta.url),"utf8");
  assert.equal(html.includes("/*__BUNDLE__*/"),false);
  assert.ok(html.includes('id="cards"'));
  assert.ok(html.includes('id="sources"'));
  assert.ok(html.includes('text/html')===false||html.length>30000);
  assert.equal(html.includes('<script src="https://'),false);
 }
});
