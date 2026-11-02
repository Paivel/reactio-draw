"""Make the web version that GitHub Pages serves (web/), from index.html.

index.html is the whole program in one file (the apps and the download use it as it is).
For a site, the NMR shift tables (about 2 MB) are left out of the page: they go into
web/nmr-data.<hash>.json, which the page downloads on the first Predict, after asking,
and keeps in the browser. The name reader (OPSIN and the name tables, names/README.md; about
3 MB) goes the same way into web/names-pack.<hash>.bin, downloaded on the first name that is
not in Reactio Draw's own list. Run from the repository root:  python3 tools/make_web.py
"""
import base64, hashlib, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
page = (root / "index.html").read_text(encoding="utf-8")
m = re.search(r'<script type="application/json" id="nmrData">(.*?)</script>', page, re.S)
if not m:
    raise SystemExit("index.html has no NMR tables block")
data = m.group(1)
name = "nmr-data.%s.json" % hashlib.sha256(data.encode()).hexdigest()[:10]
mb = len(data.encode()) / 1e6
web = root / "web"
web.mkdir(exist_ok=True)
for old in web.glob("nmr-data.*.json"):
    old.unlink()
(web / name).write_text(data, encoding="utf-8")
meta = '<meta name="rd-nmr-pkg" content="%s" data-size="%.1f MB">' % (name, mb)
page = page[:m.start()] + meta + page[m.end():]

m = re.search(r'<script type="application/octet-stream" id="namesPack">(.*?)</script>\n?', page, re.S)
if not m:
    raise SystemExit("index.html has no names pack (run tools/make_names_pack.py)")
pack = base64.b64decode(m.group(1).strip())
pname = "names-pack.%s.bin" % hashlib.sha256(pack).hexdigest()[:10]
pmb = len(pack) / 1e6
for old in web.glob("names-pack.*.bin"):
    old.unlink()
(web / pname).write_bytes(pack)
page = page[:m.start()] + '<meta name="rd-names-pkg" content="%s" data-size="%.1f MB">' % (pname, pmb) + page[m.end():]

# Search engines and link previews (site only; web/og.png is the preview picture)
URL = "https://paivel.github.io/reactio-draw/web/"
TITLE = "Reactio Draw — free open-source chemical structure editor"
DESC = ("Draw molecules and reactions in the browser: reagent tables, NMR prediction, HRMS check, "
        "ChemDraw CDX/CDXML files. Free and open source, works offline.")
head = "\n".join([
    '<title>%s</title>' % TITLE,
    '<meta name="description" content="%s">' % DESC,
    '<link rel="canonical" href="%s">' % URL,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Reactio Draw">',
    '<meta property="og:title" content="%s">' % TITLE,
    '<meta property="og:description" content="%s">' % DESC,
    '<meta property="og:url" content="%s">' % URL,
    '<meta property="og:image" content="%sog.png">' % URL,
    '<meta property="og:image:width" content="1280">',
    '<meta property="og:image:height" content="640">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="%s">' % TITLE,
    '<meta name="twitter:description" content="%s">' % DESC,
    '<meta name="twitter:image" content="%sog.png">' % URL,
])
if page.count("<title>Reactio Draw</title>") != 1:
    raise SystemExit("index.html: <title> not found")
page = page.replace("<title>Reactio Draw</title>", head, 1)
(web / "index.html").write_text(page, encoding="utf-8")
print("web/index.html (%.1f MB), web/%s (%.1f MB) and web/%s (%.1f MB)" % (len(page.encode()) / 1e6, name, mb, pname, pmb))
