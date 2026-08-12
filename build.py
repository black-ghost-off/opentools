#!/usr/bin/env python3
"""Static site generator for OpenTools.

Scans ``content/tools/*/tool.json`` for tool definitions, renders each tool
page plus an index page using Jinja2 templates, and copies static assets into
the ``dist/`` output directory.

Usage:
    python build.py              # build into dist/
    python build.py --clean      # remove dist/ first, then build
    python build.py --serve      # build, then serve dist/ on localhost:8000
"""
from __future__ import annotations

import argparse
import json
import shutil
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = Path(__file__).resolve().parent
CONTENT_DIR = ROOT / "content"
TOOLS_DIR = CONTENT_DIR / "tools"
TEMPLATES_DIR = ROOT / "templates"
STATIC_DIR = ROOT / "static"
DIST_DIR = ROOT / "dist"
CONFIG_FILE = ROOT / "site.config.json"


@dataclass
class Tool:
    """A single tool discovered from ``content/tools/<slug>/tool.json``."""

    slug: str
    title: str
    summary: str
    category: str = "General"
    order: int = 100
    icon: str = "\N{HAMMER AND WRENCH}"
    body_html: str = ""
    scripts: list[str] = field(default_factory=list)
    styles: list[str] = field(default_factory=list)

    @property
    def url(self) -> str:
        return f"tools/{self.slug}/"


def load_config() -> dict[str, Any]:
    with CONFIG_FILE.open(encoding="utf-8") as fh:
        return json.load(fh)


def discover_tools() -> list[Tool]:
    """Read every ``tool.json`` under ``content/tools`` into a Tool object."""
    tools: list[Tool] = []
    if not TOOLS_DIR.exists():
        return tools

    for meta_path in sorted(TOOLS_DIR.glob("*/tool.json")):
        tool_dir = meta_path.parent
        with meta_path.open(encoding="utf-8") as fh:
            meta = json.load(fh)

        body_file = tool_dir / meta.get("body", "body.html")
        body_html = body_file.read_text(encoding="utf-8") if body_file.exists() else ""

        tools.append(
            Tool(
                slug=meta.get("slug", tool_dir.name),
                title=meta["title"],
                summary=meta.get("summary", ""),
                category=meta.get("category", "General"),
                order=int(meta.get("order", 100)),
                icon=meta.get("icon", "\N{HAMMER AND WRENCH}"),
                body_html=body_html,
                scripts=list(meta.get("scripts", [])),
                styles=list(meta.get("styles", [])),
            )
        )

    tools.sort(key=lambda t: (t.order, t.title.lower()))
    return tools


def copy_static() -> None:
    if STATIC_DIR.exists():
        shutil.copytree(STATIC_DIR, DIST_DIR / "static", dirs_exist_ok=True)


def copy_tool_assets(tool: Tool) -> None:
    """Copy per-tool ``assets/`` folder (js/css/images) into the output."""
    assets_src = TOOLS_DIR / tool.slug / "assets"
    if assets_src.exists():
        dest = DIST_DIR / "tools" / tool.slug / "assets"
        shutil.copytree(assets_src, dest, dirs_exist_ok=True)


def build(clean: bool = False) -> list[Tool]:
    if clean and DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    DIST_DIR.mkdir(parents=True, exist_ok=True)

    config = load_config()
    tools = discover_tools()

    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )

    common = {
        "config": config,
        "tools": tools,
        "year": datetime.now(timezone.utc).year,
        "built_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
    }

    # Index page (root).
    index_html = env.get_template("index.html").render(
        page_title=config["title"],
        root="",
        **common,
    )
    (DIST_DIR / "index.html").write_text(index_html, encoding="utf-8")

    # Individual tool pages at tools/<slug>/index.html.
    tool_template = env.get_template("tool.html")
    for tool in tools:
        page = tool_template.render(
            tool=tool,
            page_title=f"{tool.title} \N{EN DASH} {config['title']}",
            root="../../",
            **common,
        )
        out_dir = DIST_DIR / "tools" / tool.slug
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / "index.html").write_text(page, encoding="utf-8")
        copy_tool_assets(tool)

    copy_static()

    print(f"Built {len(tools)} tool(s) into {DIST_DIR.relative_to(ROOT)}/")
    for tool in tools:
        print(f"  - {tool.slug}: {tool.title}")
    return tools


def serve(port: int) -> None:
    import http.server
    import socketserver
    import functools

    handler = functools.partial(
        http.server.SimpleHTTPRequestHandler, directory=str(DIST_DIR)
    )
    with socketserver.TCPServer(("", port), handler) as httpd:
        print(f"Serving {DIST_DIR}/ at http://localhost:{port} (Ctrl+C to stop)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the OpenTools static site.")
    parser.add_argument("--clean", action="store_true", help="Remove dist/ before building.")
    parser.add_argument("--serve", action="store_true", help="Serve dist/ after building.")
    parser.add_argument("--port", type=int, default=8000, help="Port to serve on (default: 8000).") 
    args = parser.parse_args()

    build(clean=args.clean)
    if args.serve:
        serve(port=args.port)


if __name__ == "__main__":
    main()
