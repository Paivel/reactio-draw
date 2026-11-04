#!/usr/bin/env python3
"""Builds "Reactio Draw.dotm": a Word template that adds a Reactio Draw tab to Word on Windows and on a Mac
(put into Word's Startup folder, as reference managers do). The tab's buttons call the macros in ReactioDraw.bas.

The package (Office Open XML, ECMA-376) and the tab (Office custom UI, [MS-CUSTOMUI]) are written here. The macros come
from vbaProject.bin: the VBA project Word itself saved after ReactioDraw.bas was imported into a template (Word for Mac:
Developer > Visual Basic > File > Import File, then File > Save As > Word Macro-Enabled Template). This script reads the
project ([MS-CFB] compound file, [MS-OVBA] streams) only to check that it still holds ReactioDraw.bas, line for line;
after changing ReactioDraw.bas, import it in Word again and replace vbaProject.bin (Word for Mac keeps running the
code it compiled, so a source written into the project afterwards is not enough).
  https://learn.microsoft.com/openspecs/office_file_formats/ms-ovba/
  https://learn.microsoft.com/openspecs/windows_protocols/ms-cfb/

usage: python3 make_dotm.py [out.dotm]      (needs Python 3 with Pillow for the button pictures)
"""
import io, os, struct, sys, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))

def ovba_decompress(c):
    assert c[0] == 1
    out, p = bytearray(), 1
    while p < len(c):
        h = struct.unpack_from('<H', c, p)[0]
        size, flag = (h & 0x0FFF) + 3, h >> 15
        end, p, start = p + size, p + 2, len(out)
        if not flag:
            out += c[p:p + 4096]; p += 4096; continue
        while p < end:
            fb = c[p]; p += 1
            for bit in range(8):
                if p >= end: break
                if not fb >> bit & 1:
                    out.append(c[p]); p += 1
                else:
                    tok = struct.unpack_from('<H', c, p)[0]; p += 2
                    dl = len(out) - start
                    bc = max(4, (dl - 1).bit_length())
                    off, ln = (tok >> (16 - bc)) + 1, (tok & (0xFFFF >> bc)) + 3
                    for _ in range(ln): out.append(out[-off])
    return bytes(out)

