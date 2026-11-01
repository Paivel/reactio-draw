#!/usr/bin/env python3
"""Builds "Reactio Draw.xlam": an Excel add-in with a Reactio Draw tab (structure pictures and properties for a column of
SMILES or names, and the REACTIO formula). Put into Excel's Startup folder it opens with Excel, in every workbook.

The package (Office Open XML) and the tab (Office custom UI, [MS-CUSTOMUI]) are written here. The macros come from
vbaProject.bin: the VBA project Excel itself saved after ReactioExcel.bas was imported into an empty workbook (Excel for
Mac: Tools > Macro > Visual Basic Editor > File > Import File, then File > Save As > Excel Add-in). The project is read
only to check that it still holds ReactioExcel.bas, line for line; after changing ReactioExcel.bas, import it in Excel
again and replace vbaProject.bin (Excel keeps running the code it compiled, so a source written in later is not enough).

usage: python3 make_xlam.py [out.xlam] [--any]   (--any: build even when vbaProject.bin holds an older ReactioExcel.bas)
"""
import io, os, sys, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'word-addin'))
from make_dotm import module_source  # [MS-CFB] and [MS-OVBA] reading, shared with the Word tab

CUSTOM_UI = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<customUI xmlns="http://schemas.microsoft.com/office/2006/01/customui">
  <ribbon>
    <tabs>
      <tab id="rxTab" label="Reactio Draw">
        <group id="rxColumn" label="Selected SMILES or names">
          <button id="rxStructures" label="Structures" size="large" image="rxStructures" onAction="RX_Structures"
            screentip="Structures" supertip="A picture of each selected SMILES or name, in the column headed Structure (or the first free column), inside its cell."/>
          <button id="rxProperties" label="Properties" size="large" image="rxProperties" onAction="RX_Properties"
            screentip="Properties" supertip="Formula, MW, exact mass, cLogP, TPSA, H-bond donors and acceptors, rotatable bonds and InChIKey, into the columns their headers name (name, SMILES, 1H NMR and 13C NMR too, when a header asks), or all of them into the first free columns. In any cell: =REACTIO(B2, &quot;MW&quot;)."/>
          <menu id="rxFormula" label="Formula" size="large" image="rxFormula"
            screentip="Formula" supertip="A column of =REACTIO(cell, &quot;MW&quot;) formulas (or another property) beside the selected SMILES or names: live values that follow the cells.">
            <button id="rxF0" label="MW" tag="MW" onAction="RX_Formula"/>
            <button id="rxF1" label="Formula" tag="formula" onAction="RX_Formula"/>
            <button id="rxF2" label="Exact mass" tag="exact mass" onAction="RX_Formula"/>
            <button id="rxF3" label="cLogP" tag="cLogP" onAction="RX_Formula"/>
            <button id="rxF4" label="TPSA" tag="TPSA" onAction="RX_Formula"/>
            <button id="rxF5" label="H-bond donors" tag="HBD" onAction="RX_Formula"/>
            <button id="rxF6" label="H-bond acceptors" tag="HBA" onAction="RX_Formula"/>
            <button id="rxF7" label="Rotatable bonds" tag="rotatable bonds" onAction="RX_Formula"/>
            <button id="rxF8" label="InChIKey" tag="InChIKey" onAction="RX_Formula"/>
            <button id="rxF9" label="SMILES" tag="SMILES" onAction="RX_Formula"/>
            <button id="rxF10" label="Name" tag="name" onAction="RX_Formula"/>
            <button id="rxF11" label="1H NMR (predicted)" tag="1H NMR" onAction="RX_Formula"/>
            <button id="rxF12" label="13C NMR (predicted)" tag="13C NMR" onAction="RX_Formula"/>
          </menu>
          <button id="rxUpdate" label="Update formulas" size="large" image="rxUpdate" onAction="RX_Update"
            screentip="Update formulas" supertip="Calculates every REACTIO formula again now: cells that still show ... get their values."/>
        </group>
        <group id="rxPictures" label="Pictures">
          <dropDown id="rxStyle" label="Style" getItemCount="RX_StyleCount" getItemLabel="RX_StyleLabel"
            getSelectedItemIndex="RX_StyleIndex" onAction="RX_StyleChange" screentip="Drawing style" supertip="The journal style of the pictures: bond length, line widths and fonts."/>
          <checkBox id="rxColors" label="Atom colors" getPressed="RX_ColorState" onAction="RX_Color"
            screentip="Atom colors" supertip="Off: black structures. On: heteroatoms in color."/>
        </group>
      </tab>
    </tabs>
  </ribbon>
