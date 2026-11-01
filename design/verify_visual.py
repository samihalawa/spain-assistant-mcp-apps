from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
import json,re
import argparse
parser=argparse.ArgumentParser()
parser.add_argument('--isolated-test-browser',action='store_true',help='Local fixture QA only; blocks all non-loopback requests')
parser.add_argument('--plugins-root',type=Path,required=True)
parser.add_argument('--evidence-root',type=Path,required=True)
args=parser.parse_args()
ROOT=args.plugins_root.resolve()
SLUGS=['licita-espana','ayudas-espana','boe-impact','borme-intelligence','catastro-pro','ine-evidence','spain-open-data']
DEST=args.evidence_root.resolve()/'screenshots';DEST.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
results=[];contact=[]
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(channel='chrome',headless=True) if args.isolated_test_browser else pw.chromium.connect_over_cdp('http://127.0.0.1:9222',timeout=12000)
  for slug in SLUGS:
   print('VERIFYING',slug,flush=True)
   for width,height,label in [(1440,900,'desktop'),(768,900,'tablet'),(390,844,'mobile'),(320,740,'small')]:
    context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,accept_downloads=True)
    context.add_init_script("Object.defineProperty(navigator,'clipboard',{value:{writeText:async(t)=>{window.__copied=t}}});")
    context.route('**/*',lambda route:route.continue_() if route.request.url.startswith('http://127.0.0.1:') else route.abort())
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda exc: errors.append(str(exc)))
    for page_name in ['index.html','mcp-preview.html','demo.html']:
     url=f'http://127.0.0.1:{server.server_port}/{slug}/docs/{page_name}'
     response=page.goto(url,wait_until='networkidle')
     assert response.status==200,(slug,label,page_name,'http',response.status)
     assert page.locator('h1').count()==1,(slug,label,page_name,'h1 count')
     assert page.locator('meta[name="description"]').get_attribute('content'),(slug,label,'description')
     assert not errors,(slug,label,page_name,'js',errors)
     overflow=page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')
     assert not overflow,(slug,label,page_name,'overflow',page.evaluate('document.documentElement.scrollWidth'))
     assert page.locator('img:not([alt])').count()==0,(slug,label,page_name,'alt')
     assert page.locator('a[href^="javascript:"]').count()==0,(slug,label,page_name,'unsafe link')
     if page_name=='index.html':
      for btn in page.locator('button[data-copy-for]').all():
       target=btn.get_attribute('data-copy-for')
       btn.click()
       assert page.evaluate('window.__copied')==page.locator('#'+target).inner_text().strip()
     if page_name=='mcp-preview.html' and slug in ['licita-espana','ayudas-espana','boe-impact','borme-intelligence','spain-open-data']:
      records=page.locator('[data-record]')
      total=records.count();assert total>0
      page.locator('#record-search').fill('unlikely_match_928374')
      assert page.locator('[data-record]:visible').count()==0,(slug,'filter did not hide records')
      assert page.locator('#no-records').is_visible()
      assert page.locator('#visible-count').inner_text()=='0'
      page.locator('#record-search').fill('')
      assert page.locator('[data-record]:visible').count()==total
      assert not page.locator('#no-records').is_visible()
      page.locator('#record-sort').select_option('name')
      names=page.locator('[data-record]:visible').evaluate_all('(rows)=>rows.map(x=>x.dataset.title.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es"))')
      assert page.evaluate('(a)=>a.every((v,i)=>!i||a[i-1].localeCompare(v,"es")<=0)',names)
      page.locator('#record-sort').select_option('original')
      if slug in ['licita-espana','ayudas-espana']:
       with page.expect_download() as info:page.locator('#export-csv').click()
       assert info.value.suggested_filename.endswith('.csv')
     if width==1440 and page_name in ['index.html','mcp-preview.html']:
      output=DEST/f'{slug}-{page_name}-desktop.png'
      page.screenshot(path=str(output),full_page=True)
      im=Image.open(output).convert('RGB').crop((0,0,1440,900)).resize((576,360))
      contact.append((slug+' · '+page_name,im))
     if width==390 and page_name in ['index.html','mcp-preview.html']:
      page.screenshot(path=str(DEST/f'{slug}-{page_name}-mobile.png'),full_page=True)
     results.append({'slug':slug,'view':label,'page':page_name,'width':width,'http':response.status,'overflow':False,'javascript_errors':0})
    context.close()
  if args.isolated_test_browser: browser.close()
  # Shared browsers remain open; only contexts created here were closed.
finally:
 server.shutdown();server.server_close()
canvas=Image.new('RGB',(1152,413*7),'#eef0ed')
draw=ImageDraw.Draw(canvas)
for i,(title,im) in enumerate(contact):
 x=(i%2)*576;y=(i//2)*413
 draw.text((x+8,y+6),title,fill='#243231')
 canvas.paste(im,(x,y+27))
canvas.save(DEST/'after-contact.jpg',quality=92)
summary={'pages_tested':len(results),'products':len(SLUGS),'views_per_product':12,'failures':0,'checks':results}
(DEST.parent/'visual-verification.json').write_text(json.dumps(summary,indent=2))
print('VISUAL_PASS',len(results),'screens across',len(SLUGS),'products')
print('CONTACT',DEST/'after-contact.jpg')
