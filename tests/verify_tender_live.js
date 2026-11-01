// Explicit opt-in read-only smoke check; excluded from the offline npm test suite.
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {createHttpServer} from '../src/server.js';
import {writeFileSync} from 'node:fs';
const server=createHttpServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const client=new Client({name:'local-tender-readiness',version:'0.3.0'});
try {
 await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${server.address().port}/mcp`)));
 const started=Date.now();
 const result=await client.callTool({name:'find_spanish_public_tenders',arguments:{query:'software',max_pages:1,limit:6}});
 const data=result.structuredContent;
 writeFileSync(new URL('../../verification/licita-mcp-live.json',import.meta.url),JSON.stringify({checked_at:new Date().toISOString(),duration_seconds:(Date.now()-started)/1000,result},null,2)+'\n');
 console.log(JSON.stringify({ok:data?.ok,isError:result.isError,returned:data?.data?.length,partial:data?.coverage?.partial,sources:data?.sources,error:data?.error,duration_seconds:(Date.now()-started)/1000},null,2));
 if (!data?.ok || !data?.coverage?.partial || !data.sources?.some(s=>s.complete===false)) process.exitCode=1;
} finally {await client.close();await new Promise(resolve=>server.close(resolve));}
