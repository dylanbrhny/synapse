"""Submit the pages changed since the last successful deploy to IndexNow (Bing, Yandex and partners).
Run by .github/workflows/indexnow.yml after "Deploy static content to Pages" succeeds.
Env: PREV_SHA = head commit of the previous successful deploy (blank = submit the whole sitemap), DRY_RUN=1 to print only."""
import json, os, pathlib, re, subprocess, sys, urllib.error, urllib.request

HOST = "www.synapsemfg.com"
BASE = f"https://{HOST}/"
root = pathlib.Path(__file__).resolve().parent.parent

keys = [p.stem for p in root.glob("*.txt") if re.fullmatch(r"[0-9a-f]{32}", p.stem) and p.read_text().strip() == p.stem]
if not keys:
    sys.exit("No IndexNow key file at the repo root")
key = keys[0]

def locs(xml):
    return set(re.findall(r"<loc>([^<]+)</loc>", xml))

sitemap = locs((root / "sitemap.xml").read_text(encoding="utf-8"))

def git(*args):
    return subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True)

prev = os.environ.get("PREV_SHA", "").strip()
if prev and git("cat-file", "-e", f"{prev}^{{commit}}").returncode == 0:
    changed = git("diff", "--name-only", prev, "HEAD").stdout.split()
    urls = set()
    for path in changed:
        if path.endswith("index.html"):
            urls.add(BASE + path[: -len("index.html")])
        elif path.endswith(".html"):
            urls.add(BASE + path)
    if "sitemap.xml" in changed:
        old = git("show", f"{prev}:sitemap.xml")
        urls |= sitemap - (locs(old.stdout) if old.returncode == 0 else set())
    urls &= sitemap  # only indexable pages listed in the sitemap
    print(f"{len(changed)} files changed since {prev[:7]}")
else:
    urls = sitemap
    print("No previous deploy to diff against; submitting the whole sitemap")

if not urls:
    print("No sitemap pages changed; nothing to submit")
    sys.exit(0)

urls = sorted(urls)
print("\n".join(urls))
if os.environ.get("DRY_RUN"):
    sys.exit(0)

body = json.dumps({"host": HOST, "key": key, "keyLocation": f"{BASE}{key}.txt", "urlList": urls}).encode()
req = urllib.request.Request("https://api.indexnow.org/indexnow", data=body, headers={"Content-Type": "application/json; charset=utf-8"})
try:
    r = urllib.request.urlopen(req, timeout=30)
    print("IndexNow:", r.status, "submitted", len(urls), "URLs")
except urllib.error.HTTPError as e:
    sys.exit(f"IndexNow HTTP {e.code}: {e.read()[:200]!r}")