</customUI>
'''

def icons():
    from PIL import Image, ImageDraw
    import math
    S, ink, acc, grid = 256, (40, 44, 52, 255), (37, 99, 235, 255), (150, 156, 166, 255)
    def sheet(d):
        d.rounded_rectangle((14, 30, 242, 226), 14, outline=ink, width=10)
        for x in (90, 166): d.line([(x, 34), (x, 222)], fill=grid, width=5)
        for y in (95, 160): d.line([(18, y), (238, y)], fill=grid, width=5)
    def hexagon(d, cx, cy, r, w, col):
        pts = [(cx + r * math.cos(math.radians(90 + 60 * k)), cy + r * math.sin(math.radians(90 + 60 * k))) for k in range(7)]
        d.line(pts, fill=col, width=w, joint='curve')
    out = {}
    im = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(im); sheet(d)
    d.rectangle((92, 97, 238, 222), fill=(255, 255, 255, 255)); hexagon(d, 166, 160, 48, 11, acc)
    d.rounded_rectangle((14, 30, 242, 226), 14, outline=ink, width=10)
    out['rxStructures'] = im
    im = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(im); sheet(d)
    for y in (122, 188):
        for x0 in (104, 180): d.rectangle((x0, y, x0 + 46, y + 14), fill=acc)
    hexagon(d, 52, 128, 26, 8, ink); hexagon(d, 52, 192, 26, 8, ink)
    out['rxProperties'] = im
    im = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(im); sheet(d)
    d.rectangle((18, 34, 238, 92), fill=(255, 255, 255, 255)); d.rounded_rectangle((14, 30, 242, 226), 14, outline=ink, width=10)
    from PIL import ImageFont
    try: f = ImageFont.truetype('DejaVuSerif-BoldItalic.ttf', 64)
    except Exception: f = ImageFont.load_default()
    d.text((40, 26), 'fx', font=f, fill=acc); hexagon(d, 166, 160, 40, 10, ink)
    out['rxFormula'] = im
    im = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(im)
    d.arc((40, 40, 216, 216), 200, 340, fill=acc, width=18); d.polygon([(202, 70), (232, 118), (178, 120)], fill=acc)
    d.arc((40, 40, 216, 216), 20, 160, fill=ink, width=18); d.polygon([(54, 186), (24, 138), (78, 136)], fill=ink)
    try: f2 = ImageFont.truetype('DejaVuSerif-BoldItalic.ttf', 58)
    except Exception: f2 = ImageFont.load_default()
    d.text((96, 92), 'fx', font=f2, fill=ink)
    out['rxUpdate'] = im
    res = {}
    for k, im in out.items():
        b = io.BytesIO(); im.resize((64, 64), Image.LANCZOS).save(b, 'PNG'); res[k] = b.getvalue()
    return res

def build(out, any_version=False):
    vba = open(os.path.join(HERE, 'vbaProject.bin'), 'rb').read()
    norm = lambda t: [l.rstrip() for l in t.replace('\r\n', '\n').replace('\r', '\n').split('\n') if l.strip()]
    bas = open(os.path.join(HERE, 'ReactioExcel.bas'), encoding='utf-8').read()
    if norm(module_source(vba, 'ReactioExcel')) != norm(bas):
        if not any_version:
            sys.exit('vbaProject.bin does not hold the current ReactioExcel.bas: import it in Excel again (see the notes at the top of make_xlam.py)')
        print('note: vbaProject.bin holds an older ReactioExcel.bas', file=sys.stderr)
    ic = icons()
    R = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    parts = {
        '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
            '<Default Extension="png" ContentType="image/png"/><Default Extension="bin" ContentType="application/vnd.ms-office.vbaProject"/>'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.ms-excel.addin.macroEnabled.main+xml"/>'
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
            '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>',
        '_rels/.rels': R + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
            '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
            '<Relationship Id="rxUI" Type="http://schemas.microsoft.com/office/2006/relationships/ui/extensibility" Target="customUI/customUI.xml"/></Relationships>',
        'docProps/core.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
            'xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Reactio Draw for Excel</dc:title><dc:creator>Pavel Sakharov</dc:creator></cp:coreProperties>',
        'docProps/app.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">'
            '<Application>Microsoft Excel</Application></Properties>',
        'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            # the code names tie the workbook and its sheet to the modules ThisWorkbook and Sheet1 of the VBA project
            '<fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="10112" codeName="{857A39E2-67AF-9BA6-E15C-A4B3A0C75593}"/>'
            '<workbookPr codeName="ThisWorkbook"/><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>',
        'xl/_rels/workbook.xml.rels': R + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            '<Relationship Id="rId3" Type="http://schemas.microsoft.com/office/2006/relationships/vbaProject" Target="vbaProject.bin"/></Relationships>',
        'xl/worksheets/sheet1.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr codeName="Sheet1"/><sheetData/></worksheet>',
        'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<fonts count="1"><font><sz val="12"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
            '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
        'xl/vbaProject.bin': vba,
        'customUI/customUI.xml': CUSTOM_UI,
        'customUI/_rels/customUI.xml.rels': R + ''.join('<Relationship Id="%s" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="images/%s.png"/>' % (k, k) for k in ic) + '</Relationships>',
    }
    for k, v in ic.items(): parts['customUI/images/%s.png' % k] = v
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in parts.items():
            zi = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0)); zi.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zi, data if isinstance(data, bytes) else data.encode('utf-8'))

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    out = args[0] if args else os.path.join(HERE, 'Reactio Draw.xlam')
    build(out, '--any' in sys.argv)
    print('wrote', out)
