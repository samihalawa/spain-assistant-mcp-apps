#!/usr/bin/env python3
"""Render seven sourced, domain-specific Spanish public-data websites. No invented data."""
from pathlib import Path
from datetime import datetime
from decimal import Decimal,InvalidOperation
import html,json,re,urllib.parse,shutil
import argparse
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument("--plugins-root",type=Path,required=True)
args=parser.parse_args()
SRC=args.plugins_root.resolve()
DESIGN=Path(__file__).resolve().parent
ROOT=SRC
CONFIG=[
("licita-espana","Licita España","CONTRATACIÓN PÚBLICA","PLACSP","#315a50","Evalúa licitaciones.","Con el expediente delante.","Encuentra oportunidades públicas y contrasta los plazos, presupuestos y requisitos con el perfil oficial. Una alerta reciente no significa que aún puedas presentar una oferta.","Busca licitaciones de software y señala las fechas, los órganos y las condiciones que quedan por verificar.","Consultoras, pymes y profesionales que trabajan con contratación pública.","No cubre todas las licitaciones de España, no comprueba automáticamente los pliegos ni firma o presenta ofertas."),
("ayudas-espana","Ayudas España","SUBVENCIONES Y AYUDAS","BDNS","#44654c","Financiación pública.","Con requisitos a la vista.","Consulta subvenciones y comprueba a quién van dirigidas, qué fechas constan y qué es necesario verificar en sus bases reguladoras.","Busca subvenciones para autónomos del sector tecnológico en Madrid y distingue condiciones confirmadas de requisitos pendientes.","Autónomos, empresas y asociaciones que buscan financiación pública.","Una ficha BDNS no garantiza elegibilidad. Las bases, modificaciones y sede oficial determinan el acceso y los plazos."),
("boe-impact","BOE Impact","TEXTOS NORMATIVOS","BOE","#505e69","Las normas cambian.","El texto conserva la prueba.","Compara artículos por fecha con el texto original delante. La diferencia documental debe estar separada de su interpretación jurídica.","Compara el artículo 118 de la Ley de Contratos del Sector Público entre dos fechas e identifica cambios exactos.","Asesorías, departamentos jurídicos y profesionales que revisan normativa.","Un cambio textual no prueba por sí solo su aplicación a un caso, el régimen transitorio o la conformidad jurídica."),
("borme-intelligence","BORME Intelligence","PUBLICACIONES SOCIETARIAS","BORME","#755b4f","Actos societarios.","Publicados y verificables.","Investiga anuncios mercantiles con fecha y texto verificables. Una publicación no es una certificación actualizada de la sociedad.","Busca anuncios de una empresa en una provincia y distingue publicación, inscripción y acto descrito.","Equipos B2B, consultoras y profesionales que investigan información registral.","Los anuncios no representan un historial societario completo ni permiten inferir insolvencia o titulares reales."),
("catastro-pro","Catastro Pro","DATOS CATASTRALES","Catastro","#526857","Una referencia catastral.","Los datos en su contexto.","Convierte una referencia catastral en una ficha precisa: uso, superficies y año declarado, con una distinción clara respecto del Registro de la Propiedad.","Consulta esta referencia y explica qué superficies constan y cuáles son los límites de la información catastral.","Arquitectos, agentes inmobiliarios y equipos de documentación técnica.","La descripción catastral no acredita propiedad, valor de mercado, límites físicos ni permisos urbanísticos."),
("ine-evidence","INE Evidence","ESTADÍSTICA OFICIAL","INE","#425f75","Cifras oficiales.","Sin perder el contexto.","Presenta valores estadísticos con sus periodos y unidades. Conserva la serie y la base antes de comparar observaciones.","Muestra observaciones del IPC de la misma serie e indica su periodo, unidad y actualidad.","Analistas, periodistas, investigadores y consultores cuantitativos.","Una serie histórica disponible no es necesariamente la serie vigente ni autoriza previsiones o comparaciones incompatibles."),
("spain-open-data","Spain Open Data","DATOS ABIERTOS","datos.gob.es","#6a6750","Datos abiertos.","La selección importa.","Compara datasets españoles según su origen, formatos, fechas y licencias declaradas, antes de incorporarlos a un proyecto.","Busca datasets sobre empleo y compara su publicador, formato, licencia declarada y fecha de actualización.","Desarrolladores, analistas y responsables de reutilización de datos.","Un dataset en el catálogo no acredita descarga, calidad, actualidad ni permisos efectivos de redistribución.")]
SLUGS=[x[0] for x in CONFIG]
CATS={
"licita-espana":["Expediente y organismo","Presupuesto sin IVA","Fecha publicada"],
"ayudas-espana":["Número oficial BDNS","Modalidad de convocatoria","Plazo y beneficiarios"],
"boe-impact":["Bloque y fecha","Redacción anterior","Redacción posterior"],
"borme-intelligence":["Sociedad y publicación","Texto de los actos","Documento registral"],
"catastro-pro":["Referencia catastral","Superficies y uso","Año de construcción"],
"ine-evidence":["Serie y unidad","Período observado","Dato y comparabilidad"],
"spain-open-data":["Publicador original","Distribuciones y formato","Licencia y actualización"]}
STEPS={
"licita-espana":[("Localiza","Delimita el feed oficial y conserva cada referencia."),("Contrasta","Verifica fechas, órgano, presupuesto y estado."),("Prepara","Examina PCAP, PPT y correcciones antes de decidir.")],
"ayudas-espana":[("Localiza","Consulta los registros de la Base de Datos Nacional de Subvenciones."),("Contrasta","Separa convocatorias de concesiones directas y revisa plazos."),("Verifica","Comprueba bases, beneficiarios y sede de solicitud.")],
"boe-impact":[("Localiza","Identifica la disposición y el bloque de texto oficial."),("Compara","Recupera dos versiones con fechas explícitas."),("Interpreta","Verifica la publicación y posibles disposiciones transitorias.")],
"borme-intelligence":[("Delimita","Selecciona sociedad, provincia y fechas."),("Examina","Lee los anuncios y conserva su referencia."),("Contrasta","Distingue hecho publicado de conclusión económica.")],
"catastro-pro":[("Identifica","Comprueba referencia de parcela o inmueble."),("Examina","Consulta descripción y superficies con unidades."),("Distingue","Separa datos públicos de titularidad y urbanismo.")],
"ine-evidence":[("Selecciona","Elige una operación y un código de serie."),("Comprueba","Revisa período, base, unidad y valores."),("Compara","Calcula solamente con datos comparables.")],
"spain-open-data":[("Busca","Define materia, territorio y granularidad."),("Filtra","Revisa formatos, licencias y publicaciones."),("Valida","Abre la fuente original antes de reutilizar.")]}
def e(x):return html.escape("" if x is None else str(x),quote=True)
def t(x):return "No consta" if x is None else (json.dumps(x,ensure_ascii=False) if isinstance(x,(dict,list)) else str(x))
def trunc(x,n=130):
 x=" ".join(t(x).split());return x[:n-1].rstrip()+"…" if len(x)>n else x
