"""Inspect the actual bounded live response as an explicitly local SDK fixture."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
import sys,json
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'verification'
sys.path.insert(0,str(ROOT/'plugins/licita-espana/skills/licita-espana/scripts'))
from spain_suite.presentation import render
result=json.loads((OUT/'licita-bounded-live.json').read_text())['result']
(OUT/'licita-current-partial.html').write_text(render(result,'licita_triage',{'name':'Licita España'},'html'))
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start();checks=[]
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(channel='chrome',headless=True)
  for width,height,label in [(1280,900,'desktop'),(390,844,'mobile')]:
   ctx=browser.new_context(viewport={'width':width,'height':height})
   ctx.route('**/*',lambda route:route.continue_() if route.request.url.startswith('http://127.0.0.1:') else route.abort())
   page=ctx.new_page();page.goto(f'http://127.0.0.1:{server.server_port}/mcp-apps/tests/host-fixture.html?slug=licita-espana')
   page.wait_for_function('window.ready===true',timeout=12000)
   page.locator('body > p').evaluate('(node)=>node.textContent="LOCAL SDK FIXTURE · current bounded official-source response from 23 October 2026 · partial coverage · not ChatGPT/Claude host acceptance"')
   page.evaluate('(value)=>window.deliver(value)',result)
   frame=page.frames[1];frame.locator('.card').first.wait_for()
   assert frame.locator('.card').count()==5
   assert 'parcial' in frame.locator('#status').inner_text()
   frame.locator('#evidence summary').click()
   assert 'prefix' in frame.locator('#warnings').inner_text()
   assert not frame.evaluate('document.documentElement.scrollWidth>innerWidth+1')
   page.screenshot(path=str(OUT/'screenshots'/f'licita-current-partial-sdk-{label}.png'),full_page=True)
   page.goto(f'http://127.0.0.1:{server.server_port}/verification/licita-current-partial.html')
   assert 'RESULTADO PARCIAL' in page.inner_text('body')
   assert 'SHA-256 del prefijo' in page.inner_text('body')
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
   page.screenshot(path=str(OUT/'screenshots'/f'licita-current-partial-report-{label}.png'),full_page=True)
   checks.append({'view':label,'sdk_partial_state':True,'sdk_cards':5,'report_partial_label':True,'report_prefix_hash_label':True,'overflow':False})
   ctx.close()
  browser.close()
finally:server.shutdown();server.server_close()
(OUT/'licita-partial-browser.json').write_text(json.dumps({'scope':'Local isolated SDK and exported report displaying the current bounded official-source response, not an actual ChatGPT/Claude host. External requests blocked.','views':4,'checks':checks},indent=2)+'\n')
print('CURRENT_PARTIAL_BROWSER_PASS',4)
