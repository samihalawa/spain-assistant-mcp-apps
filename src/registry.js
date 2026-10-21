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
    slug: "licita-espana", name: "Licita España", tool: "find_spanish_public_tenders",
    pyTool: "licita_triage", label: "Licitaciones públicas", icon: "briefcase",
    description: "Find Spanish public tenders in a bounded official PLACSP feed window, grouped by deadline review status. Use for procurement opportunities, not submitting bids or declaring eligibility. Returns original tender IDs and links, budgets, deadlines, coverage and continuation.",
    promise: "Decide qué licitación merece tu tiempo", hint: "Tecnología, formación, consultoría…",
    fields: { query: query.optional().default("software"), cpv_prefix: z.string().regex(/^\d{2,8}$/).optional(), max_pages: integer(2).optional().default(1), limit: integer(10).optional().default(6), deadline_from: date.optional() },
    previewField: "title", urlField: "official_url",
  },
  {
    slug: "ayudas-espana", name: "Ayudas España", tool: "compare_spanish_public_grants",
    pyTool: "ayudas_opportunities", label: "Ayudas y subvenciones", icon: "sparkles",
    description: "Review up to five real BDNS Spanish public grant records with deadlines, potential direct-award signals, original source links and pending eligibility checks. Use for grants, subvenciones and public funding; never promise an award or submission.",
    promise: "De una ayuda publicada a un próximo paso claro", hint: "Digitalización, autónomos, investigación…",
    fields: { query, page: z.number().int().min(0).max(100).optional().default(0), limit: integer(5).optional().default(4) },
    previewField: "title", urlField: "official_url",
  },
  {
    slug: "boe-impact", name: "BOE Impact", tool: "find_spanish_law_articles",
    pyTool: "boe_find_articles", label: "Legislación y BOE", icon: "scale",
    description: "Locate exact article/block identifiers inside a named BOE consolidated Spanish law by title or text. Use before comparing editions; report legal version and provenance, not legal advice.",
    promise: "Encuentra el artículo antes de compararlo", hint: "Artículo 118, contratos menores…",
    fields: { law_id: z.string().regex(/^BOE-[AB]-\d{4}-\d{1,8}$/), query, limit: integer(15).optional().default(8), search_text: z.boolean().optional().default(false), as_of: date.optional() },
    previewField: "title", urlField: "official_url",
  },
  {
    slug: "borme-intelligence", name: "BORME Intelligence", tool: "review_spanish_company_events",
    pyTool: "borme_events", label: "Registro mercantil", icon: "building",
    description: "Review one company name against official BORME notices over a bounded period up to seven days and classify published corporate events as non-certified keywords. Use for company change research; not credit scoring, monitoring, people dossiers or beneficial ownership.",
    promise: "Los cambios de una empresa, con la fuente delante", hint: "Nombre de la sociedad",
    fields: { company: query, start_date: date, end_date: date, province: z.string().trim().min(2).max(80).optional().default("MADRID"), limit: integer(30).optional().default(10) },
    previewField: "heading", urlField: "official_url",
  },
  {
    slug: "catastro-pro", name: "Catastro Pro", tool: "inspect_spanish_cadastral_property",
    pyTool: "catastro_ficha", label: "Inmuebles y Catastro", icon: "map-pin",
    description: "Look up one Spanish public cadastral reference and return a fact sheet plus labelled EPSG:4326 coordinates, noting partial failures. Read-only non-protected property facts; never certify title, ownership, planning permission, valuations or boundaries.",
    promise: "Una referencia catastral. Una ficha clara", hint: "Referencia catastral de 14, 18 o 20 caracteres",
    fields: { reference: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{14}(?:[A-Z0-9]{4}(?:[A-Z0-9]{2})?)?$/) },
    previewField: "reference", urlField: "map_url",
  },
  {
    slug: "ine-evidence", name: "INE Evidence", tool: "compare_spanish_official_statistics",
    pyTool: "ine_series_change", label: "Estadísticas oficiales", icon: "chart",
    description: "Retrieve two comparable observations from an official INE statistical series and show units, observed periods, absolute change and arithmetic percentage change when defined. Use for Spanish statistics with a verified series code; never infer an annual growth rate or that a series is current.",
    promise: "La cifra correcta, con todo su contexto", hint: "Código de serie oficial (por ejemplo IPC251852)",
    fields: { series_code: z.string().regex(/^[A-Za-z][A-Za-z0-9]{1,39}$/), last: integer(24).optional().default(12) },
    previewField: "series_name", urlField: "source_url",
  },
  {
    slug: "spain-open-data", name: "Spain Open Data", tool: "compare_spanish_open_datasets",
    pyTool: "open_data_compare", label: "Datasets y reutilización", icon: "database",
    description: "Compare Spanish official datos.gob.es catalog metadata, formats, publishers, missing licences and verification gaps. Use for dataset discovery and reuse assessment; never claim distribution downloaded, inspected or legally reusable from catalog metadata alone.",
    promise: "Encuentra el dataset. Comprueba si te sirve", hint: "Empleo, vivienda, movilidad…",
    fields: { query, page: z.number().int().min(0).max(100).optional().default(0), page_size: integer(12).optional().default(6) },
    previewField: "title", urlField: "catalog_url",
  },
]);

export const bySlug = new Map(PRODUCTS.map(p => [p.slug, p]));
export const byTool = new Map(PRODUCTS.map(p => [p.tool, p]));
