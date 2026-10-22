# How the code is laid out

Reactio Draw's editor is one file, `index.html`: HTML, CSS and JavaScript, no build step and no
dependencies to install. Open it in a browser and it runs; the Windows, Mac and Linux apps load the same
file. This page is a map of that file, so you can find your way in it.

**Finding things:** search for a function name (`function importCdxml`). Line numbers below are rough
and move as the file changes; the names do not.

The CSS and JavaScript are laid out by Prettier (line width 110, single quotes); please keep that style in
your changes.

## The file from top to bottom

| Part | About where | What is there |
| --- | --- | --- |
| CSS | lines 1–2771 | all styles; colour tokens on `:root`, dark theme, the top bar and panels |
| HTML | 2771–3215 | the layout (below); every button carries a `data-tool`, `data-act` or `data-tab` attribute |
| Desktop bridge | 3216–3280 | how the page talks to the Windows, Mac and Linux apps (`window.rdNative`, `rdDesktop`) |
| **Editor code** | 3280–41759 | everything else in this guide |
| Bundled libraries and data | 41759–end | each a single very long line; skip them when reading (below) |

The HTML layout: `#docTabs` (document tabs), `#tools` (left toolbar), `#cv` with `#topbar` and the
drawing `<svg id="mol">`, the right panel `aside.info` with its panes (`analysis`, `infow`, `chars`, `lib`,
`keys`), and `section.ledger`, the reagent table under the sheet.

## The data: one document

Everything drawn is in `S.mol` (also reachable as `mol`), a plain object saved as JSON:

- `mol.atoms`: `{id, x, y, el, chg, label?, grp?, rad?, col?, …}`. `label` is the text shown (OMe, PPh2);
  `grp` is the SMILES the label stands for, so formula and mass work.
- `mol.bonds`: `{id, a, b, order, stereo?}`; `a` and `b` are atom ids; `stereo` is wedge, hash, bold,
  dash, wavy, hashplain or deloc.
- `mol.arrows`: arrows and every other drawn object, told apart by `kind`: none (an arrow), `brk`
  (brackets), `shp` (shapes and lines), `orb` (orbitals), `img` (pictures), `tbl` (a table on the sheet),
  `pie` and `radar` (charts).
- `mol.texts`: captions, `{id, x, y, text, size, …}`; rich text is marked inline: `_{sub}`, `^{sup}`,
  `\b{bold}`, `\i{italic}`.
- `S` also holds the reagent table rows, conditions, the style and the zoom.

A `.reactio` file is `{rd: 1, state: S}`. Each tab is its own `S`, kept in the browser's storage.

## The rules every change follows

- Before changing the drawing call `snap()` (one undo step); after it call `commit()`, which tidies up,
  renumbers compounds, saves and redraws.
- `render()` draws the whole sheet into `<svg id="mol">` from `mol`; nothing is drawn elsewhere.
- Coordinates are sheet units (a standard bond is about 40 long); the view (`zoom`, `fitView`, `fitAll`)
  only changes the SVG `viewBox`.

## Where to look

