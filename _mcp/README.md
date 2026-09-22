# Michael Bailey public MCP

https://michaelbailey.org/mcp is both the human landing page and an MCP Streamable
HTTP endpoint. Personal project, not an official J-PAL or MIT service.

## Hosting

GitHub Pages remains the website origin. Cloudflare Worker `michael-bailey-mcp`
handles only `michaelbailey.org/mcp` and `michaelbailey.org/mcp/*`. The four existing
apex GitHub A records retain their IP addresses with proxying enabled. SSL mode is
Full. Subdomains, email and other Workers are unaffected. The account's free-tier
limits apply; no paid upgrade was made. No server-side LLM calls or API charges.

Only `public/` is deployed as assets. Jekyll excludes `_mcp/` by its normal underscore
handling. This is a public GitHub repo: never add credentials or internal content.
No private accounts, calendar access, booking writes, arbitrary URL fetching, or
persistent conversation storage. Cloudflare may retain normal request metadata.
Requests are bounded to 64 KiB, with input and result limits.

## Commands

From `_mcp/`, using Node 20+ and Python 3.11+:

```sh
npm ci
npm test
npm run dev
# Separate terminal:
npm run test:integration
# Existing authorized Cloudflare OAuth login:
npm run deploy
node test/integration.mjs https://michaelbailey.org/mcp
```

Check homepage and calculator after routing changes. The MCP route is intentionally absent from the website navigation so the card
clue remains an invitation to discover it. Use Wrangler rollback to revert a Worker release;
if retiring it remove only these two routes, never unrelated account resources.

## Capabilities and limits

Ten read-only tools, three resources and one meeting-preparation prompt:

- Public biography, projects and papers; caller labels inferred discussion topics.
- Supplied Google booking links for 30/45/60 minutes; no availability lookup or booking.
- Existing calculator engine: power, MDE, sample size, binary/continuous outcomes,
  clustering, unequal cluster sizes, attrition, take-up, covariates, multiple tests,
  non-inferiority, budgets, sensitivity and R/Stata exports. Defaults are explicit,
  illustrative assumptions to confirm, not recommendations. Fractions are 0–1.
  The existing website URL loader omits three advanced selectors: results disclose
  manual adjustment when using non-inferiority, decreasing binary effects or the
  efficient CV method. MCP results themselves honor those options.
- Country-level SCI comparisons. Scaled SCI is not a count or probability.
- US Atlas records for counties, ZIPs, colleges and high schools. Economic
  connectedness is twice a friendship share; consult the included source codebook.
- Monthly country-pair migration estimates for 2019–2022. Residence-based, weighted
  and privacy-noised estimates, not stocks, citizenship counts or border encounters.
- Thirteen curated evidence/guidance summaries, each sourced and status-labeled.
  Not live/exhaustive literature search; no hits does not mean no evidence exists.
- A preliminary evaluation scaffold for the calling assistant to tailor, not an
  approved protocol or institutional endorsement.

## Data contracts and refresh

Only public aggregate releases are ingested. Units and asserted unique keys:
SCI = directed country pair; migration = directed pair/month (unbalanced panel);
Atlas = one geography ID (cross-section). No datasets are merged. Query sums report
observed coverage. Missing observations are null, never invented zeroes. Geography
IDs remain strings, preserving leading zeros. Source values are preserved in country
shards. Raw downloads are immutable caches in ignored `raw/`. Manifests record source
URLs, hashes and licenses. Atlas license and codebook are distributed with the data;
no reidentification or endorsement is allowed.

```sh
python3 scripts/ingest.py
python3 scripts/prepare-data.py
python3 scripts/prepare-content.py
node scripts/sync-calculator.mjs /path/to/power-calculator/code/power-calculator.html
```

Scripts reuse their raw cache. Archive it before fetching a new release, review
licenses/coverage/content, update snapshot labels, test and redeploy. Refresh is
manual and versioned, not a live feed. The original engine hash appears in responses.
Canonical calculator tests: `bash code/tests/run-all.sh` in its source repository.

Launch checks: local and deployed integration calls cover all tools, all three power
modes, budget, code output, actual dataset queries, resources, prompts, invalid
inputs and oversized requests. Canonical calculator suite: 31 checks passed.
See `../docs/mcp-launch.md` for deployed release and custom-domain verification.
