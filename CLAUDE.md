# Claude context for mikebailey.github.io

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
# from this repo root, with ../sci-map/ on your local disk
bash sci-map/sync-from-canonical.sh
git diff -- sci-map
git add sci-map && git commit -m "sync sci-map/ from canonical"
git push
```

The sync script:
- rsyncs everything except `index.html`, `etl/`, `LICENSE`, `README.md`,
  `.nojekyll`, `CNAME`, and `.gitignore` from `../sci-map/` into
  `sci-map/`.
- Re-stitches the Jekyll frontmatter (`layout: null`, `permalink: /sci-map/`,
  the Mike-branded `title`/`description`), the favicon link, the
  `← michaelbailey.org` back-link, and the `#site-back` CSS that the
  canonical version drops.

Don't hand-edit files under `sci-map/` other than the back-link / Jekyll
frontmatter — they'll be overwritten next sync. Changes meant to flow to
both sites belong in the canonical repo.

## Other things in this repo

(Add as needed — keeping this file minimal until there's a load-bearing
detail worth capturing.)
