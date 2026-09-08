#!/usr/bin/env bash
# Sync sci-map/ from the canonical mikebailey/sci-map repo into this
# personal-website Jekyll site. Re-stitches the Jekyll frontmatter, the
# "← michaelbailey.org" back-link, and the #site-back CSS so the page
# renders identically to before the split.
#
# Usage (from the personal-website repo root):
#   bash sci-map/sync-from-canonical.sh [path/to/sci-world-map/checkout]
#
# Default canonical checkout path: ../sci-world-map (sibling of this checkout).

set -euo pipefail

CANONICAL="${1:-../sci-world-map}"
DEST_ROOT="sci-map"

if [[ ! -d "$CANONICAL" ]]; then
  echo "ERROR: canonical sci-map checkout not found at $CANONICAL" >&2
  echo "Either clone it (git clone https://github.com/mikebailey/sci-map.git $CANONICAL)" >&2
  echo "or pass the path: bash $0 path/to/sci-map" >&2
  exit 1
fi

# --- rsync the canonical site payload (docs/) --------------------------------
# Since 2026-07 the canonical repo publishes from docs/ (repo-level files like
# CLAUDE.md, etl/, bin/ live at its root, unpublished), so we sync from
# $CANONICAL/docs/ and the old repo-level exclusions are gone.
# Remaining exclusions:
#   index.html               — needs Jekyll frontmatter + back-link; rebuilt below.
#   .nojekyll                — Jekyll IS what serves this site; we WANT it to process the directory.
#   CNAME                    — canonical site's CNAME, not /sci-map/'s.
#   sync-from-canonical.sh   — the script can't be allowed to delete itself
#                              (it only exists in the mirror, not the canonical).

rsync -av --delete \
  --exclude='index.html' \
  --exclude='.nojekyll' \
  --exclude='CNAME' \
  --exclude='sync-from-canonical.sh' \
  "$CANONICAL/docs/" "$DEST_ROOT/"

# --- Rebuild sci-map/index.html with Jekyll frontmatter + back-link ---------
# Strategy: prepend the frontmatter and the <a id="site-back"> element to the
# canonical index.html. The canonical version is plain HTML; the only
# differences vs. the in-Jekyll version are (a) frontmatter, (b) the title and
# meta description (Mike-branded), (c) the favicon link, and (d) the back-link
# inside <body>.

cat > "$DEST_ROOT/index.html" <<'FRONTMATTER'
---
layout: null
permalink: /sci-map/
title: "Interactive Social Connectedness Index"
description: "Interactive map of Facebook's Social Connectedness Index (SCI), measuring the strength of social ties between geographies from Facebook friendship data. Mike Bailey, computational social scientist."
sitemap: true
---
FRONTMATTER

# Append the canonical body, with two surgical patches:
#   1. Inject <a id="site-back"> immediately after <body>
#   2. Restore the Mike-branded <title>, <meta name=description>, and favicon
python3 - "$CANONICAL/docs/index.html" >> "$DEST_ROOT/index.html" <<'PY'
import sys, re
src = open(sys.argv[1]).read()
src = src.replace(
    '<meta name="description" content="Interactive map of Facebook\'s Social Connectedness Index." />',
    '<meta name="description" content="Interactive map of Facebook\'s Social Connectedness Index. Mike Bailey." />'
)
src = src.replace(
    '<title>Interactive Social Connectedness Index</title>',
    '<link rel="icon" href="/images/favicon.svg" type="image/svg+xml" />\n  <title>Interactive Social Connectedness Index — Mike Bailey</title>'
)
src = src.replace(
    '<body>\n  <div id="map">',
    '<body>\n  <a id="site-back" href="/">← michaelbailey.org</a>\n\n  <div id="map">'
)
sys.stdout.write(src)
PY

# --- Append the #site-back CSS that the canonical repo dropped --------------
# Only append if it isn't already there (idempotent).
if ! grep -q "^#site-back" "$DEST_ROOT/css/style.css"; then
  cat >> "$DEST_ROOT/css/style.css" <<'CSS'

/* ==========================================================================
   michaelbailey.org overrides (appended by sync-from-canonical.sh)
   ========================================================================== */

/* Back-to-site link, top-left. */
#site-back {
  position: fixed;
  top: 14px;
  left: 14px;
  z-index: 30;
  padding: 5px 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #3b464f;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  text-decoration: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
#site-back:hover { background: #fff; color: #1879d5; text-decoration: none; }
CSS
fi

echo ""
echo "Synced from $CANONICAL into $DEST_ROOT/."
echo "Review with: git -C . diff -- sci-map"
echo "Commit + push when happy."
