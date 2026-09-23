# Public research MCP launch

September 21, 2026. Endpoint: https://michaelbailey.org/mcp.

- Cloudflare Worker: `michael-bailey-mcp`.
- Current release: `19d63f2b-91b1-485b-b837-6291c58797aa`.
- Routes: exact `/mcp` and `/mcp/*` on michaelbailey.org.
- GitHub Pages remains origin for all other paths.
- Apex A records 185.199.108.153 through 185.199.111.153 retain their values,
  with Cloudflare proxy enabled to allow path routing. Prior state: DNS-only.
- Existing Full TLS mode retained. No paid-plan upgrade or new credentials.
- Canonical calculator SHA-256:
  `3259936744c092b8e539e12fab6e22a0cefc7b21fe94d1f738954f7c3f2f4e6a`.
- Canonical calculator suite: 31 checks passed. MCP unit tests: 3 passed.
- Local and public workers.dev integration suite passed every tool, resources,
  prompts, errors and request limits. Custom-domain HTTP checks using Cloudflare's
  public resolved IP returned the MCP page and the existing homepage successfully.
- The full MCP SDK integration suite then passed at https://michaelbailey.org/mcp
  using normal DNS, after refreshing the local DNS cache.
- The public landing page and copy button were verified in Chrome.
- GitHub Pages build 35687533251 succeeded and AI Tools navigation is live.

The service exposes only public sources and aggregate releases. Scheduling returns
user-supplied Google links; availability across the three calendars is not verified.
SCI country-level coverage, Atlas US geographies and migration 2019–2022 are explicit.
Evidence search is a 13-entry curated starter library, not exhaustive live search.
No card-design files were changed during this launch.

Reproduction, refresh and rollback instructions: `../_mcp/README.md`.

## September 22 card discovery update

Removed AI Tools from the website navigation and added `noindex` to the MCP
landing response. Added the public `/card/` contact page and vCard for the QR
code. The MCP remains public after discovery; this is not access control.

## September 23 agents-only update

Retired the human landing page. Every `/mcp` path now answers a browser navigation
(`Sec-Fetch-Mode: navigate` or `Sec-Fetch-Dest: document`, which browsers add and
scripts cannot forge) with a plain-text `403 humans not allowed`. Any `POST` that is
not JSON-RPC 2.0 gets the same refusal. MCP clients, CORS preflight and the JSON
side-doors (`/health`, `/catalog`, `/profile`, `/evidence`, `/data/*`) are unchanged.
Any other `GET /mcp` (a fetch-only agent, whatever its `Accept` line) receives a
plain-text greeting from `_mcp/src/greeting.js` listing the tools, the connection
snippet and the GET-readable URLs; the MCP `instructions` share that voice.
Both landing page designs are archived in `_mcp/archive/landing-page/` with restore
steps. Server version 1.1.0. Unit tests: 22 passed. Integration suite passed locally
and at https://michaelbailey.org/mcp, including the refusal and greeting checks.
Deployed release: `b839621c-dbe8-485d-8dbd-221f5f6b785f`.
