#!/usr/bin/env python3
"""Render the CV and resume PDFs from _data/cv.yml.

Single source of truth is _data/cv.yml. Jekyll renders it to two chrome-free
print pages (/cv/print/ and /cv/resume/print/), and this script drives headless
Chromium over those pages to produce:

    files/Michael_Bailey_CV.pdf
    files/Michael_Bailey_Resume.pdf

Both PDFs are committed to the repo, because GitHub Pages serves them as static
downloads from the /cv/ page.

Usage
-----
    uv run scripts/cv_to_pdf.py              # build the site, then render both
    uv run scripts/cv_to_pdf.py --skip-build # reuse the existing _site/
    uv run scripts/cv_to_pdf.py --only cv    # just the CV (or: --only resume)

First run only, to fetch the bundled browser:

    uv run playwright install chromium

Cross-platform: no shell-specific calls, all paths via pathlib. Requires the
Ruby/Jekyll toolchain for the build step; --skip-build avoids it if you have a
current _site/ already.
"""

from __future__ import annotations

import argparse
import functools
import http.server
import socketserver
import subprocess
import sys
import threading
from pathlib import Path

# Repo root, derived rather than hardcoded so this works from any cwd.
REPO_ROOT = Path(__file__).resolve().parent.parent
SITE_DIR = REPO_ROOT / "_site"
OUTPUT_DIR = REPO_ROOT / "files"

# path under _site  ->  output PDF name
TARGETS = {
    "cv": ("cv/print/", "Michael_Bailey_CV.pdf"),
    "resume": ("cv/resume/print/", "Michael_Bailey_Resume.pdf"),
}


def build_site() -> None:
    """Run `bundle exec jekyll build` so _site reflects the current cv.yml."""
    print("Building Jekyll site...")
    try:
        subprocess.run(
            ["bundle", "exec", "jekyll", "build"],
            cwd=REPO_ROOT,
            check=True,
            stdout=subprocess.DEVNULL,
        )
    except FileNotFoundError:
        sys.exit(
            "Error: `bundle` not found. Install the Ruby toolchain and run\n"
            "  bundle install\n"
            "or pass --skip-build to reuse the existing _site/."
        )
    except subprocess.CalledProcessError as exc:
        sys.exit(f"Error: jekyll build failed (exit {exc.returncode}).")


def serve(directory: Path) -> tuple[socketserver.TCPServer, int]:
    """Serve `directory` on an ephemeral localhost port; return (server, port).

    Chrome is pointed at http://localhost rather than file:// so that any
    absolute asset paths in the rendered page resolve the same way they do on
    the live site.
    """
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        """SimpleHTTPRequestHandler minus the per-request stderr logging."""

        def log_message(self, format, *args):  # noqa: A002 - signature is fixed
            pass

    handler = functools.partial(QuietHandler, directory=str(directory))

    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, port


def render(which: list[str]) -> None:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit(
            "Error: playwright is not installed. Run:\n"
            "  uv sync\n"
            "  uv run playwright install chromium"
        )

    if not SITE_DIR.is_dir():
        sys.exit(f"Error: {SITE_DIR} does not exist. Build the site first.")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    httpd, port = serve(SITE_DIR)

    try:
        with sync_playwright() as p:
            try:
                browser = p.chromium.launch()
            except Exception as exc:
                sys.exit(
                    f"Error launching Chromium: {exc}\n"
                    "If the browser is missing, run: uv run playwright install chromium"
                )
            page = browser.new_page()

            for key in which:
                route, filename = TARGETS[key]
                url = f"http://127.0.0.1:{port}/{route}"
                out = OUTPUT_DIR / filename

                response = page.goto(url, wait_until="networkidle")
                if response is None or not response.ok:
                    status = response.status if response else "no response"
                    sys.exit(f"Error: {url} returned {status}. Did the site build?")

                page.pdf(
                    path=str(out),
                    print_background=True,
                    # Honour the @page size and margins declared in
                    # _layouts/cv-print.html rather than Chrome's defaults.
                    prefer_css_page_size=True,
                )
                size_kb = out.stat().st_size / 1024
                print(f"  wrote {out.relative_to(REPO_ROOT)} ({size_kb:.0f} KB)")

            browser.close()
    finally:
        httpd.shutdown()
        httpd.server_close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="reuse the existing _site/ instead of running jekyll build",
    )
    parser.add_argument(
        "--only",
        choices=sorted(TARGETS),
        help="render only one of the two PDFs",
    )
    args = parser.parse_args()

    if not args.skip_build:
        build_site()

    which = [args.only] if args.only else list(TARGETS)
    render(which)
    print("Done.")


if __name__ == "__main__":
    main()
