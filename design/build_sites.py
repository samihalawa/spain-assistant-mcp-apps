#!/usr/bin/env python3
"""Refresh package-local links to the unified Megawebs Plugins website."""
from pathlib import Path
import argparse
import html
import json

SLUGS = (
    "ayudas-espana", "boe-impact", "borme-intelligence", "catastro-pro",
    "ine-evidence", "licita-espana", "spain-open-data",
)
ORIGIN = "https://aiplugins.megawebs.com"


def document(slug, name):
    target = f"{ORIGIN}/plugins/{slug}"
    title = html.escape(name)
    return f'''<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} · Megawebs Plugins</title><link rel="canonical" href="{target}">
<meta http-equiv="refresh" content="0;url={target}"><meta name="robots" content="noindex,follow">
</head><body><main><h1>{title}</h1><p>Instalación y documentación en Megawebs Plugins.</p>
<p><a href="{target}">Abrir {title}</a></p><nav aria-label="Información del producto">
<a href="{target}/privacy">Privacidad</a> · <a href="{target}/terms">Condiciones</a> · <a href="{target}/support">Soporte</a>
</nav></main></body></html>
'''


def build(plugins_root):
    generated = []
    for slug in SLUGS:
        package = plugins_root / slug
        manifest = json.loads((package / "plugin.json").read_text())
        name = manifest.get("extensions", {}).get("com.openai", {}).get("interface", {}).get("displayName", slug)
        docs = package / "docs"
        docs.mkdir(exist_ok=True)
        body = document(slug, name)
        for filename in ("index.html", "mcp-preview.html", "demo.html"):
            (docs / filename).write_text(body)
        generated.append({"slug": slug, "url": f"{ORIGIN}/plugins/{slug}"})
    return generated


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plugins-root", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps({"linked_products": build(args.plugins_root.resolve())}, indent=2))


if __name__ == "__main__":
    main()