def safe_url(s):
 if not isinstance(s,str):return None
 try:
  v=urllib.parse.urlsplit(s)
  return s if v.scheme=="https" and v.hostname and not v.username and not v.password and not any(ord(c)<32 for c in s) else None
 except ValueError:return None
def a(url,label="Ver fuente ↗",cls=""):
 return f'<a class="{e(cls)}" href="{e(url)}" rel="noopener noreferrer" target="_blank">{e(label)}</a>' if safe_url(url) else ""
def dt(x):
 m=re.match(r"\d{4}-\d{2}-\d{2}",str(x or ""));return m.group(0) if m else "No consta"
def money(x):
 try:
  value=Decimal(str(x))
  if not value.is_finite():return t(x)
  return (f"{value:,.0f}" if value==value.to_integral_value() else f"{value:,.2f}").replace(",","_").replace(".",",").replace("_",".")
 except (ValueError,InvalidOperation):return t(x)
def attributes(i,title,date="",extra=""):
 text=trunc(str(title)+" "+str(extra),1700)
 return f'data-record data-original="{i}" data-date="{e(dt(date))}" data-title="{e(trunc(title,240))}" data-search="{e(text)}"'
def sample(slug):
 path=SRC/slug/"skills"/slug/"references/demo.json"
 obj=json.loads(path.read_text())
 assert obj["result"].get("ok") and obj["result"].get("sources") and obj.get("captured_at"),slug
 return obj
