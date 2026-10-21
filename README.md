# Spain Evidence — seven visual MCP Apps for Spanish public data

**Seven independent workflows, one maintainable MCP server.** Built by Sami Halawa. Read-only access to official sources, accessible interactive interfaces for compatible assistant hosts, and structured results that also work without a visual host.

| Public-data workflow | MCP tool | What a user gets |
|---|---|---|
| [Licita España](https://github.com/samihalawa/licita-espana) | `find_spanish_public_tenders` | A bounded procurement shortlist with deadlines to verify |
| [Ayudas España](https://github.com/samihalawa/ayudas-espana) | `compare_spanish_public_grants` | Published grant details and a conditional eligibility-review queue |
| [BOE Impact](https://github.com/samihalawa/boe-impact) | `find_spanish_law_articles` | Article IDs, source versions and specific legal text |
| [BORME Intelligence](https://github.com/samihalawa/borme-intelligence) | `review_spanish_company_events` | Company notices, dated events and source links |
| [Catastro Pro](https://github.com/samihalawa/catastro-pro) | `inspect_spanish_cadastral_property` | Public property description plus reference coordinates |
| [INE Evidence](https://github.com/samihalawa/ine-evidence) | `compare_spanish_official_statistics` | Two comparable observations with dates and units |
| [Spain Open Data](https://github.com/samihalawa/spain-open-data) | `compare_spanish_open_datasets` | Dataset metadata, formats and reuse verification gaps |

## What makes this an MCP App

Every tool has model-facing intent text, constrained arguments, read-only annotations, and a real `ui://` resource with MIME `text/html;profile=mcp-app`. The UI uses `@modelcontextprotocol/ext-apps` for host communication and provides interactive filterable cards, official source links, scope, uncertainty and copyable summaries. The model also receives a complete structured result if the host cannot display UI.

These are not screenshots pretending to be tools. A host must support the MCP Apps UI extension to render them, and a remotely connected server must be reachable at a public HTTPS `/mcp` URL.

## Local quickstart

Requires Node.js 20+, Python 3.11+, network access to the relevant public official providers, and a recent Claude/ChatGPT compatible MCP client.

```bash
npm ci
npm run build
npm test
npm start
```

Check `http://localhost:8787/health` and connect an MCP client to `http://localhost:8787/mcp`. The MCP Inspector can validate tool schemas and results.

For deployment, use the included Dockerfile. A public ChatGPT directory submission requires a stable reachable HTTPS MCP endpoint; local source publication is not approval.

## Security and data

- Read-only provider calls restricted to official-source HTTPS hosts in the bundled Python adapter.
- No shell expansion of user input, account login, payment, secrets, user profiles, tracking pixels or persistent user database.
- Input schemas validate every public argument; Python workers receive JSON on standard input, not shell arguments. The service bounds concurrent workers, output size and worker timeouts.
- Errors mean the source is unavailable or unverified, **not** that no record exists.
- The service uses temporary in-process caching only. Queries sent to official providers necessarily disclose the query terms and connection IP of the deployed server.
- The independent server is not endorsed by Spanish authorities, Anthropic or OpenAI.

Read the underlying product repositories for additional scope and provider caveats. Property data does not prove ownership; a legal diff is not legal advice; a tender or grant record is not confirmed eligibility; dataset catalog inclusion does not grant reuse rights.

## Review and publication status

This repository is the **MCP backend source** for the seven previously published skills plugins. It does not change those plugins' identities or private account IDs. Connecting an MCP backend to a public ChatGPT plugin requires packaging it with a verified remote endpoint and submitting through the appropriate portal; adding an MCP connection to an already reviewed skills-only submission may require a new plugin submission according to current portal rules.

No official directory review, approval, installation or adoption is claimed from source publication. See [technical evidence](evidence/), [model-invocation evaluation](docs/MARKETPLACE.md) and official [MCP Apps documentation](https://apps.extensions.modelcontextprotocol.io/).

## Public verification (2026-10-21)

The Coolify-backed service is deployed from this GitHub repository and responds at the **temporary HTTP** endpoint `http://czfiazetlzcx5gkd5pijemmm.5.75.140.17.sslip.io/mcp`. An independent MCP SDK client successfully discovered all seven tools and seven interactive resources, read a UI HTML resource, and queried BDNS live through the server (two records, three source links). See [public MCP verification](evidence/public-mcp-verification.json).

**Not ready for ChatGPT directory submission:** that endpoint is HTTP, not verified public HTTPS. TLS for the corresponding sslip.io hostname failed; no DNS/certificate or existing domain configuration was changed to bypass it. A stable authorized HTTPS origin and actual in-host desktop/mobile UI testing are still required. Do not confuse a working remote MCP service with a publicly approved app.
