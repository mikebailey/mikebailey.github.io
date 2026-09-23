# Archived MCP landing pages

The human-facing page at https://michaelbailey.org/mcp was retired on
September 23, 2026. The Worker now answers people with a plain `humans not allowed`
and serves only AI agents speaking MCP. These files are kept so the page can come back.

| File | What it is |
| --- | --- |
| `index-2026-09-21-launch-design.html` | The launch page ("My work. Your next question.") committed on master, with the `noindex` meta added September 22. |
| `index-2026-09-22-portal-redesign.html` | The "This is a door left open" redesign drafted by GPT-5.6 Terra in the `michaelbailey-mcp-launch` worktree. It was deployed on September 22 but never committed; this is the only tracked copy. |
| `assets/mike-botanical-pattern.png` | Background pattern the redesign loads from `/mcp/assets/mike-botanical-pattern.png`. |

## Bringing a page back

1. Copy the chosen HTML file to `_mcp/public/index.html`.
2. For the redesign, also copy `assets/` to `_mcp/public/assets/` and let the Worker
   pass `/mcp/assets/*` through to `env.ASSETS` alongside `/mcp/data/*`.
3. In `_mcp/src/worker.js`, replace the `humansNotAllowed()` branch for a browser GET
   on `/mcp` with `env.ASSETS.fetch(new Request('https://assets.local/index.html'))`.
   The `isHuman()` helper already identifies exactly the requests that should see it.
4. Run `npm test`, then `npm run dev` plus `npm run test:integration`, then deploy.
