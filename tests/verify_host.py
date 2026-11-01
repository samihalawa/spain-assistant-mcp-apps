"""Local SDK browser fixture; does not establish ChatGPT/Claude host acceptance."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
from datetime import datetime,timezone
import json,copy
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'verification';SHOTS=OUT/'screenshots';SHOTS.mkdir(parents=True,exist_ok=True)
SLUGS=['licita-espana','ayudas-espana','boe-impact','borme-intelligence','catastro-pro','ine-evidence','spain-open-data']
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
checks=[]
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(channel='chrome',headless=True)
  for slug in SLUGS:
   sample=json.loads((ROOT/'plugins'/slug/'skills'/slug/'references/demo.json').read_text())['result']
   for width,height,label in [(1280,900,'desktop'),(390,844,'mobile')]:
    ctx=browser.new_context(viewport={'width':width,'height':height})
    ctx.route('**/*',lambda route:route.continue_() if route.request.url.startswith('http://127.0.0.1:') else route.abort())
    ctx.add_init_script("Object.defineProperty(navigator,'clipboard',{value:{writeText:async(t)=>{window.__copied=t}}});")
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/mcp-apps/tests/host-fixture.html?slug={slug}')
    page.wait_for_function('window.ready===true',timeout=12000)
    page.evaluate('(value)=>window.deliver(value)',sample)
    frame=page.frames[1]
    frame.locator('.card').first.wait_for()
    count=frame.locator('.card').count();assert count>0
    assert not frame.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(slug,label,'overflow')
    assert frame.locator('#sources li').count()==len(sample['sources'])
    frame.locator('#filter').fill('UNLIKELY_MATCH_928374')
    assert frame.locator('.card').count()==0
    frame.locator('#filter').fill('');assert frame.locator('.card').count()==count
    frame.locator('#toggle').click();assert frame.locator('#toggle').inner_text()=='Vista resumida'
    if slug=='ine-evidence':
     assert 'Cambio absoluto' in frame.locator('.card').inner_text()
     assert '0,41' in frame.locator('.card').inner_text()
     assert '0.409999999' not in frame.locator('.card').inner_text()
    frame.locator('#export').click();assert frame.evaluate('window.__copied').startswith(frame.locator('#name').inner_text())
    page.screenshot(path=str(SHOTS/f'{slug}-sdk-fixture-{label}.png'),full_page=True)
    partial={**sample,'coverage':{**sample['coverage'],'partial':True}}
    page.evaluate('(value)=>window.deliver(value)',partial)
    assert 'parcial' in frame.locator('#status').inner_text()
    error={'ok':False,'error':{'message':'Fixture source unavailable'},'sources':[],'coverage':{}}
    page.evaluate('(value)=>window.deliver(value)',error)
    assert 'No verificado' in frame.locator('#status').inner_text()
    assert frame.locator('.card').count()==0
    assert not errors,(slug,label,errors)
    checks.append({'slug':slug,'view':label,'cards':count,'sdk_handshake':True,'filter':True,'copy':True,'detail_toggle':True,'partial_error_states':True,'overflow':False,'javascript_errors':errors})
    ctx.close()
   print('SDK_UI_PASS',slug,flush=True)
  browser.close()
finally:server.shutdown();server.server_close()
(OUT/'sdk-ui-verification.json').write_text(json.dumps({'checked_at':datetime.now(timezone.utc).isoformat(),'scope':'Isolated localhost AppBridge SDK fixture with archived 2026-10-20 source results. Not an actual ChatGPT/Claude host. External requests blocked.','views':len(checks),'checks':checks},indent=2)+'\n')