| Topic | Functions to search for |
| --- | --- |
| State, undo, saving | `defaults`, `cleanState`, `snap`, `undo`, `redo`, `save`, `commit` |
| Chemistry: valence, labels, formula | `valenceOf`, `implicitH`, `resolveLabel`, `setLabel`, `chemParse`, `countsOf`, `mwOf`, `exactOf`, `isoPattern`; the names lists `TRIVIAL`, `NICK` and `BCL` (BChemLookup); text as a structure `textStructSmiles` |
| SMILES in and out | `parseSmiles`, `fragSmiles`, `currentSmiles`, `kekulize` |
| Layout and Clean Up | `layoutG`, `layoutStart` (where a layout begins), `placeRing`, `placeSystem` (fused rings), `placeGraph`, `doClean`, `cleanFragments` (keeps R/S and E/Z), `cleanReaction` |
| Drawing the sheet | `render`, `arrowSVG`, `bracketSVG`, `shapeSVG`, `orbitalSVG`, `pieSVG`, `radSVG`, `tableSVG` |
| Mouse, pen and touch | `touchDown`, `touchMove`, `touchUp`, `endDrag`, `runTool`, `hitAt`, `dragHandle` |
| Keyboard drawing and hotkeys | `atomKey`, `bondKey`, `navHotspot`, `renderKeys` |
| Arrows | `makeArrow`, `mechSnap`, `arrowPts`, `headSVG` |
| Structure checks | `structChecks`, `runChecks` |
| Reagent table | `schemeOrder`, `syncTable`, `calc`, `renderTable`, `renderCond` |
| Analysis, HRMS | `updateInfo`, `refreshAna`, `hrmsCandidates` |
| NMR prediction | `nmrEnsure`, `nmrPredict`, `nmrRun` (the shift encoder is its own `<script>` near the end) |
| InChI | `inchiOf`, `inchiMolfile` |
| Molfile, SDF, RXN | `molBlock`, `parseMolBlock`, `exportFormats` |
| CDXML and CDX out | `cdxmlOf`, `cdxBoxes`, `cdxOfCdxml` |
| CDXML and CDX in | `importCdxml0` (the reader), `importCdxml`, `importCdxBytes`, `cdxmlOfCdx` |
| Pictures out: SVG, PNG, EPS, TIFF | `svgOf`, `pngOf`, `epsOf`, `tiffOf` |
| Word and PowerPoint | `docxOf`, `chemOleOf`, `rtfObjectOf`, `gvmlOf`, `wordOpen`, `wordDrawings`, `wordReturn` |
| Opening and saving files, tabs | `openFile`, `openExternal`, `fileBody`, `saveDoc`, `newTab`, `renderTabs` |
| Templates | `placeTpl`, `placeTplOnBond`, `placeTplOnAtom`, `tplsFromCdxml` |
| 3D | `embed3D`, `start3D`, `shape3D` |
| Colour themes and styles | `THEMES`, `applyTheme`, `applyStyle` |
| API and command line | `API_OPS`, `ReactioAPI`, `rdCliRun` |
| Top bar and panels | `makeFold`, `saveLayout`, `applyLayout` |

## The bundled part at the end

These blocks are other people's code or data, kept in the page so it works offline. Each is one very long
line; do not edit them by hand.

| Block | What it is | Where it comes from |
| --- | --- | --- |
| `<script id="oclLib">` | OpenChemLib (3D, stereo parities, some layout) | openchemlib-js, BSD-3-Clause |
| `<script id="oclRes">` | OpenChemLib's data files | the same |
| the NMR encoder `<script>` | how an atom's surroundings are encoded for the shift tables | this project; also used by `data/nmr` |
| `<script id="licTexts">` | the licence texts shown under Licenses | `LICENSES/` |
| `<script id="inchiWasm">` | the InChI library compiled to WebAssembly | `tools/inchi` builds it |
| `<script id="nmrData">` | the NMR shift tables | `data/nmr` builds them from nmrshiftdb2 |

`tools/make_web.py` makes the site in `web/` from `index.html` (it moves the NMR tables into their own
file); do not edit `web/` by hand.

## The other folders

`windows-app/` (Go, WebView2, the OLE server for Word and PowerPoint, the local API), `macapp/` (Swift),
`linux-app/` (Go, GTK and WebKitGTK), `word-addin/` (the Reactio Draw tab for Word), `tools/` (build
scripts), `data/nmr/` (how the NMR tables are made), `examples/` (the editor embedded in another page).
README.md says how to build each.

## Trying a change

Open `index.html` in Chrome or Firefox: that is the whole build. The browser console (F12) shows errors.
`window.ReactioAPI.run('help')` lists the API commands, handy for checking a change from the console.
There is no automated test suite in the repository yet.
