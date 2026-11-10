import {readFileSync} from 'node:fs';
const downloads=JSON.parse(readFileSync(new URL('../public/downloads/manifest.json',import.meta.url),'utf8')).downloads;
// Public directory only. Product identity and installation data belong here.
export const CATEGORIES = Object.freeze([
 {slug:'espana',name:'España',description:'Ayudas, contratación, normativa, empresas, territorio y datos públicos de España.'},
 {slug:'finanzas',name:'Finanzas',description:'Herramientas para consultar cuentas y trabajar con información financiera.'},
 {slug:'productividad',name:'Productividad',description:'Revisión de trabajo y operaciones con tus herramientas conectadas.'},
 {slug:'comunicacion',name:'Comunicación',description:'Herramientas para conversaciones profesionales y trabajo en red.'},
 {slug:'desarrollo',name:'Desarrollo',description:'Integraciones y herramientas para trabajar con otros asistentes.'},
]);
const spain = (slug,name,summary,details,requirements,source) => ({slug,name,version:downloads.find(bundle=>bundle.slug===slug)?.version,category:'espana',summary,details,requirements,source,icon:`${slug}.png`,platforms:['chatgpt','claude-code','codex'],kind:'Conector remoto + skills',endpoint:`https://aiplugins.megawebs.com/mcp/${slug}`,repository:`https://github.com/samihalawa/${slug}`,claudeCommand:null});
const SEARCH_KEYWORDS = Object.freeze({
 'ayudas-espana':['ayudas','subvenciones','financiación','convocatorias','autónomos'],
 'licita-espana':['licitaciones','contratación pública','concursos','proveedores','CPV'],
 'boe-impact':['ley','leyes','legislación','normativa','artículos','BOE'],
 'borme-intelligence':['empresa','empresas','sociedad','sociedades','registro mercantil','BORME'],
 'catastro-pro':['inmueble','inmuebles','vivienda','propiedad','referencia catastral','coordenadas'],
 'ine-evidence':['estadística','estadísticas','economía','indicadores','IPC','series'],
 'spain-open-data':['datos abiertos','datasets','reutilización','licencias','catálogo'],
 'bunq-banking-mcp':['banca','banco','cuentas','finanzas','movimientos','suscripciones','conciliación'],
 'morning-operator':['productividad','pendientes','tareas','revisión','trabajo','operaciones'],
 'magicinterview':['entrevistas','reuniones','llamadas','respuestas en vivo','conversación','CV'],
 'linkedin-godmode-plugin':['LinkedIn','red profesional','navegador','contactos','sesión'],
 'grokbot':['Grok','Grok Bot','asistentes','consultas','exportar','desarrollo'],
});
export const CATALOG = Object.freeze([
 spain('ayudas-espana','Ayudas España','Busca subvenciones de BDNS y compara plazos, publicaciones y requisitos pendientes.','Consulta registros reales de convocatorias por término y página, con fechas y enlaces de la publicación original.','Sin API key ni Python local. Comprueba los requisitos de cada convocatoria; el plugin no presenta solicitudes.','BDNS'),
 spain('licita-espana','Licita España','Localiza licitaciones públicas por tema, CPV y plazo en el feed oficial.','Devuelve oportunidades con presupuesto, fechas, identificadores y enlaces de origen.','Sin API key ni Python local. La consulta cubre una ventana acotada del feed PLACSP, no todas las licitaciones. No presenta ofertas.','PLACSP'),
 spain('boe-impact','BOE Impact','Localiza artículos dentro de una norma consolidada del BOE.','Busca por título o texto y conserva identificadores de los artículos, versión y enlaces para contrastar el documento.','Requiere el identificador BOE de una ley. Sin API key ni Python local. La comparación y la aplicabilidad requieren revisión documental.','BOE'),
 spain('borme-intelligence','BORME Intelligence','Consulta anuncios mercantiles de una sociedad por provincia y fechas.','Revisa actos publicados en el BORME y conserva el documento original y el alcance de la búsqueda.','Nombre de sociedad y periodo de hasta siete días. Sin API key ni Python local. No certifica identidad ni solvencia y no activa seguimiento.','BORME'),
 spain('catastro-pro','Catastro Pro','Obtén datos públicos descriptivos a partir de una referencia catastral.','Devuelve una ficha del inmueble y coordenadas EPSG:4326, con avisos de respuestas parciales.','Requiere una referencia catastral válida. Sin API key ni Python local. No identifica propietarios ni certifica titularidad o linderos.','Catastro'),
 spain('ine-evidence','INE Evidence','Compara observaciones de una serie del INE con unidades y periodos.','Muestra valores comparables, diferencia absoluta y variación aritmética cuando puede calcularse.','Requiere un código de serie oficial. Sin API key ni Python local. La última observación de una serie puede ser histórica.','INE'),
 spain('spain-open-data','Spain Open Data','Compara datasets de datos.gob.es por formato, publicador y licencia.','Consulta metadatos del catálogo nacional para identificar conjuntos de datos y comprobar lagunas antes de reutilizarlos.','Sin API key ni Python local. No descarga los archivos ni verifica su contenido; comprueba la licencia original.','datos.gob.es'),
 {slug:'bunq-banking-mcp',name:'bunq Banking & Finance',version:'0.3.5',category:'finanzas',summary:'Consulta cuentas bunq y concilia movimientos, suscripciones y facturas.',details:'Integra información bancaria con flujos de revisión de gastos y conciliación. Incluye operaciones no financieras controladas.',requirements:'Ejecutor local, uv, Python 3.11 y contexto API de bunq respaldado por 1Password. La instalación no configura una cuenta bancaria.',icon:'bunq-banking-mcp.svg',platforms:['chatgpt','claude-code','codex'],kind:'MCP local + skills',zip:null,repository:'https://github.com/samihalawa/bunq-banking-mcp',claudeCommand:null},
 {slug:'morning-operator',name:'Morning Operator',version:'0.1.1',category:'productividad',summary:'Revisa trabajo pendiente y contrasta lo completado con evidencias.',details:'Un protocolo de revisión puntual que utiliza las herramientas y repositorios disponibles en tu entorno para detectar pendientes y orientar el siguiente paso.',requirements:'Usa las conexiones que ya tenga tu asistente. No incluye servicios de correo, calendario ni CRM, ni programa ejecuciones periódicas. Los chequeos locales requieren un ejecutor de escritorio.',icon:'morning-operator.svg',platforms:['chatgpt','claude-code','codex'],kind:'Skills',zip:null,repository:'https://github.com/samihalawa/morning-operator-plugin',claudeCommand:null},
 {slug:'magicinterview',name:'MagicInterview',version:'1.4.5',category:'comunicacion',summary:'Ayuda en vivo para saber qué decir durante entrevistas, reuniones y llamadas.',details:'MagicInterview reconoce el habla y analiza la conversación junto con tu CV, empresa, puesto o cliente para sugerir palabras durante la conversación real. El plugin conecta el espacio de trabajo, sus conversaciones y fuentes; la escucha en vivo se inicia en la aplicación MagicInterview.',requirements:'Cuenta MagicInterview y conexión OAuth. La captura de audio y la ayuda en vivo se ejecutan en la aplicación; el plugin no activa el micrófono de forma remota.',icon:'magicinterview.png',platforms:['chatgpt','claude-code','codex'],kind:'Conector remoto + skills',endpoint:'https://magicinterview.ai/mcp',zip:'https://github.com/samihalawa/magicinterview-plugin/releases/download/v1.4.5/magicinterview-openai-1.4.5.zip',sourceZip:'https://github.com/samihalawa/magicinterview-plugin/releases/download/v1.4.5/magicinterview-plugin-1.4.5.zip',repository:'https://github.com/samihalawa/magicinterview-plugin',claudeCommand:null},
 {slug:'linkedin-godmode-plugin',name:'LinkedIn Godmode',version:'0.1.3',category:'comunicacion',summary:'Opera flujos de navegador y red para trabajar con tu sesión de LinkedIn.',details:'Primitivas de navegador, JavaScript y HTTP que el asistente puede combinar para leer e interactuar en flujos personales de LinkedIn.',requirements:'Ejecutor local y Node.js, con Chrome/Chromium, Browserbase o Anchor Browser y una sesión de cuenta autorizada. Las acciones dependen de la sesión y los permisos disponibles.',icon:'linkedin-godmode-plugin.svg',platforms:['chatgpt','claude-code','codex'],kind:'MCP local + skills',zip:null,repository:'https://github.com/samihalawa/linkedin-godmode-plugin',claudeCommand:null},
 {slug:'grokbot',name:'Grokbot',version:'1.3.3',category:'desarrollo',summary:'Consulta Grok y Grok Bot desde un entorno local y exporta sus respuestas.',details:'Herramienta de orquestación con cuentas configuradas, selección de sesiones y exportación de conversaciones.',requirements:'Ejecutor local, instalación de Grokbot y acceso a cuentas o sesiones configuradas. La instalación del plugin no crea cuentas ni incorpora una suscripción a Grok.',icon:'grokbot.svg',platforms:['chatgpt','claude-code','codex'],kind:'Herramienta local',zip:null,repository:'https://github.com/samihalawa/grokbot',claudeCommand:null},
].map(p=>{
 const bundle=downloads.find(d=>d.slug===p.slug&&d.version===p.version);
 if(!bundle||bundle.version!==p.version)throw new Error('Missing matching public download: '+p.slug);
 const localOnly=['bunq-banking-mcp','grokbot','linkedin-godmode-plugin','morning-operator'].includes(p.slug);
 return {...p,keywords:SEARCH_KEYWORDS[p.slug]||[],zip:'/downloads/'+bundle.filename,sourceZip:undefined,archivePlatforms:bundle.platforms,platforms:localOnly?['claude-code','codex']:p.platforms,codexCommand:`codex plugin marketplace add samihalawa/spain-assistant-mcp-apps && codex plugin add ${p.slug}@megawebs-plugins`,claudeCommand:`claude plugin install ${p.slug} --marketplace https://aiplugins.megawebs.com/marketplace.json`};
}));
export const PLATFORMS=Object.freeze([{slug:'chatgpt',name:'ChatGPT'},{slug:'claude-code',name:'Claude Code'},{slug:'codex',name:'Codex'}]);
export const findProduct=slug=>CATALOG.find(p=>p.slug===slug);

