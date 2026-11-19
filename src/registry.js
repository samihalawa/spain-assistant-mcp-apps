import { z } from "zod";

/**
 * Product identities are stable across Claude Code and ChatGPT. Each tool
 * returns a sourced, read-only result from an allowlisted Spanish provider.
 * Distinct intent descriptions matter more than keyword repetition.
 */
const query = z.string().trim().min(2).max(160);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const integer = (max) => z.number().int().min(1).max(max);
export const PRODUCTS = Object.freeze([
  {
    slug: "licita-espana", name: "Spain Tenders & Contracts", tool: "find_spanish_public_tenders", title: "Find public tenders in Spain",
    pyTool: "licita_triage", label: "Licitaciones públicas", icon: "briefcase",
    description: "Use this when a user wants to find public tenders or procurement opportunities in Spain (España), including licitaciones and contratos públicos for their business or service. Search by topic, CPV prefix or submission deadline; return matching PLACSP notices with available budgets, dates, official links and continuation. This reads a bounded feed window, not all Spanish tenders. It does not submit bids or confirm eligibility or current award status.",
    promise: "Encuentra oportunidades para tu negocio", hint: "Tecnología, formación, consultoría…",
    fields: { query: query.optional().default("software").describe("Tender topic, for example software or formación. Supply the user's topic; omission searches software."), cpv_prefix: z.string().regex(/^\d{2,8}$/).optional().describe("CPV classification prefix of 2–8 digits, for example 72 for IT services."), max_pages: integer(2).optional().default(1).describe("Number of feed pages to inspect in this call, at most 2; this is not a complete national search."), limit: integer(10).optional().default(6).describe("Maximum matching tender records to return, at most 10."), cursor: z.string().url().max(2048).optional().describe("Continuation URL returned by this tool. Do not construct a cursor."), offset: z.number().int().min(0).max(100000).optional().default(0).describe("Continuation offset returned by this tool; start at 0."), deadline_from: date.optional().describe("Earliest submission deadline to include, YYYY-MM-DD." ) },
    previewField: "title", urlField: "official_url",
  },
  {
    slug: "ayudas-espana", name: "Spain Grants & Subsidies", tool: "compare_spanish_public_grants", title: "Find grants and subsidies in Spain",
    pyTool: "ayudas_opportunities", label: "Ayudas y subvenciones", icon: "sparkles",
    description: "Use this when a user wants to find grants, subsidies or funding calls in Spain (España), including ayudas and subvenciones for a business, autónomo, research or project. Search BDNS by funding topic and return up to five records per page with publication dates, available deadline information, official links and requirements to check. It does not submit applications or confirm eligibility or an award.",
    promise: "Encuentra ayudas para tu próximo proyecto", hint: "Digitalización, autónomos, investigación…",
    fields: { query: query.describe("Funding topic or keyword, for example digitalización, autónomos or investigación."), page: z.number().int().min(0).max(100).optional().default(0).describe("Zero-based BDNS results page; use returned continuation information."), limit: integer(5).optional().default(4).describe("Maximum grant records to return from the page, at most 5.") },
    previewField: "title", urlField: "official_url",
  },
  {
    slug: "boe-impact", name: "Spain Laws & BOE", tool: "find_spanish_law_articles", title: "Find articles in a Spanish law",
    pyTool: "boe_find_articles", label: "Legislación y BOE", icon: "scale",
    description: "Use this when a user needs to locate, read or cite an article within a specific Spanish law from the BOE (legislación de España). Given a verified BOE law identifier, search article titles or full text and return matching provisions with exact block identifiers, version details and official links. This searches within that law; it does not discover laws by topic or determine how a law applies to a particular case.",
    promise: "Encuentra y cita el artículo que necesitas", hint: "Artículo 118, contratos menores…",
    fields: { law_id: z.string().regex(/^BOE-[AB]-\d{4}-\d{1,8}$/).describe("Verified BOE identifier for the consolidated law, for example BOE-A-2017-12902."), query: query.max(120).describe("Article title, number or text to locate within this law, for example contratos menores."), limit: integer(15).optional().default(8).describe("Maximum matching article blocks to return, at most 15."), search_text: z.boolean().optional().default(false).describe("Set true to search article text as well as titles."), offset: z.number().int().min(0).max(100000).optional().default(0).describe("Matching-block offset; use next_offset returned by the previous call."), as_of: date.optional().describe("Historical consolidated version date, YYYY-MM-DD; omission uses the source's default version.") },
    previewField: "title", urlField: "official_url",
  },
  {
    slug: "borme-intelligence", name: "Spain Companies", tool: "review_spanish_company_events", title: "Find Spanish company filings",
    pyTool: "borme_events", label: "Registro mercantil", icon: "building",
    description: "Use this when a user asks what was published about a company in Spain (empresa o sociedad de España): incorporation, director appointment or resignation, capital, address or dissolution. Search BORME registered-act notices by company name, registry province and a publication period of up to seven days; return original notice text, official links and keyword event categories. It does not retrieve annual accounts, balance sheets, revenue, credit reports or a complete company history.",
    promise: "Entiende qué ha cambiado en una empresa", hint: "Nombre de la sociedad",
    fields: { company: query.min(3).describe("Registered company name or matching words, at least 3 characters; for example NEMENTIUM TECHNOLOGIES. Not a person or tax-ID lookup."), start_date: date.describe("First publication date to search, YYYY-MM-DD; the inclusive range may span at most 7 days."), end_date: date.describe("Last publication date to search, YYYY-MM-DD; on or after start_date."), province: z.string().trim().min(2).max(80).optional().default("MADRID").describe("Province of the company's registry, for example MADRID or BARCELONA. Omission searches MADRID only."), limit: integer(30).optional().default(10).describe("Maximum matching company notices to return, at most 30.") },
    previewField: "heading", urlField: "official_url",
  },
  {
    slug: "catastro-pro", name: "Spain Property & Catastro", tool: "inspect_spanish_cadastral_property", title: "Look up Spanish cadastral property",
    pyTool: "catastro_ficha", label: "Inmuebles y Catastro", icon: "map-pin",
    description: "Use this when a user wants to understand the public cadastral record of a property in Spain (inmueble, vivienda o parcela de España) and has its referencia catastral. Return the available descriptive facts and labelled EPSG:4326 coordinates with official source links and partial-result notices. It requires a cadastral reference; it does not search by street address or owner, reveal owners, value property, or certify title, planning permission or boundaries.",
    promise: "Entiende la ficha pública de un inmueble", hint: "Referencia catastral de 14, 18 o 20 caracteres",
    fields: { reference: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{14}(?:[A-Z0-9]{4}(?:[A-Z0-9]{2})?)?$/).describe("Spanish cadastral reference of 14, 18 or 20 letters/digits, for example 2749704YJ0624N0001DI; not a street address.") },
    previewField: "reference", urlField: "map_url",
  },
  {
    slug: "ine-evidence", name: "Spain Statistics & INE", tool: "compare_spanish_official_statistics", title: "Compare Spanish statistical observations",
    pyTool: "ine_series_change", label: "Estadísticas oficiales", icon: "chart",
    description: "Use this when a user wants to check or compare official statistics for Spain (estadísticas de España), such as an IPC indicator, and has a verified INE series code. Compare the last two available non-confidential numeric observations with units, periods, absolute change, arithmetic percentage change and official source links. It does not discover series codes or confirm that a series is current; this change is not automatically an annual growth rate.",
    promise: "Compara cifras con su periodo y unidad", hint: "Código de serie oficial (por ejemplo IPC251852)",
    fields: { series_code: z.string().regex(/^[A-Za-z][A-Za-z0-9]{1,39}$/).describe("Verified INE Tempus series code, for example IPC251852; not a topic or table identifier."), last: integer(24).min(2).optional().default(12).describe("Number of recent source observations to request, 2–24. The last two usable numeric observations are compared.") },
    previewField: "series_name", urlField: "source_url",
  },
  {
    slug: "spain-open-data", name: "Spain Open Data", tool: "compare_spanish_open_datasets", title: "Find and compare Spanish datasets",
    pyTool: "open_data_compare", label: "Datasets y reutilización", icon: "database",
    description: "Use this when a user wants to find open datasets for Spain (datos abiertos de España) for an analysis, report or project, including housing, employment or mobility. Search datos.gob.es catalog metadata and compare publishers, formats, distribution links and licence information. Return links to inspect or obtain the data; this tool does not download dataset files, verify their contents or confirm reuse rights.",
    promise: "Encuentra una fuente para tu análisis", hint: "Empleo, vivienda, movilidad…",
    fields: { query: query.describe("Dataset topic or search phrase, for example vivienda, empleo or movilidad."), page: z.number().int().min(0).max(100).optional().default(0).describe("Zero-based datos.gob.es catalog page; follow returned continuation information."), page_size: integer(12).optional().default(6).describe("Maximum catalog records requested per page, at most 12.") },
    previewField: "title", urlField: "catalog_url",
  },
]);

export const bySlug = new Map(PRODUCTS.map(p => [p.slug, p]));
export const byTool = new Map(PRODUCTS.map(p => [p.tool, p]));
