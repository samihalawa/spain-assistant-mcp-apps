#!/usr/bin/env python3
"""Assemble public downloads without changing any plugin source or review candidate."""
from pathlib import Path, PurePosixPath
import argparse
import hashlib
import io
import json
import re
import subprocess
import zipfile

CONNECTOR = Path(__file__).resolve().parents[1]
MASTER = CONNECTOR.parents[1]
OUTPUT = CONNECTOR / "public" / "downloads"
SPAIN = ("ayudas-espana", "boe-impact", "borme-intelligence", "catastro-pro", "ine-evidence", "licita-espana", "spain-open-data")
LOCAL = ("bunq-banking-mcp", "grokbot", "linkedin-godmode-plugin", "morning-operator")


def digest(payload):
    return hashlib.sha256(payload).hexdigest()


def inspect(path, slug, version):
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None, path.name
        names = archive.namelist()
        assert len(names) == len(set(names)), "Duplicate paths"
        for name in names:
            parts = PurePosixPath(name).parts
            assert not name.startswith("/") and ".." not in parts and "\\" not in name, name
            assert not any(p in {".git", ".github", "node_modules", "__pycache__", "AGENTS.md", "marketplace.json"} for p in parts), name
            assert not any(p.startswith(".env") for p in parts), name
        manifests = [n for n in names if n == "plugin.json" or n == slug + "/plugin.json"]
        if not manifests:
            manifests = [n for n in names if n == ".codex-plugin/plugin.json" or n == slug + "/.codex-plugin/plugin.json"]
        assert len(manifests) == 1, manifests
        plugin = json.loads(archive.read(manifests[0]))
        assert plugin["name"] == slug and plugin["version"] == version, plugin
        return len(names)


def record(slug, version, filename, platforms):
    path = OUTPUT / filename
    count = inspect(path, slug, version)
    row = {"slug": slug, "version": version, "filename": filename, "bytes": path.stat().st_size,
           "sha256": digest(path.read_bytes()), "platforms": platforms, "files": count}
    print(slug, version, count, row["bytes"], row["sha256"])
    return row


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh-unpublished-0.6.2", dest="refresh_unpublished_0_6_2", action="store_true",
                        help="Refresh only the unpublished Spain 0.6.2 candidate after an authorized source correction")
    options = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    prior_path = OUTPUT / "manifest.json"
    prior = json.loads(prior_path.read_text()) if prior_path.exists() else {}
    old_rows = prior.get("downloads", []) + prior.get("archived", [])
    prior_hashes = {row["filename"]: row["sha256"] for row in old_rows}
    manifest = []
    for slug in SPAIN:
        source = MASTER / "plugins" / slug
        version = json.loads((source / "plugin.json").read_text())["version"]
        assert version == "0.6.2", "Wait for the canonical Spain 0.6.2 policy migration before packaging"
        filename = slug + "-" + version + ".zip"
        reference = MASTER / "releases" / "openai" / "v0.6.0" / (slug + "-0.6.0.zip")
        with zipfile.ZipFile(reference) as archive:
            names = archive.namelist()
        assert len(names) == 16 and "plugin.json" in names
        release_dir = MASTER / "releases" / "openai" / ("v" + version)
        release_dir.mkdir(parents=True, exist_ok=True)
        release_file = release_dir / filename
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for name in names:
                payload = (source / name).read_bytes()
                assert not re.search(rb"https?://[a-zA-Z0-9_.-]+\.github\.io(?:/|\b)", payload), name
                info = zipfile.ZipInfo(name, date_time=(2026, 11, 2, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = ((source / name).stat().st_mode & 0xFFFF) << 16
                archive.writestr(info, payload)
        payload = buffer.getvalue()
        if filename in prior_hashes and not options.refresh_unpublished_0_6_2:
            assert digest(payload) == prior_hashes[filename], "Existing version is immutable"
        if release_file.exists() and not options.refresh_unpublished_0_6_2:
            assert release_file.read_bytes() == payload, "Existing release archive is immutable"
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            for name in names:
                assert archive.read(name) == (source / name).read_bytes(), name
        release_file.write_bytes(payload)
        (OUTPUT / filename).write_bytes(payload)
        assert release_file.read_bytes() == (OUTPUT / filename).read_bytes()
        manifest.append(record(slug, version, filename, ["chatgpt", "codex"]))
    filename = "magicinterview-openai-1.4.5.zip"
    if not (OUTPUT / filename).exists():
        subprocess.run(["curl", "--fail", "--location", "--silent", "--show-error",
                        "https://github.com/samihalawa/magicinterview-plugin/releases/download/v1.4.5/" + filename,
                        "--output", str(OUTPUT / filename)], check=True)
    if filename in prior_hashes:
        assert digest((OUTPUT / filename).read_bytes()) == prior_hashes[filename], "MagicInterview archive changed"
    manifest.append(record("magicinterview", "1.4.5", filename, ["chatgpt", "codex"]))
    for slug in LOCAL:
        source = MASTER / "plugins" / slug
        version = json.loads((source / "plugin.json").read_text())["version"]
        filename = slug + "-" + version + ".zip"
        tracked = subprocess.check_output(["git", "-C", str(MASTER), "ls-files", "-z", "plugins/" + slug], text=True).split("\0")
        included = []
        for tracked_path in tracked:
            if not tracked_path:
                continue
            relative = Path(tracked_path).relative_to(Path("plugins") / slug)
            parts = relative.parts
            if any(p in {".github", ".git", "node_modules", "__pycache__", "tests", "AGENTS.md", "marketplace.json", ".gitignore"} for p in parts):
                continue
            if any(p.startswith(".env") or p.startswith("test_") for p in parts):
                continue
            if slug == "linkedin-godmode-plugin" and (parts[0] == "src" or relative.name in {"tsconfig.json", "vitest.config.ts"}):
                continue
            included.append(relative)
        with zipfile.ZipFile(OUTPUT / filename, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for relative in sorted(included):
                info = zipfile.ZipInfo(slug + "/" + relative.as_posix(), date_time=(2026, 11, 2, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = ((source / relative).stat().st_mode & 0xFFFF) << 16
                archive.writestr(info, (source / relative).read_bytes())
        with zipfile.ZipFile(OUTPUT / filename) as archive:
            for relative in included:
                assert digest(archive.read(slug + "/" + relative.as_posix())) == digest((source / relative).read_bytes()), relative
        manifest.append(record(slug, version, filename, ["claude-code", "codex"]))
    assert len(manifest) == 12
    active_files = {row["filename"] for row in manifest}
    archived = {row["filename"]: row for row in old_rows if row["filename"] not in active_files}
    for row in archived.values():
        assert digest((OUTPUT / row["filename"]).read_bytes()) == row["sha256"], "Archived ZIP changed"
    for row in manifest:
        if row["slug"] not in SPAIN and row["filename"] in prior_hashes:
            assert row["sha256"] == prior_hashes[row["filename"]], "Other product archive changed"
    (OUTPUT / "manifest.json").write_text(json.dumps({"downloads": manifest, "archived": list(archived.values())}, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
