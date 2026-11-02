#!/usr/bin/env python3
"""Put the name files of names/ (OPSIN in JavaScript and Octet Draw's name tables, see names/README.md) into the
page as one gzipped pack: <script type="application/octet-stream" id="namesPack">base64</script>, before the NMR
tables. The pack: "RDNP1", then for each file its name's length (u16, big-endian), the name (UTF-8), its size (u32,
big-endian) and its bytes; a zero length ends it. Run again after changing a file; it replaces the old pack.

usage: python3 tools/make_names_pack.py [page.html]   (default: index.html of the repository)
"""
import base64, gzip, pathlib, re, struct, sys

root = pathlib.Path(__file__).resolve().parent.parent
page_path = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / "index.html"
names = root / "names"
FILES = ["opsin.js", "opsin-data.bin", "dictionary.tsv.gz", "octet-names.json"]
buf = bytearray(b"RDNP1")
for f in FILES:
    b = (names / f).read_bytes()
    if f.endswith(".gz"):
        b = gzip.decompress(b)  # the pack is gzipped as a whole
    n = f.encode()
    buf += struct.pack(">H", len(n)) + n + struct.pack(">I", len(b)) + b
buf += struct.pack(">H", 0)
packed = gzip.compress(bytes(buf), 9, mtime=0)
block = '<script type="application/octet-stream" id="namesPack">' + base64.b64encode(packed).decode() + "</script>"
page = page_path.read_text(encoding="utf-8")
page, n = re.subn(r'<script type="application/octet-stream" id="namesPack">.*?</script>', lambda m: block, page, flags=re.S)
if not n:
    i = page.find('<script type="application/json" id="nmrData">')
    if i < 0:
        raise SystemExit("no NMR tables block to put the names pack before")
    page = page[:i] + block + "\n" + page[i:]
page_path.write_text(page, encoding="utf-8")
print("%s: names pack %.2f MB (%.2f MB unpacked)" % (page_path, len(packed) / 1e6, len(buf) / 1e6))
