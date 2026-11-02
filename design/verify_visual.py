#!/usr/bin/env python3
"""Verify package-local forwarding links; this is not browser visual verification."""
from pathlib import Path
from html.parser import HTMLParser
import argparse
import json

SLUGS = (
    "ayudas-espana", "boe-impact", "borme-intelligence", "catastro-pro",
    "ine-evidence", "licita-espana", "spain-open-data",
)
ORIGIN = "https://aiplugins.megawebs.com"


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonical = []
        self.refresh = []
        self.links = []
        self.scripts = 0

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "link" and attributes.get("rel") == "canonical":
            self.canonical.append(attributes.get("href"))
        if tag == "meta" and attributes.get("http-equiv", "").lower() == "refresh":
            self.refresh.append(attributes.get("content"))
        if tag == "a":
            self.links.append(attributes.get("href"))
        if tag == "script":
            self.scripts += 1


def verify(plugins_root):
    count = 0
    for slug in SLUGS:
        target = f"{ORIGIN}/plugins/{slug}"
        for filename in ("index.html", "mcp-preview.html", "demo.html"):
            path = plugins_root / slug / "docs" / filename
            document = path.read_text()
            parsed = Links()
            parsed.feed(document)
            assert parsed.canonical == [target], f"{path}: wrong canonical URL"
            assert parsed.refresh == [f"0;url={target}"], f"{path}: wrong forwarding URL"
            expected = {target, *(target + "/" + suffix for suffix in ("privacy", "terms", "support"))}
            assert set(parsed.links) == expected, f"{path}: wrong product/policy links"
            assert parsed.scripts == 0, f"{path}: obsolete script remains"
            assert "github.io" not in document, f"{path}: obsolete hosting URL"
            count += 1
    return count


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plugins-root", type=Path, required=True)
    parser.add_argument("--evidence-root", type=Path, help="Legacy argument; no screenshot artifacts are produced")
    parser.add_argument("--isolated-test-browser", action="store_true", help="Legacy argument; no browser is launched")
    args = parser.parse_args()
    count = verify(args.plugins_root.resolve())
    print(json.dumps({"verification": "package_forward_links", "documents": count, "products": len(SLUGS), "browser_visual_test": False}))


if __name__ == "__main__":
    main()
