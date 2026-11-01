import { App } from "@modelcontextprotocol/ext-apps";

const doc = document;
const byId = x => doc.getElementById(x);
const params = new URLSearchParams(location.search);
const PRODUCT = "__PRODUCT_SLUG__";
const META = {
 "licita-espana":["Licita España","Decide qué licitación merece tu tiempo","#255b83"],
 "ayudas-espana":["Ayudas España","Revisa convocatorias, requisitos y plazos","#1d7458"],
 "boe-impact":["BOE Impact","Encuentra y compara textos legales oficiales","#76488d"],
 "borme-intelligence":["BORME Intelligence","Revisa actos societarios publicados","#99532e"],
 "catastro-pro":["Catastro Pro","Una referencia, una ficha clara","#217970"],
 "ine-evidence":["INE Evidence","Comprueba cifras, periodos y comparaciones","#325b98"],
 "spain-open-data":["Spain Open Data","Elige un dataset por utilidad y derechos","#70672a"]
};
const [name,promise,color] = META[PRODUCT] || ["Spain Evidence","Datos públicos","#175d77"];
byId("name").textContent=name;byId("promise").textContent=promise;doc.documentElement.style.setProperty("--accent",color);
byId("logo").textContent = name.split(" ").map(x=>x[0]).slice(0,2).join("");
let last = null, visible = [], showingDetail=false;
const app = new App({name:"Spain Evidence",version:"0.3.0"});
const text = (v,max=280) => v==null?"No consta":String(typeof v==="object"?JSON.stringify(v):v).slice(0,max);
const raw = (obj,keys) => keys.map(k=>obj?.[k]).find(x=>x!==null&&x!==undefined&&x!=="");
const getRows = value => {
 const data=value?.data;
 if(Array.isArray(data)) return data;
 if(!data || typeof data!=="object") return [];
 if(Array.isArray(data.points))return data.points;
 if(data.property)return [data.property];
 return [data];
};
const cols = [
 [["title","heading","series_name","address","reference","block_id","dataset_id"],"title"],
 [["review_bucket","event_categories","use","category"],"tag"],
 [["deadline_date","publication_date","end_date","newer_period","modified","updated"],"date"],
 [["official_url","catalog_url","map_url","urlBasesReguladoras"],"link"]
];
function el(tag,attrs={},value=""){
 const node=doc.createElement(tag);for(const [key,val] of Object.entries(attrs)){if(key==="class")node.className=val;else node.setAttribute(key,val)}
 if(value!==undefined&&value!==null)node.textContent=String(value);
 return node;
}
function safeUrl(url){
 try{const u=new URL(url);return ["https:"].includes(u.protocol)&&!u.username&&!u.password?u.href:null}catch{return null}
}
const LABELS={reference:"Referencia",bdns_number:"Número BDNS",authority:"Órgano",province:"Provincia",budget_excluding_tax:"Presupuesto sin IVA",currency:"Moneda",deadline_date:"Cierre publicado",end_date:"Fecha final",date_state:"Estado del plazo",review_bucket:"Prioridad de revisión",beneficiary_types:"Beneficiarios publicados",call_type:"Modalidad",start_date:"Fecha inicial",as_of:"Fecha de referencia",built_area_m2:"Superficie construida (m²)",parcel_area_m2:"Superficie de parcela (m²)",construction_year:"Año declarado",use:"Uso",longitude:"Longitud",latitude:"Latitud",older_period:"Periodo anterior",older_value:"Valor anterior",newer_period:"Periodo posterior",newer_value:"Valor posterior",absolute_change:"Cambio absoluto",percentage_change:"Cambio porcentual",formats:"Formatos",publisher:"Publicador",declared_licence:"Licencia declarada",event_categories:"Actos identificados",available_versions:"Versiones disponibles"};
const numberFormat=new Intl.NumberFormat("es-ES",{maximumFractionDigits:6});
function displayValue(value,key){
 if(typeof value==="number"&&Number.isFinite(value))return numberFormat.format(value)+(key==="percentage_change"?" %":"");
 return text(value,250);
}
function card(row,index){
 const card=el("article",{class:"card"});
 const label=raw(row,cols[1][0]) || name;
 card.append(el("span",{class:"tag"},text(label,100)));
 const title=raw(row,cols[0][0]) || `Resultado ${index+1}`;
 card.append(el("h2",{},text(title,180)));
 const subtitle=raw(row,cols[2][0]);
 if(subtitle)card.append(el("p",{class:"meta"},text(subtitle)));
 const detail=el("dl");
 const priority=["reference","bdns_number","authority","province","budget_excluding_tax","currency","deadline_date","end_date","date_state","review_bucket","beneficiary_types","call_type","start_date","as_of","built_area_m2","parcel_area_m2","construction_year","use","longitude","latitude","older_period","older_value","newer_period","newer_value","absolute_change","percentage_change","formats","publisher","declared_licence","event_categories","available_versions"];
 const omit=new Set(["title","heading","official_url","catalog_url","map_url","text","description","distributions","warnings","sources","notes","next_action","detail_error","map_url"]);
 let n=0;
 for(const key of priority){if(!(key in row)||omit.has(key)||row[key]==null)continue;
   if(n>= (showingDetail?16:5))break;
   const dt=el("dt",{},LABELS[key]||key.replaceAll("_"," ")),dd=el("dd",{},displayValue(row[key],key));
   detail.append(dt,dd);n++;
 }
 card.append(detail);
 const link=raw(row,cols[3][0]);
 if(safeUrl(link)){const a=el("a",{href:safeUrl(link),target:"_blank",rel:"noopener noreferrer"},"Ver fuente oficial ↗");card.append(a)}
 if(row.next_action)card.append(el("p",{class:"meta"},text(row.next_action,280)));
 return card;
}
function render(){
 const container=byId("cards");container.replaceChildren();
 const all=getRows(last),q=byId("filter").value.toLocaleLowerCase().trim();
 visible=all.filter(r=>!q||JSON.stringify(r).toLocaleLowerCase().includes(q));
 visible.slice(0,40).forEach((r,i)=>container.append(card(r,i)));
 if(!visible.length)container.append(el("div",{class:"empty"},last?.ok===false?"La consulta no se completó. Revisa el error y la fuente.":q?"Ninguna coincidencia en los resultados mostrados.":"Sin resultados dentro de la cobertura comprobada."));
 const partial=last?.coverage?.partial;const error=last?.error;
 byId("status").textContent=error?`No verificado: ${text(error.message,180)}`:partial?"Resultado parcial. Hay fuentes o días que no pudieron comprobarse.":"Datos recibidos; consulta las fuentes y los límites antes de actuar.";
 byId("status").className=error?"error":"";
 const chips=[`${all.length} resultados`,`${last?.sources?.length||0} fuentes`,partial?"Cobertura parcial":"Cobertura declarada"];
 byId("indicators").replaceChildren(...chips.map(x=>el("span",{class:"chip"},x)));
 const sources=byId("sources");sources.replaceChildren();
 for(const src of last?.sources||[]){const li=el("li");const url=safeUrl(src.url);if(url){const a=el("a",{href:url,target:"_blank",rel:"noopener noreferrer"},new URL(url).hostname+" · "+text(src.retrieved_at,24));li.append(a);}else li.textContent="Fuente no disponible";sources.append(li)}
 byId("coverage").textContent=JSON.stringify(last?.coverage||{},null,2);
 byId("warnings").replaceChildren(...(last?.warnings||[]).slice(0,15).map(x=>el("li",{},text(x,1200))));
}
function ingest(result){
 let value=result?.structuredContent;
 if(!value){const entry=result?.content?.find(x=>x.type==="text");if(entry){try{value=JSON.parse(entry.text)}catch{value={ok:false,error:{message:"Respuesta no estructurada"}}}}}
 if(!value||typeof value!=="object")return;
 last=value;
 render();
}
app.ontoolresult=ingest;
byId("filter").addEventListener("input",render);
byId("toggle").addEventListener("click",()=>{showingDetail=!showingDetail;byId("toggle").textContent=showingDetail?"Vista resumida":"Detalles";render()});
byId("export").addEventListener("click",async()=>{
 if(!last)return;
 const lines=[name,`Resultados: ${visible.length}`,...visible.map((v,i)=>`${i+1}. ${text(raw(v,cols[0][0]),150)} · ${text(raw(v,cols[3][0]),200)}`),JSON.stringify(last.coverage||{})];
 try{await navigator.clipboard.writeText(lines.join("\n"));byId("export").textContent="Copiado ✓"}catch{byId("export").textContent="Copia no disponible";}
});
app.connect().catch(()=>{byId("status").textContent="El anfitrión todavía no ha conectado la vista MCP. Los resultados siguen accesibles mediante la herramienta.";});