const SOURCE_SHAS={
 'ayudas-espana':'8cdcce713c98a5d3110185165421e7a0aedb8dfa',
 'boe-impact':'79c4f8a418c5cf5dbe155961f34126d324f11fad',
 'borme-intelligence':'61334a67cacffdda5f55d7bba4c8d5dcaf505f23',
 'catastro-pro':'e3e11668874503327a9208a914117ed7d7c6f0fe',
 'ine-evidence':'ae797ae64e351ae4b5e0465b09b388c01d54a7d1',
 'licita-espana':'99c97546d76ffb90cffcdd9850ec598febcbd107',
 'spain-open-data':'dafd5614dec3962010b69cc7d4b872d81c9b8a0f',
 'bunq-banking-mcp':'0d48d28b5aaa27da10d338f8cb7fe4d4ba0861f0',
 'grokbot':'8142baf95ce5853d143e9bfc14d590ae5ac5b6d2',
 'linkedin-godmode-plugin':'4af1618f0dafaf951fd16534039da7cb4b822d0a',
 'morning-operator':'5b98d5610d8c694090d88fcd175131c51a433bac',
 'magicinterview':'849d46d8e697cb36ccd7799cba1be2954a28b39c',
};
export const MARKETPLACE=Object.freeze({name:'megawebs-plugins',owner:{name:'Sami Halawa'},plugins:CATALOG.map(p=>({name:p.slug,source:{source:'github',repo:p.repository.replace('https://github.com/',''),ref:'v'+p.version,sha:SOURCE_SHAS[p.slug]}}))});

export const CODEX_MARKETPLACE=Object.freeze({name:'megawebs-plugins',interface:{displayName:'Megawebs Plugins'},plugins:CATALOG.map(p=>({name:p.slug,source:{source:'url',url:p.repository+'.git',ref:'v'+p.version,sha:SOURCE_SHAS[p.slug]},policy:{installation:'AVAILABLE',authentication:'ON_INSTALL'},category:'Productivity',version:p.version}))});
