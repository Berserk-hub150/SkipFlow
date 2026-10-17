"""Create a deterministic installable ZIP (no build required)."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo

root = Path(__file__).resolve().parent.parent
target = root.parent / f"SkipFlow-{__import__('json').loads((root/'manifest.json').read_text())['version']}.zip"
excluded = {"node_modules", ".git", "test-results", ".playwright-profile", "__pycache__", "downloads"}
with ZipFile(target, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted(root.rglob("*")):
        if not path.is_file() or any(part in excluded for part in path.relative_to(root).parts):
            continue
        if path.name in {".DS_Store", "Thumbs.db"}:
            continue
        info = ZipInfo("SkipFlow/" + path.relative_to(root).as_posix(), (2026, 10, 17, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, path.read_bytes())
print(target)
print(f"{target.stat().st_size:,} bytes")
