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
// Enable directory links only after verifying the public listing for each host.
const OPENAI_LISTINGS = Object.freeze({
 'borme-intelligence': 'plugin_asdk_app_6ae6f669a4988191aa6862d377b22708',
 'catastro-pro': 'plugin_asdk_app_6ae6f70b6c908191a62a44c44829c9d1',
 'magicinterview': 'plugin_asdk_app_6ad880b2e2ac8191b4be89ecee3a8cd5',
});
const SEARCH_KEYWORDS = Object.freeze({
 'ayudas-espana':['ayudas','subvenciones','financiación','convocatorias','autónomos','grants','subsidies','funding','BDNS'],
 'licita-espana':['licitaciones','contratación pública','contratos públicos','concursos','proveedores','CPV','tenders','procurement','contracts'],
 'boe-impact':['ley','leyes','legislación','normativa','artículos','BOE','laws','legislation','legal articles'],
 'borme-intelligence':['empresa','empresas','sociedad','sociedades','registro mercantil','BORME','companies','company filings','constitución','administradores','nombramientos','ceses','capital','domicilio','disolución'],
 'catastro-pro':['inmueble','inmuebles','vivienda','propiedad','referencia catastral','coordenadas','parcela','property','cadastral reference','Catastro'],
 'ine-evidence':['estadística','estadísticas','economía','indicadores','IPC','series','statistics','economic indicators','INE'],
 'spain-open-data':['datos abiertos','datasets','reutilización','licencias','catálogo','open data','public data','datos.gob.es'],
 'bunq-banking-mcp':['banca','banco','cuentas','finanzas','movimientos','suscripciones','conciliación'],
 'morning-operator':['productividad','pendientes','tareas','revisión','trabajo','operaciones'],
 'magicinterview':['entrevistas','reuniones','llamadas','respuestas en vivo','conversación','CV'],
 'linkedin-godmode-plugin':['LinkedIn','red profesional','navegador','contactos','sesión'],
 'grokbot':['Grok','Grok Bot','asistentes','consultas','exportar','desarrollo'],
});
export const CATALOG = Object.freeze([
 spain('ayudas-espana','Spain Grants & Subsidies','Encuentra ayudas y subvenciones en España para tu negocio o proyecto.','Busca convocatorias de BDNS por tema y compara fechas publicadas, plazos disponibles y enlaces oficiales en una lista clara. Puedes continuar por las páginas disponibles.','Sin cuenta ni clave API. Comprueba los requisitos en cada convocatoria; la consulta no confirma elegibilidad ni presenta solicitudes.','BDNS'),
 spain('licita-espana','Spain Tenders & Contracts','Encuentra licitaciones y contratos públicos en España por tema, CPV y plazo.','Revisa oportunidades de PLACSP con presupuesto, fechas, identificadores y enlaces oficiales para decidir cuáles estudiar. Continúa la búsqueda cuando el feed lo permita.','Sin cuenta ni clave API. La consulta cubre una ventana acotada de PLACSP; no representa todas las licitaciones ni presenta ofertas.','PLACSP'),
 spain('boe-impact','Spain Laws & BOE','Encuentra el artículo que necesitas en una ley de España publicada en el BOE.','Busca dentro de una norma consolidada por título o texto y obtén los artículos coincidentes con su versión y enlace oficial para citarlos o revisarlos.','Sin cuenta ni clave API. Necesita el identificador BOE de la ley. La herramienta busca dentro de esa norma; la aplicabilidad requiere revisar el caso concreto.','BOE'),
 spain('borme-intelligence','Spain Companies','Consulta cambios de empresas en España: administradores, constitución, capital y domicilio.','Busca anuncios del BORME por sociedad, provincia y fechas. Entiende qué acto se publicó y consulta su texto original y enlace oficial.','Sin cuenta ni clave API. Indica sociedad, provincia y un periodo de hasta siete días. Devuelve anuncios publicados; no incluye cuentas anuales, balances, riesgo ni un historial completo.','BORME'),
 spain('catastro-pro','Spain Property & Catastro','Consulta un inmueble en España por su referencia catastral y entiende su ficha.','Obtén los datos descriptivos públicos disponibles del Catastro y sus coordenadas EPSG:4326, con unidades, fuentes y avisos cuando la respuesta sea parcial.','Sin cuenta ni clave API. Necesita una referencia catastral válida. No busca por dirección ni identifica propietarios, valora inmuebles o certifica titularidad y linderos.','Catastro'),
 spain('ine-evidence','Spain Statistics & INE','Comprueba estadísticas de España con sus cifras, periodos y unidades del INE.','Compara las dos últimas observaciones numéricas disponibles de una serie del INE, con diferencia absoluta y variación aritmética cuando puede calcularse.','Sin cuenta ni clave API. Necesita un código de serie oficial. Comprueba el periodo: la última observación disponible puede ser histórica y la variación no es automáticamente anual.','INE'),
 spain('spain-open-data','Spain Open Data','Encuentra datos abiertos de España para tus análisis, informes y proyectos.','Busca conjuntos de datos en datos.gob.es y compara publicador, formatos, enlaces de distribución e información de licencia antes de elegir una fuente.','Sin cuenta ni clave API. Consulta el catálogo; no descarga ni valida los archivos de datos. Comprueba la licencia en la publicación original.','datos.gob.es'),
 {slug:'bunq-banking-mcp',name:'bunq Banking & Finance',version:'0.3.5',category:'finanzas',summary:'Consulta cuentas bunq y concilia movimientos, suscripciones y facturas.',details:'Integra información bancaria con flujos de revisión de gastos y conciliación. Incluye operaciones no financieras controladas.',requirements:'Ejecutor local, uv, Python 3.11 y contexto API de bunq respaldado por 1Password. La instalación no configura una cuenta bancaria.',icon:'bunq-banking-mcp.svg',platforms:['chatgpt','claude-code','codex'],kind:'MCP local + skills',zip:null,repository:'https://github.com/samihalawa/bunq-banking-mcp',claudeCommand:null},
 {slug:'morning-operator',name:'Morning Operator',version:'0.1.1',category:'productividad',summary:'Revisa trabajo pendiente y contrasta lo completado con evidencias.',details:'Un protocolo de revisión puntual que utiliza las herramientas y repositorios disponibles en tu entorno para detectar pendientes y orientar el siguiente paso.',requirements:'Usa las conexiones que ya tenga tu asistente. No incluye servicios de correo, calendario ni CRM, ni programa ejecuciones periódicas. Los chequeos locales requieren un ejecutor de escritorio.',icon:'morning-operator.svg',platforms:['chatgpt','claude-code','codex'],kind:'Skills',zip:null,repository:'https://github.com/samihalawa/morning-operator-plugin',claudeCommand:null},
 {slug:'magicinterview',name:'MagicInterview',version:'1.4.5',category:'comunicacion',summary:'Ayuda en vivo para saber qué decir durante entrevistas, reuniones y llamadas.',details:'MagicInterview reconoce el habla y analiza la conversación junto con tu CV, empresa, puesto o cliente para sugerir palabras durante la conversación real. El plugin conecta el espacio de trabajo, sus conversaciones y fuentes; la escucha en vivo se inicia en la aplicación MagicInterview.',requirements:'Cuenta MagicInterview y conexión OAuth. La captura de audio y la ayuda en vivo se ejecutan en la aplicación; el plugin no activa el micrófono de forma remota.',icon:'magicinterview.png',platforms:['chatgpt','claude-code','codex'],kind:'Conector remoto + skills',endpoint:'https://magicinterview.ai/mcp',zip:'https://github.com/samihalawa/magicinterview-plugin/releases/download/v1.4.5/magicinterview-openai-1.4.5.zip',sourceZip:'https://github.com/samihalawa/magicinterview-plugin/releases/download/v1.4.5/magicinterview-plugin-1.4.5.zip',repository:'https://github.com/samihalawa/magicinterview-plugin',claudeCommand:null},
 {slug:'linkedin-godmode-plugin',name:'LinkedIn Godmode',version:'0.1.3',category:'comunicacion',summary:'Opera flujos de navegador y red para trabajar con tu sesión de LinkedIn.',details:'Primitivas de navegador, JavaScript y HTTP que el asistente puede combinar para leer e interactuar en flujos personales de LinkedIn.',requirements:'Ejecutor local y Node.js, con Chrome/Chromium, Browserbase o Anchor Browser y una sesión de cuenta autorizada. Las acciones dependen de la sesión y los permisos disponibles.',icon:'linkedin-godmode-plugin.svg',platforms:['chatgpt','claude-code','codex'],kind:'MCP local + skills',zip:null,repository:'https://github.com/samihalawa/linkedin-godmode-plugin',claudeCommand:null},
 {slug:'grokbot',name:'Grokbot',version:'1.3.3',category:'desarrollo',summary:'Consulta Grok y Grok Bot desde un entorno local y exporta sus respuestas.',details:'Herramienta de orquestación con cuentas configuradas, selección de sesiones y exportación de conversaciones.',requirements:'Ejecutor local, instalación de Grokbot y acceso a cuentas o sesiones configuradas. La instalación del plugin no crea cuentas ni incorpora una suscripción a Grok.',icon:'grokbot.svg',platforms:['chatgpt','claude-code','codex'],kind:'Herramienta local',zip:null,repository:'https://github.com/samihalawa/grokbot',claudeCommand:null},
].map(p=>{
 const bundle=downloads.find(d=>d.slug===p.slug&&d.version===p.version);
 if(!bundle||bundle.version!==p.version)throw new Error('Missing matching public download: '+p.slug);
 const localOnly=['bunq-banking-mcp','grokbot','linkedin-godmode-plugin','morning-operator'].includes(p.slug);
 const listingId=OPENAI_LISTINGS[p.slug];
 return {...p,openaiListing:listingId?`https://chatgpt.com/plugins/${listingId}`:null,keywords:p.category==='espana'?['España','Spain','Spanish',...(SEARCH_KEYWORDS[p.slug]||[])]:SEARCH_KEYWORDS[p.slug]||[],zip:'/downloads/'+bundle.filename,sourceZip:undefined,archivePlatforms:bundle.platforms,platforms:localOnly?['claude-code','codex']:p.platforms,codexCommand:`codex plugin marketplace add samihalawa/spain-assistant-mcp-apps && codex plugin add ${p.slug}@megawebs-plugins`,claudeCommand:`claude plugin install ${p.slug} --marketplace https://aiplugins.megawebs.com/marketplace.json`};
}));
export const PLATFORMS=Object.freeze([{slug:'chatgpt',name:'ChatGPT'},{slug:'claude-code',name:'Claude Code'},{slug:'codex',name:'Codex'}]);
export const findProduct=slug=>CATALOG.find(p=>p.slug===slug);

