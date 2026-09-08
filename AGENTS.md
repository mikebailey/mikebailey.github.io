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

## Other things in this repo

(Add as needed — keeping this file minimal until there's a load-bearing
detail worth capturing.)
