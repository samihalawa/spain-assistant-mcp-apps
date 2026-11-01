# Spain Evidence: official-data MCP connectors

Seven read-only Spanish public-data workflows share one maintained Streamable HTTP server. Each plugin also has its own scoped endpoint exposing only its domain tool and optional interactive result resource. The server uses the official MCP TypeScript SDK and fixed Python standard-library source adapters. It requires no bank, government or publisher account and makes no submissions or payments.

| Plugin | Endpoint path | Tool | Official source |
| --- | --- | --- | --- |
| Licita España | `/mcp/licita-espana` | `find_spanish_public_tenders` | PLACSP Atom syndication |
| Ayudas España | `/mcp/ayudas-espana` | `compare_spanish_public_grants` | BDNS public API |
| BOE Impact | `/mcp/boe-impact` | `find_spanish_law_articles` | BOE consolidated-law API |
| BORME Intelligence | `/mcp/borme-intelligence` | `review_spanish_company_events` | BOE BORME summaries and notice XML |
| Catastro Pro | `/mcp/catastro-pro` | `inspect_spanish_cadastral_property` | Catastro non-protected-data and coordinate services |
| INE Evidence | `/mcp/ine-evidence` | `compare_spanish_official_statistics` | INE Tempus JSON API |
| Spain Open Data | `/mcp/spain-open-data` | `compare_spanish_open_datasets` | datos.gob.es metadata API |

`/mcp` exposes all seven tools. Both shared and scoped paths perform a genuine MCP initialize/tools-list/tools-call lifecycle. They use stateless JSON response mode; the official SDK handles protocol negotiation. Responses contain structured results and a short text summary. Compatible hosts can also read the bundled MCP App HTML resource. UI support is optional for obtaining results.

## Run and test

Requires Node.js 22 and Python 3.11 or later. The Dockerfile supplies both runtimes, TLS trust certificates and timezone data. JavaScript dependency versions are pinned in the lockfile.

```sh
npm ci
npm run build
npm run check
npm test
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests/python -v
npm start
```

The service listens on port 8787. `GET /health` reports its version, seven endpoint paths and optional configured source revision. A healthy HTTP response is separate from a successful MCP call.

`npm run test:live` performs one bounded, real official-source query through each scoped MCP endpoint and writes results only to stdout. It starts a localhost server by default. To verify a deployed instance, set `MCP_BASE_URL` to its HTTPS origin. The canaries use explicit historical BOE/BORME dates and a documented cadastral sample. They establish the source access actually returned, not current eligibility, complete historical coverage or host review approval.

Deploy using this directory as the Docker build context and the included `Dockerfile`. Terminate public TLS at the existing reverse proxy. A client configuration for the proposed public origin is:

```json
{
  "mcpServers": {
    "boe-impact": {
      "type": "http",
      "url": "https://aiplugins.megawebs.com/mcp/boe-impact"
    }
  }
}
```

Substitute the corresponding path from the table for another plugin. Deployment, client connection and directory acceptance require their own verification; the configuration alone proves none of them.

## Coverage and data handling

Only fixed HTTPS government hosts can be fetched. Tool arguments are typed and reject unknown fields. There is no arbitrary URL, shell, SQL, account-login or protected-data tool. Redirects must remain on the official allowlist. XML DTD/entity declarations are rejected. Queries are sent to official sources, which receive those terms and the deployed server's network address. Returned text and links remain source material, not instructions to execute.

Request bodies are capped at 30,000 bytes, including chunked uploads. Provider reads have TLS verification, timeouts and response-size limits. Workers receive JSON over stdin, use no shell, inherit no credentials and have bounded concurrency, queue size, execution time and output size. Invalid arguments, blocked URLs and source failures are explicit errors, never invented results.

The service has no user database, conversation store, query history or background jobs. Source records live in the request's Python worker memory; its bounded in-memory cache disappears with that worker. Metadata-only operational events go to stderr with tool name, correlation ID, duration and outcome, excluding queries, arguments and returned records. Deployment infrastructure and assistant hosts may retain their own logs and conversations.

Each successful source fetch includes its URL, UTC retrieval time, SHA-256 and cache flag. A clipped PLACSP response has a prefix-only hash and explicit unread-suffix/continuation restrictions. PLACSP results are a bounded window, never all Spanish tenders; zero matches in a prefix are inconclusive. BDNS and datos.gob.es expose native pages. BOE article matches expose `next_offset`; PLACSP exposes safe cursor/offset continuation when a complete read permits it. No downstream dataset files are fetched automatically.

Company names are matching terms, not certified identity or risk scores. Catastro returns descriptive facts and labelled reference coordinates, not ownership or surveyed boundaries. INE preserves units, periods and stale-series warnings; a series' latest observations are not necessarily the current statistical base. Grant and tender dates do not establish eligibility, current procedure status or an award. No endorsement by a government, OpenAI or Anthropic is implied.

## Runtime settings

No secret environment variables are required.

| Variable | Default and meaning |
| --- | --- |
| `PORT` | `8787` |
| `PYTHON_BIN` | `python3`; operator-controlled interpreter |
| `PYTHON_TIMEOUT_MS` | `35000`; capped at 60000 |
| `MAX_CONCURRENT_PYTHON` | `3`; bounded between 1 and 6 |
| `MAX_IP_PER_MIN` | `100` requests per direct peer IP; reverse-proxy peers share this allowance |
| `ALLOWED_HOSTS` | `aiplugins.megawebs.com,localhost,127.0.0.1,[::1]`; exact hostnames, without ports |
| `ALLOWED_ORIGINS` | Exact origins `https://aiplugins.megawebs.com`, `https://chatgpt.com`, `https://chat.openai.com`, `https://claude.ai` |
| `SOURCE_COMMIT` | Optional build revision reported by health; unset reports null |

Requests without an Origin header are allowed for server-to-server MCP clients. Supplied Origins must match the configured list, and CORS echoes only an allowed origin. This is intentionally a public, unauthenticated read-only service; it contains no private account data or writable resources. Do not send personal records or credentials in public search terms.

## Primary technical references

- [MCP SDK 1.32.1 server contract](https://github.com/modelcontextprotocol/typescript-sdk/blob/1.32.1/docs/server.md)
- [BOE official API](https://www.boe.es/datosabiertos/api/api.php?lang=es)
- [BDNS official API documentation](https://www.infosubvenciones.es/bdnstrans/A03/es/doc)
- [Catastro public web services](https://www.catastro.hacienda.gob.es/ws/Webservices_Libres.pdf)
- [INE JSON API reference](https://www.ine.es/dyngs/DAB/index.htm?cid=1100)
- [datos.gob.es API](https://datos.gob.es/es/accessible-apidata)
- [PLACSP official syndication specification](https://www.hacienda.gob.es/Documentacion/Publico/D.G.%20PATRIMONIO/Plataforma_Contratacion/especificacion-sindicacion-1-3.pdf)
