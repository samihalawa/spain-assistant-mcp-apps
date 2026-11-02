#!/usr/bin/env python3
"""Assemble public downloads without changing any plugin source or review candidate."""
from pathlib import Path, PurePosixPath
import hashlib
import json
import shutil
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
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for slug in SPAIN:
        filename = slug + "-0.6.0.zip"
        source = MASTER / "releases" / "openai" / "v0.6.0" / filename
        shutil.copyfile(source, OUTPUT / filename)
        assert source.read_bytes() == (OUTPUT / filename).read_bytes()
        manifest.append(record(slug, "0.6.0", filename, ["chatgpt", "codex"]))
    filename = "magicinterview-openai-1.4.5.zip"
    subprocess.run(["curl", "--fail", "--location", "--silent", "--show-error",
                    "https://github.com/samihalawa/magicinterview-plugin/releases/download/v1.4.5/" + filename,
                    "--output", str(OUTPUT / filename)], check=True)
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
    (OUTPUT / "manifest.json").write_text(json.dumps({"downloads": manifest}, ensure_ascii=False, indent=2) + "\n")
    assert len(manifest) == 12


if __name__ == "__main__":
    main()
