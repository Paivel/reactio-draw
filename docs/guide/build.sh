#!/bin/sh
# Builds "docs/Reactio Draw - Getting started.pdf" from docs/guide/guide.html
# with Chromium (Playwright page.pdf), and docs/guide/guide.docx with LibreOffice.
#   docs/guide/build.sh          PDF and .docx
#   docs/guide/build.sh --pdf    PDF only
# Needs Node with the playwright package (require('playwright')) and its Chromium;
# the .docx step needs LibreOffice (soffice). Fonts: Liberation Sans, DejaVu Sans Mono.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${GUIDE_PDF:-$HERE/../Reactio Draw - Getting started.pdf}"

GUIDE_HTML="$HERE/guide.html" GUIDE_PDF="$OUT" node - <<'JS'
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
(async () => {
  const browser = await chromium.launch();
  // the viewport is as wide as the text on the page, so the measuring below sees the printed lines
  const page = await browser.newPage({ viewport: { width: 794 - 75 - 78, height: 1000 } });
  await page.emulateMedia({ media: 'print' });
  await page.goto(pathToFileURL(process.env.GUIDE_HTML).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // Widows and orphans of 2 lines: a paragraph of 3 lines or fewer is never split
  // between pages (Chromium would split it 2 + 1).
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('p, li')) {
      if (el.querySelector('p, ul, table, pre')) continue;
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 16;
      if (el.getBoundingClientRect().height < 3.5 * lh) el.style.breakInside = 'avoid';
    }
  });
  await page.pdf({
    path: process.env.GUIDE_PDF,
    format: 'A4',
    margin: { top: '75px', right: '78px', bottom: '76px', left: '75px' },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate:
      '<div style="width:100%;text-align:center;font-family:\'Liberation Sans\',Arial,sans-serif;' +
      'margin:0 0 7.6mm;-webkit-print-color-adjust:exact">' +
      '<span style="font-size:8pt;color:#777">Reactio Draw — Getting started · </span>' +
      '<span class="pageNumber" style="font-size:10.5pt;color:#000"></span></div>',
    outline: true,
    tagged: true,
  });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
JS
echo "PDF: $OUT"

if [ "$1" != "--pdf" ]; then
  # Word version for those who prefer it; guide.html stays the master.
  # LibreOffice would only link the pictures, so they go in as data: URIs first.
  TMP="$(mktemp -d)"
  python3 - "$HERE/guide.html" "$TMP/guide.html" <<'PY'
import base64, mimetypes, os, re, struct, sys
src, dst = sys.argv[1], sys.argv[2]
base = os.path.dirname(src)

def size(path):
    """pixel size of a PNG or JPEG"""
    b = open(path, 'rb').read()
    if b[:8] == b'\x89PNG\r\n\x1a\n':
        return struct.unpack('>II', b[16:24])
    i = 2
    while i < len(b):
        marker, length = b[i + 1], struct.unpack('>H', b[i + 2:i + 4])[0]
        if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
            h, w = struct.unpack('>HH', b[i + 5:i + 9])
            return w, h
        i += 2 + length
    return 1, 1

def embed(m):
    tag = m.group(0)
    path = os.path.join(base, re.search(r'src="([^"]+)"', tag).group(1))
    mime = mimetypes.guess_type(path)[0] or 'image/png'
    data = base64.b64encode(open(path, 'rb').read()).decode()
    w_pt = float(re.search(r'width:([\d.]+)pt', tag).group(1))
    hm = re.search(r'height:([\d.]+)pt', tag)
    pw, ph = size(path)
    h_pt = float(hm.group(1)) if hm else w_pt * ph / pw
    tag = re.sub(r'src="[^"]+"', 'src="data:%s;base64,%s"' % (mime, data), tag)
    # LibreOffice takes the size from width/height attributes (in px), not from CSS
    return tag.replace('<img ', '<img width="%d" height="%d" ' % (round(w_pt * 4 / 3), round(h_pt * 4 / 3)), 1)

html = open(src, encoding='utf-8').read()
html = re.sub(r'<img [^>]*>', embed, html)
# the fonts as LibreOffice reads them
html = html.replace('</style>', '@page { margin: 2cm; }\nbody, p, li, td, th, h1, h2, h3 { font-family: "Liberation Sans"; }\np, li, td, th { font-size: 10.5pt; }\n'
                    'pre, code { font-family: "DejaVu Sans Mono"; }\n</style>', 1)
open(dst, 'w', encoding='utf-8').write(html)
PY
  soffice --headless -env:UserInstallation="file://$TMP/profile" \
    --convert-to 'docx:MS Word 2007 XML' --outdir "$TMP" "$TMP/guide.html" >/dev/null
  mv "$TMP/guide.docx" "$HERE/guide.docx"
  rm -rf "$TMP"
  echo "DOCX: $HERE/guide.docx"
fi
