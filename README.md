# michaelbailey.org

Source for [michaelbailey.org](https://michaelbailey.org), Michael Bailey's personal website. Built with Jekyll using the [Academic Pages](https://github.com/academicpages/academicpages.github.io) template.

Everything the site needs is in this repo. The project's Google Drive folder
(`Projects/personal/mikebailey.github.io/`) holds only the pre-Jekyll archive of
the old hand-written site plus original image assets, kept for reference rather
than as a mirror of `data/` or `outputs/`, which this project does not have.

## Local development

```bash
bundle install
bundle exec jekyll serve   # http://localhost:4000
```

## Updating the CV / resume

`_data/cv.yml` is the single source of truth for the web CV at `/cv/` and for
both downloadable PDFs. After editing it, regenerate the PDFs:

```bash
uv sync                                 # first run only
uv run playwright install chromium      # first run only
uv run scripts/cv_to_pdf.py
```

This writes `files/Michael_Bailey_CV.pdf` and `files/Michael_Bailey_Resume.pdf`,
both of which are committed so GitHub Pages can serve them. See `CLAUDE.md` for
details on the `resume:` flags that control what appears in the short resume.