# ---------- reading the VBA project Word saved: [MS-CFB] compound file, [MS-OVBA] dir stream and modules ----------
def cfb_streams(b):
    ss = 1 << struct.unpack_from('<H', b, 30)[0]
    nfat, dir0 = struct.unpack_from('<II', b, 44)
    cut, mf0, nmf = struct.unpack_from('<III', b, 56)
    difat = struct.unpack_from('<109I', b, 76)
    sec = lambda i: 512 + i * ss
    fat = []
    for s in difat[:nfat]: fat.extend(struct.unpack_from('<%dI' % (ss // 4), b, sec(s)))
    def chain(s):
        o = []
        while s < 0xFFFFFFFA: o.append(s); s = fat[s]
        return o
    rd = lambda s: b''.join(b[sec(i):sec(i) + ss] for i in chain(s))
    d, ents = rd(dir0), []
    for i in range(len(d) // 128):
        e = d[i * 128:i * 128 + 128]; nl = struct.unpack_from('<H', e, 64)[0]
        t, _, l, r, ch = struct.unpack_from('<BBIII', e, 66); st, sz = struct.unpack_from('<IQ', e, 116)
        ents.append(dict(name=e[:max(0, nl - 2)].decode('utf-16-le'), t=t, l=l, r=r, ch=ch, st=st, sz=sz))
    mini = rd(ents[0]['st']); mf = rd(mf0) if nmf else b''
    mfat = list(struct.unpack_from('<%dI' % (len(mf) // 4), mf))
    def data(e):
        if e['sz'] >= cut: return rd(e['st'])[:e['sz']]
        o, s = b'', e['st']
        while s < 0xFFFFFFFA: o += mini[s * 64:s * 64 + 64]; s = mfat[s]
        return o[:e['sz']]
    out = {}
    def walk(i, pre):
        if i == 0xFFFFFFFF: return
        e = ents[i]; walk(e['l'], pre)
        if e['t'] == 2: out[pre + e['name']] = data(e)
        if e['t'] == 1: walk(e['ch'], pre + e['name'] + '/')
        walk(e['r'], pre)
    walk(ents[0]['ch'], '')
    return out

def module_source(vba, name):
    """the source text of one module, found through the dir stream's MODULEOFFSET"""
    s = cfb_streams(vba)
    d, p, cur, off = ovba_decompress(s['VBA/dir']), 0, None, {}
    while p < len(d):
        i, sz = struct.unpack_from('<HI', d, p); p += 6
        if i == 0x09: p += 6; continue
        v = d[p:p + sz]; p += sz
        if i == 0x19: cur = v.decode('latin-1')
        if i == 0x31: off[cur] = struct.unpack('<I', v)[0]
        if i == 0x10: break
    return ovba_decompress(s['VBA/' + name][off[name]:]).decode('mac_roman')

# ---------- the button pictures ----------
def icons():
    from PIL import Image, ImageDraw
    import math
    S, ink, acc = 256, (40, 44, 52, 255), (37, 99, 235, 255)
    def hexagon(d, cx, cy, r, w, col):
        pts = [(cx + r * math.cos(math.radians(90 + 60 * k)), cy + r * math.sin(math.radians(90 + 60 * k))) for k in range(7)]
        d.line(pts, fill=col, width=w, joint='curve')
        ip = [(cx + r * .62 * math.cos(math.radians(90 + 60 * k)), cy + r * .62 * math.sin(math.radians(90 + 60 * k))) for k in (1, 2, 3, 4, 5, 6)]
        for a, b in ((0, 1), (2, 3), (4, 5)): d.line([ip[a], ip[b]], fill=col, width=w)
    def frame(d):
        d.rounded_rectangle((26, 40, 230, 216), 18, outline=ink, width=12)
    out = {}
    im = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(im); frame(d); hexagon(d, 116, 128, 54, 11, ink)
    for cx, cy, r in ((196, 74, 26), (176, 124, 13)):  # sparkles: clean
        d.polygon([(cx, cy - r), (cx + r * .3, cy - r * .3), (cx + r, cy), (cx + r * .3, cy + r * .3), (cx, cy + r), (cx - r * .3, cy + r * .3), (cx - r, cy), (cx - r * .3, cy - r * .3)], fill=acc)
    out['rdPlain'] = im
    im = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(im)
    d.polygon([(48, 18), (160, 18), (208, 66), (208, 238), (48, 238)], outline=ink, width=12); d.line([(158, 20), (158, 68), (206, 68)], fill=ink, width=12)
    hexagon(d, 118, 116, 44, 10, ink)
    d.line([(128, 168), (128, 226)], fill=acc, width=16); d.polygon([(96, 204), (160, 204), (128, 240)], fill=acc)
    out['rdCdxml'] = im
    im = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(im); hexagon(d, 104, 140, 62, 11, ink)  # edit: a pencil over the ring
    d.polygon([(150, 186), (214, 72), (240, 88), (176, 202)], fill=acc); d.polygon([(150, 186), (176, 202), (146, 226)], fill=ink)
    out['rdEdit'] = im
    im = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(im)  # update: two arrows going round
    d.arc((40, 40, 216, 216), 200, 340, fill=acc, width=18); d.polygon([(202, 70), (232, 118), (178, 120)], fill=acc)
    d.arc((40, 40, 216, 216), 20, 160, fill=ink, width=18); d.polygon([(54, 186), (24, 138), (78, 136)], fill=ink)
    hexagon(d, 128, 128, 34, 9, ink)
    out['rdUpdate'] = im
    im = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(im); d.rounded_rectangle((10, 48, 168, 208), 16, outline=ink, width=12); hexagon(d, 89, 128, 46, 10, ink)  # marks: a pilcrow beside a picture
    d.ellipse((184, 76, 232, 124), fill=acc); d.rectangle((212, 76, 222, 212), fill=acc); d.rectangle((234, 76, 244, 212), fill=acc); d.rectangle((208, 76, 248, 86), fill=acc)
    out['rdMark'] = im
    im = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(im); hexagon(d, 92, 104, 58, 11, ink)  # number: a ring with its number under it
    d.rounded_rectangle((132, 150, 244, 244), 14, fill=acc)
    d.line([(178, 166), (196, 160), (196, 230)], fill=(255, 255, 255, 255), width=14)
    out['rdNumber'] = im
    im = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(im); hexagon(d, 128, 92, 52, 11, ink)  # marks: a ring over [[ ]]
    for x0, k in ((40, 1), (216, -1)):
        for j in (0, 22):
            xa = x0 + k * j
            d.line([(xa + k * 18, 160), (xa, 160), (xa, 236), (xa + k * 18, 236)], fill=acc, width=10)
    out['rdMarks'] = im
    im = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(im); hexagon(d, 128, 92, 52, 11, ink)  # remove marks: [[ ]] crossed out
    for x0, k in ((40, 1), (216, -1)):
        for j in (0, 22):
            xa = x0 + k * j
            d.line([(xa + k * 18, 160), (xa, 160), (xa, 236), (xa + k * 18, 236)], fill=ink, width=10)
    d.line([(30, 246), (226, 150)], fill=acc, width=16)
    out['rdUnmark'] = im
    im = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(im)  # final copy: a page with a ring and a tick
    d.polygon([(48, 18), (160, 18), (208, 66), (208, 238), (48, 238)], outline=ink, width=12); d.line([(158, 20), (158, 68), (206, 68)], fill=ink, width=12)
    hexagon(d, 118, 116, 40, 10, ink)
    d.line([(96, 196), (124, 222), (180, 160)], fill=acc, width=18)
    out['rdFinal'] = im
    app = os.path.join(HERE, '..', 'linux-app', 'reactiodraw.png')
    out['rdOpen'] = Image.open(app).convert('RGBA')
    res = {}
    for k, im in out.items():
        b = io.BytesIO(); im.resize((64, 64), Image.LANCZOS).save(b, 'PNG'); res[k] = b.getvalue()
    return res

# ---------- the template package ----------
CUSTOM_UI = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<customUI xmlns="http://schemas.microsoft.com/office/2006/01/customui" onLoad="RD_Load">
  <ribbon>
    <tabs>
      <tab id="rdTab" label="Reactio Draw">
        <group id="rdWord" label="Reactio Draw">
          <button id="rdPlain" label="Plain pictures" size="large" image="rdPlain" onAction="RD_Plain"
            screentip="Plain pictures" supertip="Saves the document and makes a copy of it with plain vector pictures, without Reactio Draw data, and opens the copy."/>
          <button id="rdCdxml" label="Export to CDXML" size="large" image="rdCdxml" onAction="RD_Cdxml"
            screentip="Export to CDXML" supertip="Saves all structures of the document in one CDXML file next to it, one under another (Reactio Draw and ChemDraw drawings)."/>
          <button id="rdOpen" label="Open in Reactio Draw" size="large" image="rdOpen" onAction="RD_Open"
            screentip="Open in Reactio Draw" supertip="Opens all structures of the document on one sheet in Reactio Draw."/>
        </group>
        <group id="rdNumbers" label="Compound numbers">
          <box id="rdStyleBox" boxStyle="vertical">
            <comboBox id="rdFmt" label="Style" sizeString="SI-{n}xx" getText="RD_FmtText" onChange="RD_FmtChange"
              screentip="Style of the numbers" supertip="How the numbers of this document look: {n} gives 1, 2, 3; S{n} gives S1, S2, S3; any text with {n} in it. Kept in the document; it comes before a [[#format …]] line in the text. Empty: the line in the text, else {n}.">
              <item id="rdFmt1" label="{n}"/>
              <item id="rdFmt2" label="S{n}"/>
              <item id="rdFmt3" label="({n})"/>
            </comboBox>
            <editBox id="rdStart" label="From" sizeString="0000" getText="RD_StartText" onChange="RD_StartChange"
              screentip="First number" supertip="The number the first compound gets (1 when left empty). Kept in the document; it comes before a [[#start …]] line in the text."/>
          </box>
          <box id="rdBoldBox" boxStyle="vertical">
            <checkBox id="rdBoldText" label="Bold in text" getPressed="RD_BoldState" onAction="RD_BoldSet"
              screentip="Bold numbers in the text" supertip="The numbers in the text bold, whatever the mark is written in. Not ticked: as the mark is written. Kept in the document."/>
            <checkBox id="rdBoldDraw" label="Bold in drawings" getPressed="RD_BoldState" onAction="RD_BoldSet"
              screentip="Bold numbers in the drawings" supertip="The numbers in Reactio Draw drawings bold, whatever the mark is written in. Not ticked: as the mark is written. Kept in the document."/>
          </box>
          <button id="rdNumber" label="Number compounds" size="large" image="rdNumber" onAction="RD_Number"
            screentip="Number compounds" supertip="Numbers the compounds from their marks, in the text and in Reactio Draw drawings: [[aldehyde]] 7, [[aldehyde.OMe.letter]] 7a, [[aldehyde.OMe.num]] 7.1, by first appearance in the drawings, in their order (compounds only in the text come after). Style and From on this tab (or [[#format S{n}]] and [[#start 5]] in the text) set how they look. The document stays open (Undo takes it back); the marks stay, so press again after adding compounds."/>
          <button id="rdMarks" label="Show marks" size="large" image="rdMarks" onAction="RD_ShowMarks"
            screentip="Show marks" supertip="Shows the marks ([[aldehyde]]) instead of the numbers, in the text and in the drawings, to see which mark to write. Number compounds puts the numbers back."/>
          <button id="rdUnmark" label="Remove marks" size="large" image="rdUnmark" onAction="RD_Unmark"
            screentip="Remove marks" supertip="Makes a copy of the document with the numbers as plain text and no marks left, in the text and in the drawings (they stay Reactio Draw drawings), and opens it. This document keeps its marks."/>
          <button id="rdFinal" label="Final copy" size="large" image="rdFinal" onAction="RD_Final"
            screentip="Final copy" supertip="Makes a copy to send: numbers as plain text, no marks, and plain vector pictures without Reactio Draw data; opens it. This document keeps its marks and drawings."/>
        </group>
        <group id="rdDrawing" label="Drawing">
          <button id="rdEdit" label="Edit drawing" size="large" image="rdEdit" onAction="RD_Edit"
            screentip="Edit drawing" supertip="Opens the selected drawing in Reactio Draw. Save there (Cmd+S, or Save when you close its tab) puts the new drawing back in its place here. On Windows, double-click the object instead."/>
          <button id="rdUpdate" label="Update" size="large" image="rdUpdate" onAction="RD_Update"
            screentip="Update from Reactio Draw" supertip="Puts drawings saved in Reactio Draw back in place. Reactio Draw does this by itself once macOS lets it control Word."/>
          <toggleButton id="rdMark" label="Mark drawings" size="large" image="rdMark" onAction="RD_Mark" getPressed="RD_MarkState"
            screentip="Mark drawings" supertip="A small mark beside every picture that holds a Reactio Draw drawing: seen on screen, never printed. The button stays pressed while the marks are on; press again to take them away."/>
        </group>
      </tab>
    </tabs>
  </ribbon>
</customUI>
'''
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

def build(out):
    # the macros: the VBA project Word itself saved from ReactioDraw.bas (Word on a Mac, File > Import File, Save As .dotm);
    # Word compiles it again on Windows. Checked here: its module must be ReactioDraw.bas, line for line
    vba = open(os.path.join(HERE, 'vbaProject.bin'), 'rb').read()
    # compared without regard to case: VBA is case-blind and gives a name the same case everywhere in the project (a
    # parameter once called text turns every .Text into .text, even after the module is imported again)
    norm = lambda t: [l.rstrip().lower() for l in t.replace('\r\n', '\n').replace('\r', '\n').split('\n') if l.strip()]
    bas = open(os.path.join(HERE, 'ReactioDraw.bas'), encoding='utf-8').read()
    # Word for Mac reads an imported module as Mac Roman: anything past ASCII would come out garbled
    if any(ord(ch) > 127 for ch in bas):
        sys.exit('ReactioDraw.bas has characters past ASCII: Word would garble them; write them in ASCII')
    if norm(module_source(vba, 'ReactioDraw')) != norm(bas):
        # Word for Mac runs the compiled code it saved, not a source put in later: import ReactioDraw.bas in Word again
        sys.exit('vbaProject.bin does not hold the current ReactioDraw.bas: import it in Word again (see the notes at the top of make_dotm.py)')
    # the template's own document module (ThisDocument): its code is ThisDocument.cls, pasted into it in Word
    code = lambda t: [l for l in norm(t) if not l.startswith('attribute ')]   # Word adds its own Attribute lines
    if code(module_source(vba, 'ThisDocument')) != code(open(os.path.join(HERE, 'ThisDocument.cls'), encoding='utf-8').read()):
        sys.exit('vbaProject.bin does not hold the current ThisDocument.cls: paste it into ThisDocument in Word again (see the notes at the top of make_dotm.py)')
    ic = icons()
    parts = {
        '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
            '<Default Extension="png" ContentType="image/png"/><Default Extension="bin" ContentType="application/vnd.ms-office.vbaProject"/>'
            '<Override PartName="/word/document.xml" ContentType="application/vnd.ms-word.template.macroEnabledTemplate.main+xml"/>'
            '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
            '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>',
        '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
            '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
            '<Relationship Id="rdUI" Type="http://schemas.microsoft.com/office/2006/relationships/ui/extensibility" Target="customUI/customUI.xml"/></Relationships>',
        'docProps/core.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
            'xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Reactio Draw tab for Word</dc:title><dc:creator>Pavel Sakharov</dc:creator></cp:coreProperties>',
        'docProps/app.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">'
            '<Application>Reactio Draw</Application><Template>Reactio Draw.dotm</Template></Properties>',
        'word/document.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="%s"><w:body><w:p><w:r><w:t>'
            'Reactio Draw tab for Word. This template lives in Word\'s Startup folder and adds the Reactio Draw tab.</w:t></w:r></w:p>'
            '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>' % W,
        'word/_rels/document.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.microsoft.com/office/2006/relationships/vbaProject" Target="vbaProject.bin"/></Relationships>',
        'word/vbaProject.bin': vba,
        'customUI/customUI.xml': CUSTOM_UI,
        'customUI/_rels/customUI.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            + ''.join('<Relationship Id="%s" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="images/%s.png"/>' % (k, k) for k in ic)
            + '</Relationships>',
    }
    for k, v in ic.items(): parts['customUI/images/%s.png' % k] = v
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in parts.items():
            zi = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0)); zi.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zi, data if isinstance(data, bytes) else data.encode('utf-8'))
    return parts

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'Reactio Draw.dotm')
    build(out)
    print('wrote', out)
