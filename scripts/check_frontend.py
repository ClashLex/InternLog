"""Validate local links and all JavaScript syntax without third-party dependencies."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import subprocess
import re

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs, self.scripts, self.current = [], [], None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        ref = attrs.get("href") if tag in ("a", "link") else attrs.get("src") if tag in ("script", "img") else None
        if ref:
            self.refs.append(ref)
        if tag == "script" and not attrs.get("src"):
            self.current = []

    def handle_data(self, data):
        if self.current is not None:
            self.current.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self.current is not None:
            self.scripts.append("".join(self.current))
            self.current = None

errors, count = [], 0

def check_reference(path, ref):
    parsed = urlsplit(ref)
    if not (parsed.scheme or parsed.netloc or not parsed.path or parsed.path.startswith("/")):
        if not (path.parent / unquote(parsed.path)).exists():
            errors.append(f"Missing reference: {path.relative_to(ROOT)} -> {ref}")

pages = list(ROOT.glob("*.html"))
for folder in ("user", "company", "admin"):
    pages.extend((ROOT / folder).glob("*.html"))
for path in pages:
    page = Page()
    page.feed(path.read_text(encoding="utf-8"))
    for ref in page.refs:
        check_reference(path, ref)
    for script in page.scripts:
        if not script.strip():
            continue
        count += 1
        result = subprocess.run(["node", "--check", "-"], input=script.encode("utf-8"), capture_output=True, timeout=15)
        if result.returncode:
            errors.append(f"{path.relative_to(ROOT)}: {result.stderr.decode('utf-8', errors='replace')}")
for path in (ROOT / "js").glob("*.js"):
    result = subprocess.run(["node", "--check", str(path)], capture_output=True, timeout=15)
    if result.returncode:
        errors.append(result.stderr.decode("utf-8", errors="replace"))
for path in (ROOT / "css").glob("*.css"):
    source = path.read_text(encoding="utf-8")
    for match in re.finditer(r'''url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)''', source):
        check_reference(path, next((group.strip() for group in match.groups() if group is not None), ""))
print(f"Checked {len(pages)} pages, {count} inline scripts, shared JavaScript and CSS assets: {len(errors)} errors.")
for error in errors:
    print(error)
raise SystemExit(bool(errors))
