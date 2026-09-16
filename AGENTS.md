# mikebailey.github.io project instructions

Personal website / AcademicPages Jekyll site. Published at
[michaelbailey.org](https://michaelbailey.org) via GitHub Pages.

## sci-map/ is a mirror, not the source

The `sci-map/` directory is a copy of [mikebailey/sci-world-map](https://github.com/mikebailey/sci-world-map)
(extracted 2026-06-02; canonical repo was originally named `mikebailey/sci-map`
but had to be renamed to avoid path-shadowing the Jekyll mirror at
`michaelbailey.org/sci-map/`). The canonical version is deployed independently
at [sci-map.michaelbailey.org](https://sci-map.michaelbailey.org); this
mirror exists so the page also renders inside the AcademicPages layout
at `michaelbailey.org/sci-map/`.

**To update the mirror after canonical changes:**

```bash
# from this repo root, with ../sci-world-map/ on your local disk
bash sci-map/sync-from-canonical.sh
git diff -- sci-map
git add sci-map && git commit -m "sync sci-map/ from canonical"
git push
```

The sync script:
- rsyncs the canonical repo's `docs/` payload (its Pages publishing root since
  2026-07; repo-level files like `AGENTS.md`, `etl/`, `bin/` live above it,
  unpublished) into `sci-map/`, excluding `index.html`, `.nojekyll`, and
  `CNAME`.
- Re-stitches the Jekyll frontmatter (`layout: null`, `permalink: /sci-map/`,
  the Mike-branded `title`/`description`), the favicon link, the
  `← michaelbailey.org` back-link, and the `#site-back` CSS that the
  canonical version drops.

Don't hand-edit files under `sci-map/` other than the back-link / Jekyll
frontmatter — they'll be overwritten next sync. Changes meant to flow to
both sites belong in the canonical repo.

## power-calculator/index.html is generated, not the source

`/power-calculator/` is a single self-contained HTML file built from the
power-calculator repo (private, `~/Projects/jpal/tools/power-calculator`).
The source is that repo's `code/power-calculator.html`; `code/make-site.js`
adds the site title, description, canonical URL, favicon and the
`← michaelbailey.org` back-link. It is presented as a personal tool: no
J-PAL branding (the build refuses to emit any).

**To update after canonical changes:**

```bash
# from the power-calculator repo root
node code/make-site.js --out ../../../personal/websites/mikebailey.github.io/power-calculator/index.html
# then, in this repo
git diff --stat -- power-calculator
git add power-calculator && git commit -m "Regenerate power calculator"
```

The file deliberately has **no front matter**, so Jekyll copies it byte for
byte. Adding front matter would run Liquid over the page, and the tool's
code templates contain `${{`, which breaks the build. Never hand-edit it;
it is overwritten on every regeneration. The top-nav link lives in
`_data/navigation.yml`; there is no portfolio card.

## CV / resume: `_data/cv.yml` is the single source of truth

One YAML file drives three outputs:

| Output | Rendered by |
|--------|-------------|
| `/cv/` (web) | `_includes/cv-template.html` |
| `/cv/print/` → `files/Michael_Bailey_CV.pdf` | `_layouts/cv-print.html` (`variant: full`) |
| `/cv/resume/print/` → `files/Michael_Bailey_Resume.pdf` | `_layouts/cv-print.html` (`variant: resume`) |

**To update the CV:** edit `_data/cv.yml`, then regenerate both PDFs:

```bash
uv run scripts/cv_to_pdf.py
git add _data/cv.yml files/*.pdf && git commit -m "Update CV"
```

First run on a new machine needs `uv sync && uv run playwright install chromium`.

Notes:
- Work entries carry a `resume:` flag. `true` includes the entry in the short
  resume; `false` means full CV only. The resume also caps each role at two
  highlights and drops the Summary and Patents sections.
- The two PDFs **are committed** — GitHub Pages serves them as static downloads
  from the `/cv/` page. They're generated artifacts that still need to be in git.
- The print pages are `sitemap: false` and `noindex`; they exist only as PDF
  sources and aren't linked from the nav.
- Structure follows the JSON Resume schema. Empty sections aren't rendered.

Historical note: this replaced `scripts/cv_markdown_to_json.py` +
`update_cv_json.sh`, which generated `_data/cv.json` by parsing a markdown CV in
`_pages/cv.md`. That markdown source was later replaced by a template stub, so
the scripts silently parsed an empty document — running them would have wiped
the CV. Both were deleted along with `cv.json`.

## Theme JavaScript: `assets/js/main.min.js` is not rebuildable here

The shipped bundle is `assets/js/main.min.js`. Upstream AcademicPages builds it
with `npm run uglify` from `node_modules` plus `assets/js/plugins/*.js` and
`assets/js/_main.js`. **`node_modules` is not present in this checkout and the
bundle has not changed since the initial commit**, so:

- Editing `assets/js/_main.js` or anything under `assets/js/plugins/` changes
  *nothing* on the live site. Those files are the bundle's sources, not its
  output.
- Rebuilding is not a small step: `npm install` pulls current jQuery and Plotly
  and rewrites the minified file wholesale, which is an unreviewable diff on a
  live site. Don't do it to fix a layout problem.

**Two inline styles the bundle writes will fight your CSS.** Inline styles beat
stylesheet rules at any specificity, so these can only be overridden with
`!important`:

| Written by | Inline style | Overridden in |
|---|---|---|
| `jquery.greedy-navigation.js` | `.sidebar { padding-top: <masthead height>px }` (~58px) | `_sass/layout/_sidebar.scss`, phone block |
| `_main.js` `bumpIt()` | `body { margin-bottom: <footer height>px }` (~130px) | `_sass/layout/_base.scss` |

`bumpIt()` re-runs 250ms after every resize, so a one-time fix at load won't
hold. The sidebar override is deliberately scoped to phone widths; above
`$medium` that inline padding still sets the desktop spacing.

Symptom to recognize: a gap or band of space that no rule in the compiled CSS
accounts for. Grepping `_site/assets/css/main.css` will not find it. Walk
`document.styleSheets` in the browser, or just read the element's `style`
attribute.

## Previewing CSS locally: you must use `jekyll serve`

`_config.yml` sets `url: https://michaelbailey.org`, so a plain `jekyll build`
writes **absolute production URLs** into the HTML. Serving `_site/` with any
static file server therefore styles the page with the *live* stylesheet, and
local SCSS edits appear to do nothing.

```bash
bundle exec jekyll serve --port 4321   # rewrites url: to http://localhost:4321
```

Confirm by checking that the served page links `http://localhost:<port>/assets/css/main.css`.

Also: `jekyll serve --detach` does **not** watch or regenerate. Every SCSS edit
needs `pkill -f "jekyll serve"` and a restart before it shows up.

## Mobile layout

The two-column layout (`#main` as a flex row, `.sidebar` on a `clamp()` width)
lives in `_sass/layout/_sidebar.scss` and applies at **all** widths unless a
breakpoint says otherwise — a phone block at the end of that file stacks it
below `$medium` (768px, defined in `_sass/_themes.scss` with the other
breakpoints). Media queries add no specificity, so that block wins on source
order alone and must stay last.

The AcademicPages footer ships pinned with `position: fixed; bottom: 0`, which
scrolls content underneath it at every scroll position but the last. It's been
returned to normal flow in `_sass/layout/_footer.scss` (`float: left` had to go
with it — `position: fixed` was forcing `float: none`), with `body` as a
full-height flex column and `#main { flex: 1 0 auto }` so it still sits at the
window bottom on short pages.

## Other things in this repo

(Add as needed.)