def board_date(d):return dt(d["captured_at"])
def bucket(s):
 if s=="past_end_date":return "Plazo publicado vencido","expired"
 if s in ("within_published_dates","ends_today_check_time","end_date_ahead_start_unverified"):return "Revisar plazo actual","review"
 return "Plazo sin verificar","dim"
def board(slug,d):
 data=d["result"]["data"]
 if slug in ("licita-espana","ayudas-espana"):
  names=["Expediente","Objeto","Órgano","Presupuesto sin IVA","Fecha","Comprobación"] if slug=="licita-espana" else ["BDNS","Convocatoria","Modalidad","Cierre","Comprobación"]
  out=['<div class="scroll-table"><table class="data-table records-table" data-export><caption class="visually-hidden">Muestra histórica de datos oficiales</caption><thead><tr>']
  out.extend(f"<th scope=col>{e(n)}</th>" for n in names)
  out.append('</tr></thead><tbody id="records-body">')
  for i,r in enumerate(data):
   q=r.get("deadline_assessment") or {}
   label,css=bucket(q.get("date_state"))
   if slug=="licita-espana":
    cells=[f'<span class="mono">{e(r.get("reference") or "No consta")}</span>',
       a(r.get("official_url"),trunc(r.get("title"),120),"row-link"),
       e(trunc(r.get("authority"),88)),f'<span class="mono">{e(money(r.get("budget_excluding_tax")))} {e(r.get("currency") or "")}</span>',
       f'<span class="mono">{e(dt(r.get("deadline_date")))}</span>',
       f'<span class="status {css}">{e(label)}</span>']
    title=r.get("title");date=r.get("deadline_date")
   else:
    cells=[f'<span class="mono">{e(r.get("bdns_number"))}</span>',
      a(r.get("official_url"),trunc(r.get("title"),140),"row-link"),
      e(trunc(r.get("call_type"),62)),f'<span class="mono">{e(dt(q.get("end_date")))}</span>',
      f'<span class="status {css}">{e(label)}</span>']
    title=r.get("title");date=q.get("end_date")
   out.append(f'<tr {attributes(i,title,date,r.get("reference",r.get("bdns_number")))}>'+ "".join(f'<td data-label="{e(names[j])}">'+c+'</td>' for j,c in enumerate(cells))+'</tr>')
  out.append("</tbody></table></div>")
  return "".join(out)
 if slug=="boe-impact" and isinstance(data,list):
  out=['<div class="event-timeline" id="records-body">']
  for i,r in enumerate(data):
   selected=r.get("selected_version") or {}
   version=selected.get("fecha_vigencia") or selected.get("fecha_publicacion") or "No consta"
   out.append(f'<article class="event-entry" {attributes(i,r.get("title"),extra=r.get("excerpt"))}><div class="event-date">BOE · Bloque {e(r.get("block_id"))} · Versión {e(version)}</div><h4>{e(r.get("title"))}</h4><p>{e(r.get("excerpt") or "Sin texto para la fecha seleccionada")}</p><div class="meta">Extracto archivado; conserva el identificador y verifica el texto completo antes de interpretar su aplicación.</div></article>')
  out.append('</div>');return ''.join(out)
 if slug=="boe-impact":
  r=data;old=r.get("older_text") or "";new=r.get("newer_text") or ""
  def clause(txt):return e(txt[:1500].rstrip())+("… [extracto; texto completo en fuente]" if len(txt)>1500 else "")
  return f'''<div class="legal-columns"><div class="legal-col"><div class="document-label"><span>VERSIÓN ANTERIOR</span><span class="document-date">{e(r.get("older_date"))}</span></div><div class="legal-body">{clause(old)}</div></div><div class="legal-col"><div class="document-label"><span>VERSIÓN POSTERIOR</span><span class="document-date">{e(r.get("newer_date"))}</span></div><div class="legal-body">{clause(new)}</div></div></div><div class="canonical-note" style="margin:0 28px 23px">Ley {e(r.get("law_id"))} · Bloque {e(r.get("block_id"))} · Cambio textual: <strong>{"detectado" if r.get("changed") else "no detectado"}</strong>. La aplicación jurídica requiere comprobar los actos modificadores y el régimen transitorio.</div>'''
 if slug=="borme-intelligence":
  out=['<div class="event-timeline" id="records-body">']
  for i,r in enumerate(data):
   out.append(f'<div class="event-entry" {attributes(i,r.get("heading"),r.get("publication_date"),r.get("text"))}><div class="event-date">BORME · {e(dt(r.get("publication_date")))} · {e(r.get("province") or "Provincia no indicada")}</div><h4>{a(r.get("official_url"),trunc(r.get("heading"),160))}</h4><p>{e(trunc(r.get("text"),950))}</p><div class="meta">{e(r.get("document_id") or "Sin referencia de documento")}</div></div>')
  out.append('</div>');return "".join(out)
 if slug=="catastro-pro":
  r=data.get("property",data);metrics=[("SUPERFICIE CONSTRUIDA",money(r.get("built_area_m2")),"m²","No equivale a superficie útil."),("SUPERFICIE DE PARCELA",money(r.get("parcel_area_m2")),"m²","Puede incluir más de una unidad."),("AÑO DECLARADO",t(r.get("construction_year")),"","Dato descriptivo del Catastro.")]
  cards="".join(f'<div class="fact"><span class="fact-label">{e(name)}</span><div class="fact-value">{e(val)} <span class="fact-unit">{e(unit)}</span></div><div class="fact-note">{e(note)}</div></div>' for name,val,unit,note in metrics)
  fields=[("Referencia",r.get("reference")),("Dirección registrada",r.get("address")),("Uso registrado",r.get("use")),("Tipo de parcela",r.get("parcel_type"))]
  dl="".join(f'<div><dt>{e(name)}</dt><dd>{e(value or "No consta")}</dd></div>' for name,value in fields)
  return f'<div class="facts-grid">{cards}</div><dl class="facts-list">{dl}</dl>'
 if slug=="ine-evidence":
  r=data
  if "older_period" in r:
   r={**r,"Nombre":r.get("series_name"),"COD":r.get("series_code"),"T3_Unidad":r.get("unit"),"Data":[{"Fecha":r["older_period"],"Valor":r["older_value"]},{"Fecha":r["newer_period"],"Valor":r["newer_value"]}]}
  points=sorted([x for x in r.get("Data",[]) if isinstance(x,dict) and isinstance(x.get("Valor"),(int,float)) and x.get("Fecha")],key=lambda x:dt(x["Fecha"]))[-12:]
  if len(points)<2:return '<div class="canonical-note">La captura no incluye dos observaciones numéricas.</div>'
  v=[float(x["Valor"]) for x in points];lo=min(v);hi=max(v);span=max(.25,hi-lo);lo-=span*.13;hi+=span*.13
  width,height,left,top=580,230,52,20
  innerw,innerh=500,156
  xy=[(left+i*innerw/(len(v)-1),top+(hi-value)/(hi-lo)*innerh) for i,value in enumerate(v)]
  line=" ".join(f"{x:.1f},{y:.1f}" for x,y in xy)
  grids="".join(f'<line x1="{left}" y1="{top+i*innerh/3:.1f}" x2="{left+innerw}" y2="{top+i*innerh/3:.1f}" stroke="#dce0dd"/><text x="{left-8}" y="{top+i*innerh/3+3:.1f}" text-anchor="end" font-size="10" fill="#72817a" font-family="monospace">{hi-(hi-lo)*i/3:.1f}</text>' for i in range(4))
  dots="".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.8" fill="#425f75"/>' for x,y in xy)
  labels="".join(f'<text x="{xy[i][0]:.1f}" y="215" text-anchor="middle" font-size="10" fill="#72817a" font-family="monospace">{e(dt(points[i]["Fecha"])[:7])}</text>' for i in sorted(set([0,len(points)//2,len(points)-1])))
  title=trunc(r.get("Nombre"),95);unit=r.get("T3_Unidad") or "Unidad no indicada";older=money(points[-2]["Valor"]);newer=money(points[-1]["Valor"])
  chart=f'<svg role="img" aria-label="{e(title)}: valores de una serie histórica del INE entre {e(dt(points[0]["Fecha"]))} y {e(dt(points[-1]["Fecha"]))}. Escala vertical ampliada, no comienza en cero." viewBox="0 0 580 230">{grids}<polyline fill="none" stroke="#425f75" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="{line}"/>{dots}{labels}</svg>'
  return f'<div class="chart-workspace"><div class="chart-col"><div class="chart-description"><strong>{e(title)}</strong><span>{e(unit)}</span></div>{chart}<div class="subtext">Eje vertical ampliado para mostrar variaciones. No es una predicción; verifica la serie vigente.</div></div><dl class="chart-stats"><dt>ÚLTIMA OBSERVACIÓN DE LA CAPTURA</dt><dd>{e(newer)} <small>{e(dt(points[-1]["Fecha"]))}</small></dd><dt>OBSERVACIÓN ANTERIOR</dt><dd>{e(older)}</dd><dt>CÓDIGO INE</dt><dd class="mono">{e(r.get("COD"))}<small>Conserva base, unidad y ámbito al comparar.</small></dd></dl></div>'
 if slug=="spain-open-data":
  out=['<div class="catalog-list" id="records-body">']
  for i,r in enumerate(data):
   fmts=[]
   for dist in r.get("distributions",[]):
    fmt=(dist.get("format") or "").rsplit("/",1)[-1]
    if fmt and fmt not in fmts:fmts.append(fmt)
   forms="".join(f'<span class="data-format">{e(fmt)}</span>' for fmt in fmts[:4]) or '<span class="small">No indicado</span>'
   publisher=(r.get("publisher") or "").rsplit("/",1)[-1]
   status="Licencia declarada" if r.get("license") else "Licencia no indicada"
   out.append(f'<article class="dataset-row" {attributes(i,r.get("title"),r.get("modified"),publisher)}><div class="row-no">{i+1:02d}</div><div><h4>{a(r.get("catalog_url"),trunc(r.get("title"),125))}</h4><div class="small">Publicador: {e(trunc(publisher or "No consta",85))}</div></div><div class="format-column"><span class="dataset-label">FORMATOS</span>{forms}</div><div class="last-column"><span class="dataset-label">REUTILIZACIÓN</span><span class="small">{e(status)}</span><div class="subtext">{e(trunc(r.get("modified"),30))}</div></div></article>')
  out.append("</div>");return "".join(out)
 raise KeyError(slug)
def board_header(conf,d,interactive):
 slug,name,_,source,*_=conf
 return f'''<div class="snapshot-head"><div><h3>Documento de muestra · {e(source)}</h3><p>Consulta archivada para demostrar el producto y su trazabilidad</p></div><div class="snapshot-actions"><span class="historical">Captura {e(board_date(d))} · No en vivo</span>{'' if interactive else '<a class="text-action" href="mcp-preview.html">Abrir vista documental ↗</a>'}</div></div>'''
def board_panel(conf,d,interactive=False):
 slug=conf[0]
 source=d["result"]["sources"][0]
 return f'''<div class="snapshot-shell">{board_header(conf,d,interactive)}<div class="snapshot-body">{board(slug,d)}</div><div class="snapshot-footer"><p><span class="source-identity">{e(conf[3])}</span> · {len(d["result"]["sources"])} fuente(s) consultada(s) · Datos históricos</p>{a(source.get("url"),"Abrir publicación de origen ↗","text-action")}</div></div>'''
def site_nav(conf):
 slug,name=conf[:2]
 return f'''<nav class="site-nav" aria-label="Navegación principal"><div class="wrap nav-inside"><a class="identity" href="index.html"><span class="symbol" aria-hidden="true">SH</span><span class="brand">{e(name)}<small>Sami Halawa · Software independiente</small></span></a><div class="main-links"><a href="index.html#metodo">Método</a><a href="mcp-preview.html">Ver resultado</a><a href="https://github.com/samihalawa/{e(slug)}">Código abierto ↗</a></div></div></nav>'''
def site_footer(conf):
 slug,name=conf[:2];repo=f"https://github.com/samihalawa/{slug}"
 return f'''<footer class="footer"><div class="wrap footer-content"><div><span class="tiny-label">SAMI HALAWA / SOFTWARE</span><p class="footer-info">Producto independiente, no afiliado a ningún organismo público. Una muestra histórica no acredita vigencia, elegibilidad ni exhaustividad. © 2026 Sami Halawa.</p></div><div class="footer-links"><a href="{repo}/blob/main/PRIVACY.md">Privacidad</a><a href="{repo}/blob/main/TERMS.md">Condiciones</a><a href="{repo}/blob/main/SUPPORT.md">Soporte</a><a href="{repo}">GitHub</a></div></div></footer><div class="visually-hidden" id="status-live" role="status" aria-live="polite"></div>'''
def document(conf,body,kind="index"):
 slug,name,category,_,color=conf[:5]
 title=name+(" · Vista documental" if kind=="preview" else " · Informe de ejemplo" if kind=="report" else " · Datos públicos con evidencia")
 desc=conf[7]
 repo=f"https://github.com/samihalawa/{slug}"
 metadata={"@context":"https://schema.org","@type":"SoftwareApplication","name":name,"description":desc,"applicationCategory":"BusinessApplication","operatingSystem":"Web / compatible assistant host","url":f"https://samihalawa.github.io/{slug}/","author":{"@type":"Person","name":"Sami Halawa"},"isAccessibleForFree":True}
 rawjson=json.dumps(metadata,ensure_ascii=False).replace("<","\\u003c")
 return f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f8f8f6"><meta name="description" content="{e(desc)}"><title>{e(title)}</title><link rel="canonical" href="https://samihalawa.github.io/{e(slug)}/{'mcp-preview.html' if kind=='preview' else 'demo.html' if kind=='report' else ''}"><meta property="og:type" content="website"><meta property="og:title" content="{e(name)} — {e(conf[5])} {e(conf[6])}"><meta property="og:description" content="{e(desc)}"><meta property="og:url" content="https://samihalawa.github.io/{e(slug)}/"><meta property="og:image" content="https://samihalawa.github.io/{e(slug)}/preview.jpg"><link rel="icon" href="icon.png"><link rel="stylesheet" href="style.css"><script type="application/ld+json">{rawjson}</script><script src="site.js" defer></script></head><body style="--accent:{color}" data-product="{e(slug)}" data-capture="{e(board_date(sample(slug)))}">{body}</body></html>'''
def landing(conf,d):
 slug,name,category,source,color,heading1,heading2,lede,question,role,limits=conf
 number=SLUGS.index(slug)+1
 outcomes="".join(f'<li><span>{i:02d}</span>{e(v)}</li>' for i,v in enumerate(CATS[slug],1))
 steps="".join(f'<div class="process-item"><span class="number">0{i}</span><h3>{e(h)}</h3><p>{e(t)}</p></div>' for i,(h,t) in enumerate(STEPS[slug],1))
 cmd=f"/plugin install {slug} --marketplace samihalawa/{slug}"
 left= f'''<div class="hero-body"><h1>{e(heading1)}<br><em>{e(heading2)}</em></h1><p class="lede">{e(lede)}</p><div class="hero-actions"><a class="primary-link" href="#documento">Examinar un caso <span class="arrow">↗</span></a><a class="ghost-link" href="#instalar">Instalación y código</a></div></div>'''
 right=f'''<aside class="hero-aside"><div><h2>Diseñado para revisar</h2><ol class="outcome-list">{outcomes}</ol></div><p class="hero-side-note">{e(role)}<br>Un informe conserva su fuente, no sustituye una decisión profesional.</p></aside>'''
 hero=f'''<section class="hero"><div class="wrap"><div class="hero-top"><div><span class="hero-index">{number:02d} / 07</span><span class="hero-field">{e(category)}</span></div><div class="hero-source">Fuente de referencia · {e(source)}</div></div><div class="hero-grid">{left}{right}</div><div class="provenance-rail"><span>FUENTE <strong>{e(source)}</strong></span><span>MODELO <strong>LECTURA DOCUMENTAL</strong></span><span>ACCESO <strong>CÓDIGO ABIERTO</strong></span></div></div></section>'''
 intro=f'''<section class="section" id="documento"><div class="wrap"><div class="section-hd"><div><div class="index-line"><span class="section-num">01</span><span class="dash"></span><span class="tiny-label">Un resultado que puedes comprobar</span></div><h2 class="section-title">Los datos primero.<br>La interpretación después.</h2></div><p class="section-intro">La interfaz parte de una captura archivada de la fuente indicada. Fechas, registros y enlaces se conservan para su comprobación, no como datos vigentes.</p></div>{board_panel(conf,d)}</div></section>'''
 method=f'''<section class="section" id="metodo"><div class="wrap"><div class="section-hd"><div><div class="index-line"><span class="section-num">02</span><span class="dash"></span><span class="tiny-label">Proceso</span></div><h2 class="section-title">Del documento a<br>una acción bien fundada.</h2></div><p class="section-intro">Tres operaciones comprensibles. Sin cuestionarios innecesarios, paneles decorativos ni promesas de cobertura total.</p></div><div class="process-grid">{steps}</div></div></section>'''
 examples=f'''<section class="section"><div class="wrap examples-layout"><div><div class="index-line"><span class="section-num">03</span><span class="dash"></span><span class="tiny-label">Primer uso</span></div><h2 class="section-title">Empieza por una pregunta real.</h2><div class="question" id="example-question">{e(question)}</div><button class="flat-button" type="button" data-copy-for="example-question">Copiar pregunta ↗</button></div><div><span class="tiny-label">Límites de la herramienta</span><ul class="support-list"><li>{e(limits)}</li><li>La muestra tiene fecha de consulta y enlaces oficiales. No se han fabricado cifras ni actuaciones.</li><li>La disponibilidad de los sistemas oficiales puede variar; un fallo de origen nunca se presenta como cero resultados.</li></ul></div></div></section>'''
 install=f'''<section class="section" id="instalar"><div class="wrap install-grid"><div><div class="index-line"><span class="section-num">04</span><span class="dash"></span><span class="tiny-label">Distribución</span></div><h2 class="section-title">Un instrumento.<br>Sin otra plataforma que gestionar.</h2><p class="support-detail">Plugin independiente de Claude Code, con flujo y adaptadores Python. No requiere cuenta adicional ni claves de API para consultar datos públicos.</p><div class="command-box"><code id="install-command">{e(cmd)}</code><button class="copy-action" type="button" data-copy-for="install-command">Copiar</button></div><div class="links-stack"><a href="https://github.com/samihalawa/{e(slug)}">Código y documentación ↗</a><a href="mcp-preview.html">Explorar la vista de resultados ↗</a></div></div><aside><span class="tiny-label">Compatibilidad</span><ul class="support-list"><li>Claude Code · plugin instalable con habilidades y scripts.</li><li>Codex · adaptadores ejecutables en un entorno autorizado.</li><li>ChatGPT · el flujo usa herramientas disponibles; una MCP App remota es un producto y revisión separados.</li></ul><p class="support-detail">La demostración visual está alimentada por una consulta pública archivada. No inicia solicitudes a fuentes oficiales mientras navegas.</p></aside></div></section>'''
 return document(conf,site_nav(conf)+"<main>"+hero+intro+method+examples+install+"</main>"+site_footer(conf),"index")
def evidence_section(d):
 sources=d['result'].get('sources',[])
 source_items=[]
 for src in sources[:20]:
  url=src.get('url');host=urllib.parse.urlsplit(url).hostname if safe_url(url) else 'Fuente no verificada'
  source_items.append(f'<li>{a(url,host or "Fuente")}<div class="subtext">Consulta {e(dt(src.get("retrieved_at")))} · SHA-256 {e((src.get("sha256") or "")[:16])}…</div></li>')
 warnings=''.join(f'<li>{e(str(w)[:900])}</li>' for w in d['result'].get('warnings',[])[:15])
 coverage=json.dumps(d['result'].get('coverage',{}),ensure_ascii=False,indent=2,default=str)
 return f'<section class="section" id="evidencia"><div class="index-line"><span class="section-num">02</span><span class="dash"></span><span class="tiny-label">Procedencia y alcance</span></div><h2 class="section-title" style="margin-bottom:25px">La fuente sigue visible.</h2><div class="evidence-grid"><div class="evidence-box"><h4>Consultas oficiales</h4><ul>{"".join(source_items)}</ul></div><div class="evidence-box"><h4>Cobertura registrada</h4><pre>{e(coverage)}</pre></div></div><div class="evidence-box" style="margin-top:20px"><h4>Limitaciones y advertencias</h4><ul>{warnings or "<li>No se registraron advertencias adicionales.</li>"}</ul></div></section>'
def workbench(conf,d,report=False):
 slug,name,category,source,color,head1,head2,lede,question,role,limits=conf
 recorded=d["result"]
 count=len(recorded["data"]) if isinstance(recorded.get("data"),list) else 1
 tools=slug in ("licita-espana","ayudas-espana","borme-intelligence","spain-open-data") or (slug=="boe-impact" and isinstance(recorded.get("data"),list))
 can_csv=slug in ("licita-espana","ayudas-espana")
 sidebar=f'''<aside class="side-nav"><a class="identity" href="index.html"><span class="symbol">SH</span><span class="brand">Spain Evidence<small>Herramientas · España</small></span></a><div class="side-product"><strong>{e(name)}</strong><small>{e(category.title())}</small></div><nav class="side-links" aria-label="Secciones"><a class="side-link current" href="#vista">Documento</a><a class="side-link" href="#evidencia">Fuentes</a><a class="side-link" href="index.html#instalar">Instalación</a></nav><div class="side-footer">SAMI HALAWA / SOFTWARE<br>CAPTURA HISTÓRICA</div></aside>'''
 top=f'<header class="work-header"><div><strong>{e(name)}</strong> <span class="quiet">/ {e(category)}</span></div><div class="quiet">ORIGEN {e(source)} · {e(board_date(d))}</div></header>'
 toolstrip=f'<div class="work-toolbar"><input id="record-search" class="search" type="search" placeholder="Filtrar esta captura…" aria-label="Filtrar registros"><select class="tool-select" id="record-sort" aria-label="Ordenar"><option value="original">Orden original</option><option value="name">Nombre A–Z</option><option value="date">Fecha</option></select>{"<button id=export-csv class=tool-button type=button>Exportar CSV de la muestra</button>" if can_csv else ""}<button class="tool-button" data-copy-for="sample-question" type="button">Copiar consulta</button></div>' if tools else '<div class="work-toolbar"><button class="tool-button" data-copy-for="sample-question" type="button">Copiar consulta</button><a class="text-action" href="#evidencia">Ver fuentes ↗</a></div>'
 body=f'''<div class="work-inner" id="vista"><div class="index-line"><span class="section-num">01</span><span class="dash"></span><span class="tiny-label">Muestra documental</span></div><h1 class="work-h1">{'Informe de ejemplo' if report else 'Revisión de resultados'}</h1><p class="work-intro">{e(lede)}</p><div class="canonical-note"><strong>Captura archivada, no en vivo.</strong> Los datos se recopilaron el {e(board_date(d))}. Los controles filtran registros de esta muestra; no consultan sistemas oficiales ni activan una conexión MCP.</div><nav class="work-tabs"><a class="active" href="#vista">Resultados</a><a href="#evidencia">Fuentes y cobertura</a><a href="index.html">Información del producto</a></nav><div class="work-summary"><span>REGISTROS <strong id="visible-count">{count}</strong></span><span>FUENTES <strong>{len(recorded.get("sources",[]))}</strong></span><span>CAPTURA <strong>{e(board_date(d))}</strong></span><span>ESTADO <strong>HISTÓRICO</strong></span></div><div class="visually-hidden" id="sample-question">{e(question)}</div>{toolstrip}{board_panel(conf,d,True)}<div id="no-records" class="canonical-note" hidden>Sin coincidencias dentro de esta captura histórica.</div>{evidence_section(d)}<div class="links-stack"><a href="index.html">← Regresar al producto</a><a href="https://github.com/samihalawa/{e(slug)}">Código, métodos y limitaciones ↗</a></div></div>'''
 return document(conf,f'<div class="tool-shell">{sidebar}<div class="work-area">{top}{body}{site_footer(conf)}</div></div>',"report" if report else "preview")
def build():
 output=[]
 for conf in CONFIG:
  slug=conf[0];p=SRC/slug;docs=p/"docs";docs.mkdir(exist_ok=True)
  snapshot=sample(slug)
  (docs/"style.css").write_text((DESIGN/"atlas.css").read_text())
  (docs/"site.js").write_text((DESIGN/"atlas.js").read_text())
  (docs/"index.html").write_text(landing(conf,snapshot))
  (docs/"mcp-preview.html").write_text(workbench(conf,snapshot))
  (docs/"demo.html").write_text(workbench(conf,snapshot,True))
  if (p/"assets/icon.png").exists():shutil.copyfile(p/"assets/icon.png",docs/"icon.png")
  output.append({"slug":slug,"sources":len(snapshot["result"]["sources"]),"capture":board_date(snapshot),"size":sum((docs/x).stat().st_size for x in ("index.html","mcp-preview.html","demo.html"))})
 print(json.dumps({"generated":output,"total":len(output)},indent=2,ensure_ascii=False))
if __name__=="__main__":build()
