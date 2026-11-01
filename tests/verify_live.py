"""Bounded read-only smoke checks; never overwrite archived demos with live responses."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timezone
import sys,json,time
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'mcp-apps/python'))
from spain_suite import core
products=sorted((ROOT/'plugins').iterdir())
def check(p):
 snapshot=json.loads((p/'skills'/p.name/'references/demo.json').read_text())
 start=time.monotonic();result=core.call_tool(snapshot['tool'],snapshot['arguments'])
 row={'slug':p.name,'tool':snapshot['tool'],'arguments':snapshot['arguments'],'ok':result.get('ok') is True,'returned':len(result['data']) if isinstance(result.get('data'),list) else (1 if result.get('data') else 0),'sources':result.get('sources',[]),'coverage':result.get('coverage'),'error':result.get('error'),'duration_seconds':round(time.monotonic()-start,2)}
 print('LIVE_SMOKE',p.name,row['ok'],row['error'],flush=True)
 return row
with ThreadPoolExecutor(max_workers=2) as pool: rows=list(pool.map(check,products))
(ROOT/'verification/live-smoke.json').write_text(json.dumps({'checked_at':datetime.now(timezone.utc).isoformat(),'scope':'Current read-only requests using exact documented demo arguments. BOE/BORME dates are explicit historical query ranges. Bounded PLACSP responses explicitly preserve partial coverage. Does not validate production endpoint or infrastructure.','checks':rows},indent=2)+'\n')