const SOURCE_SHAS={
 'ayudas-espana':'3d47398b7ebedf029303a2af7d7f850ef87b6b95',
 'boe-impact':'18cc52b5facce60ed123715ac0876a3076e91068',
 'borme-intelligence':'be80de21056b5c101d47358d25be924ca9cfe8d9',
 'catastro-pro':'3f00482374928d3c851ce618086468266a5272bc',
 'ine-evidence':'688cf3e3ae5a10d06202fa792ca97ed512ff0fc8',
 'licita-espana':'abf36c65478f39f4f31a4e125983dd50be27c83e',
 'spain-open-data':'553dfd300bbbbf829869998876fecb96f8a00851',
 'bunq-banking-mcp':'0d48d28b5aaa27da10d338f8cb7fe4d4ba0861f0',
 'grokbot':'8142baf95ce5853d143e9bfc14d590ae5ac5b6d2',
 'linkedin-godmode-plugin':'4af1618f0dafaf951fd16534039da7cb4b822d0a',
 'morning-operator':'5b98d5610d8c694090d88fcd175131c51a433bac',
 'magicinterview':'849d46d8e697cb36ccd7799cba1be2954a28b39c',
};
export const MARKETPLACE=Object.freeze({name:'megawebs-plugins',owner:{name:'Sami Halawa'},plugins:CATALOG.map(p=>({name:p.slug,source:{source:'github',repo:p.repository.replace('https://github.com/',''),ref:'v'+p.version,sha:SOURCE_SHAS[p.slug]}}))});

export const CODEX_MARKETPLACE=Object.freeze({name:'megawebs-plugins',interface:{displayName:'Megawebs Plugins'},plugins:CATALOG.map(p=>({name:p.slug,source:{source:'url',url:p.repository+'.git',ref:'v'+p.version,sha:SOURCE_SHAS[p.slug]},policy:{installation:'AVAILABLE',authentication:'ON_INSTALL'},category:'Productivity',version:p.version}))});
