import { createServer as httpServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { PRODUCTS } from "./registry.js";
import { callPython } from "./worker.js";

const dir = dirname(fileURLToPath(import.meta.url));
const APP_VERSION = "0.3.0";
const templates = new Map(PRODUCTS.map(p => {
  const path = resolve(dir, "../public/dist", p.slug + ".html");
  if (!existsSync(path)) throw new Error("Run npm run build first: missing " + path);
  return [p.slug, readFileSync(path,"utf8")];
}));
const MAX_REQUEST_BYTES = 30000;
const windowMs = 60_000, MAX_IP_PER_MIN = Number(process.env.MAX_IP_PER_MIN || 100);
const counters = new Map();
const now = () => Date.now();
function allow(ip) {
 const stamp=now();
 if(counters.size>10000)for(const [key,v] of counters)if(stamp-v.time>windowMs)counters.delete(key);
 const state=counters.get(ip);
 if(!state || stamp-state.time>windowMs){counters.set(ip,{time:stamp,count:1});return true}
 state.count++;return state.count<=MAX_IP_PER_MIN;
}

function createMcp() {
 const server = new McpServer({
  name:"spain-assistant-mcp-apps",version:APP_VERSION,
 },{
  instructions:"Seven independent read-only Spanish public-data tools. For tenders, grants, legislation, company notices, property, statistics and datasets, call the matching domain tool. Treat search coverage, retrieval times, missing records and incomplete eligibility as material. No provider account, filing, purchase, legal certification or background monitoring. Tool outputs include the official URLs and optional MCP App UI."
 });
 for(const p of PRODUCTS) {
  const uri = `ui://spain-assistant/${p.slug}/v3.html`;
  registerAppResource(server, p.name + " results",uri,{},async()=>({
   contents:[{uri,mimeType:RESOURCE_MIME_TYPE,text:templates.get(p.slug),_meta:{ui:{prefersBorder:true}}}]
  }));
  registerAppTool(server,p.tool,{
   title:p.name+" · "+p.label,
   description:p.description,
   inputSchema:p.fields,
   annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true},
   _meta:{
    ui:{resourceUri:uri},
    "openai/toolInvocation/invoking":"Consultando fuente oficial…",
    "openai/toolInvocation/invoked":"Consulta completada"
   }
  },async(args)=>{
   try{
    const result=await callPython(p.pyTool,args);
    // Read-only public-source queries; avoid large unstructured text in
    // model-visible notifications. Full structured result remains available.
    const presentation={name:p.name,slug:p.slug,promise:p.promise,label:p.label};
    const merged={...result,product:p.slug,presentation};
    const count=Array.isArray(merged.data)?merged.data.length:merged.data?1:0;
    const message=merged.ok?
       `${p.name}: ${count} returned records. Verify each source link, date, coverage, warnings and any partial failures. Not a certified eligibility or legal determination.`:
       `${p.name}: source unavailable or incomplete; do not infer zero results. ${merged.error?.message||"Review source errors."}`;
    return {content:[{type:"text",text:message}],structuredContent:merged,isError:!merged.ok};
   }catch(err){
    const safe={ok:false,product:p.slug,presentation:{name:p.name,promise:p.promise},error:{code:"source_unavailable",message:"Official source or worker unavailable. No records inferred."},warnings:["The server returned an error; this is not a zero-result search."],sources:[],coverage:{verified:false}};
    return {content:[{type:"text",text:safe.error.message}],structuredContent:safe,isError:true};
   }
  });
 }
 return server;
}
export const PORT = Number(process.env.PORT || 8787);
export function createHttpServer() {
 return httpServer(async(req,res)=>{
  const path=new URL(req.url||"/","http://localhost").pathname;
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Referrer-Policy","no-referrer");
  res.setHeader("Cache-Control","no-store");
  if(path==="/health" && req.method==="GET"){
   res.writeHead(200,{"Content-Type":"application/json"}).end(JSON.stringify({status:"ok",version:APP_VERSION,tools:PRODUCTS.length,auth:"none; public read-only data"}));return;
  }
  if(path==="/" && req.method==="GET"){
   res.writeHead(200,{"Content-Type":"text/plain; charset=utf-8"}).end("Spain Evidence MCP Apps — read-only Spanish public data. Connect /mcp to a compatible host.");return;
  }
  if(path==="/mcp" && req.method==="OPTIONS"){
   res.writeHead(204,{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, mcp-session-id, mcp-protocol-version, accept","Access-Control-Allow-Methods":"POST, GET, DELETE, OPTIONS"}).end();return;
  }
  if(path!=="/mcp" || !["POST","GET","DELETE"].includes(req.method)){
   res.writeHead(404).end("Not found");return;
  }
  if(req.method==="POST"){
   const n=Number(req.headers["content-length"]||0);
   if(n>MAX_REQUEST_BYTES){res.writeHead(413).end("MCP body exceeds size limit");return;}
  }
  if(!allow(req.socket.remoteAddress||"unknown")){res.writeHead(429,{"Retry-After":"60"}).end("Rate limited");return;}
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Expose-Headers","Mcp-Session-Id");
  const server=createMcp();
  const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
  res.on("close",()=>{transport.close().catch(()=>{});server.close().catch(()=>{})});
  try{
   await server.connect(transport);
   await transport.handleRequest(req,res);
  }catch(err){
   console.error(JSON.stringify({event:"mcp_failure",error:String(err?.message||"unknown").slice(0,200)}));
   if(!res.headersSent)res.writeHead(500).end("Internal MCP error");
  }
 });
}
if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const http=createHttpServer();http.listen(PORT,"0.0.0.0",()=>{
  console.log(JSON.stringify({event:"listening",port:PORT,path:"/mcp",tools:PRODUCTS.map(p=>p.tool)}));
 });
 const shutdown=()=>http.close(()=>process.exit(0));
 process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);
}
