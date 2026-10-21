# Marketplace discovery and first-use evaluation

## What is optimised

Discoverability comes from matching the user's **intent** to a relevant outcome, not repeating words. Tools are named for actions and Spanish domains. Each description states what the tool does, the source it uses, and excluded actions. All public-read tools declare `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`.

Directory copy should put outcomes first: shortlist a tender, evaluate a grant call, find an article, review a company notice, inspect a property, compare statistics or locate reusable datasets. Avoid 'best', 'official', 'guaranteed' and invented user numbers.

## Cross-platform split

**Claude Code:** retain the seven independently installable skills and their local adapters.

**Claude and ChatGPT MCP Apps:** expose the one deployed streamable-HTTP endpoint, with seven tool/UI pairs. Render `ui://` resources in compatible hosts. The tools remain useful without the UI.

**ChatGPT public directory:** publish reviewed packages through an authorized verified publisher and the Plugins dashboard. Include a hosted HTTPS endpoint, valid publisher site, support/privacy/terms, icons, three starter prompts, five successful and three negative review cases per relevant MCP configuration, a real demo recording, countries/commerce declarations and reviewer access when applicable. Do not invent fields or portal completion.

## Golden prompt suite

For each product test these five use cases: direct product/source mention; indirect job-to-be-done; follow-up refining a named dimension; cited original-source explanation; UI shortlist inspection and selection. Test at least these three negatives: unsupported action/submission; invalid identifier and out-of-scope request; provider outage or malicious instruction embedded in source data.

Evaluate **tool selection precision and recall** from actual host conversations, not guessed rankings. Record arguments, selected tool, result completeness, visual rendering, action chosen, and user outcome. Neither raw GitHub stars nor speculative conversion rates demonstrate real adoption.

## First-use standards

A model invocation should show a meaningful result without setup when the data is public. Avoid a generic introductory splash or account wall. Present the top three relevant records, their dates and most important restrictions; allow deeper inspection. A saved example must say it is historical and not live. No interface may fabricate a successful remote check.

## Deployment criteria

1. HTTPS `/mcp` available with correct MCP initialization and tool metadata.
2. Each `ui://` resource returns `text/html;profile=mcp-app` and renders in an actual compatible host.
3. All seven direct source tests, invalid-input and source-failure tests pass with bounded latency.
4. Privacy/support/terms pages are accessible from the listing and describe the actual service.
5. Fresh-user installation and end-to-end interaction succeed without unpublished credentials.
6. Submission made, accepted, publicly listed, first use, repeat use and revenue are recorded separately.

References: [OpenAI metadata optimisation](https://developers.openai.com/plugins/guides/optimize-metadata), [OpenAI UI guidelines](https://developers.openai.com/plugins/concepts/ui-guidelines), [MCP Apps](https://apps.extensions.modelcontextprotocol.io/).
