# OpenTools

A collection of free, open-source, browser-based tools for embedded and hardware
engineers. 

## Requirements

- Python 3.10+
- `pip install -r requirements.txt` (only Jinja2)

## Build

```bash
python build.py            # build into dist/
python build.py --clean    # wipe dist/ first
python build.py --serve    # build, then serve at http://localhost:8000
```

The generated site lands in `dist/` and is fully self-contained.

## Adding a new tool

1. Create `content/tools/<slug>/tool.json`:

   ```json
   {
     "slug": "my-tool",
     "title": "My Tool",
     "summary": "One-line description.",
     "category": "Embedded",
          "icon": "\ud83d\udd27",
     "body": "body.html",
     "scripts": ["assets/my-tool.js"]
   }
   ```

2. Add `body.html` with the tool's markup.
3. Put any JS/CSS under `assets/` and reference them via `scripts` / `styles`
   (paths are relative to the tool page).
4. Run `python build.py` — the tool is auto-discovered and listed on the home page.

## CI/CD

`.github/workflows/build.yml` installs dependencies, runs `python build.py --clean`,
and uploads `dist/` as a build artifact. Wire up a deploy step (GitHub Pages,
GitLab Pages, S3, etc.) whenever you're ready.
