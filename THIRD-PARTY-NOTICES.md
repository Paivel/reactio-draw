# Third-party components

Reactio Draw is licensed under the GNU Affero General Public License v3.0 or later (see `LICENSE`).
It includes or uses the components below; each keeps its own license. Full texts are in `LICENSES/`.

## Included in the program

| Component | Used for | License | Copyright | Source |
| --- | --- | --- | --- | --- |
| OpenChemLib (openchemlib-js 9.25.1), with its MMFF94 tables and torsion data | 3D shapes, stereo SMILES, structure comparison | BSD-3-Clause | © 2015–2017 cheminfo (JS); © 1997–2016 Actelion Pharmaceuticals Ltd. / Idorsia (Java core) | https://github.com/cheminfo/openchemlib-js |
| InChI library 1.07 (compiled to WebAssembly from the unchanged C source; `tools/inchi`) | InChI and InChIKey of a structure | MIT (`LICENSES/InChI-MIT.txt`) | © 2024 InChI Project (InChI Trust / IUPAC) | https://github.com/IUPAC-InChI/InChI |
| OPSIN 2.9.0 (`opsin-2.9.0.jar` in `tools/` on Windows and Linux, `opsin.jar` on the Mac; shipped unchanged) | name → structure | MIT | © 2017 Daniel Lowe | https://github.com/dan2097/opsin |
| Libraries inside the OPSIN jar: jna-inchi 1.3.1 with InChI 1.07, JNA, Apache Log4j 2.25.3, Woodstox 7.1.1, StAX2 4.2.2, Apache Commons IO 2.21.0 and CLI 1.11.0, dk.brics.automaton 1.12-4, MSV xsdlib 2022.7, ISO RELAX | used by OPSIN | LGPL-2.1-or-later (jna-inchi), Apache-2.0 or LGPL-2.1 (JNA), Apache-2.0, BSD-2-Clause, BSD-3-Clause, MIT | their authors | the full list with versions, licenses and sources: `LICENSES/OPSIN-bundled-libraries.txt` |
| ReShiki: journal style values, color themes and the CDX property table (data; ReShiki takes the CDX table from the published CDX documentation of CambridgeSoft, the CDX SDK archived by IUPAC FAIRSpec) | drawing styles, color themes, CDX reading and writing | MIT OR Apache-2.0 (used under MIT) | © 2026 Ameyanagi and ReShiki contributors | https://github.com/Ameyanagi/ReShiki |
| go-webview2 (Windows app) | window and web view | MIT | © 2020 John Chadwick; portions © 2017 Serge Zaitsev | https://github.com/jchv/go-webview2 |
| go-ole code inside go-webview2 (`pkg/edge/guid.go`, adapted; Windows app) | COM GUIDs | MIT (`LICENSES/go-ole-MIT.txt`) | © 2013–2017 Yasuhiro Matsumoto | https://github.com/go-ole/go-ole |
| golang.org/x/sys (Windows app) | Windows system calls | BSD-3-Clause | © 2009 The Go Authors | https://go.googlesource.com/sys |
| Microsoft WebView2Loader.dll (beside the Windows app as WebView2Loader-x64.dll or WebView2Loader-arm64.dll, unchanged and Microsoft-signed) | starting Edge WebView2 | BSD-3-Clause | © Microsoft Corporation | [WebView2 SDK](https://www.nuget.org/packages/Microsoft.Web.WebView2) |
| purego 0.8.4 (Linux app) | loading GTK and WebKitGTK at start | Apache-2.0 | © 2022 The Ebitengine Authors | https://github.com/ebitengine/purego |

## Data included in the program

| Data | Used for | License | Note |
| --- | --- | --- | --- |
| NMR shift tables derived from nmrshiftdb2 (export 2026-03-15, measured spectra) | NMR prediction | nmrshiftdb2 Database License (`LICENSES/nmrshiftdb2-Database-License.txt`) | Contains information from nmrshiftdb2 (https://nmrshiftdb.nmr.uni-koeln.de), which is made available here under the nmrshiftdb2 Database License. The derivative tables and the code that makes them are in `data/nmr/`. |
| The look of the 3D styles from xyzrender's presets (default, tube and vdw): ball, bond and outline sizes as fractions of the van der Waals radius, the shading tints and the depth fog values | 3D styles (Ball and stick, Tubes, Spheres) | MIT (`LICENSES/xyzrender-MIT.txt`) | © 2026 Alister S. Goodfellow, https://github.com/aligfellow/xyzrender (commit 828e721e40b18f1944c87f949ce224af812dc649); only these values were taken, the drawing is Reactio Draw's own code |
| Abbreviations and reagent names from the Beilstein Chemical Lookup Collection (BChemLookup, 2026-10-08) | atom labels (OTES, DMTr, 2-py…), names to structures, reagents written as text | CC0 1.0 Universal | Beilstein-Institut, https://github.com/Beilstein-Institut/BChemLookup ; only entries Reactio Draw did not know, each group rewritten with its attachment atom first |

## Used but not included

| Component | Used for | License | Note |
| --- | --- | --- | --- |
| openclatura | structure → name (“Name it”) | MIT | installed by the user (`pip install openclatura`); run unchanged; https://github.com/lamalab-org/openclatura |
| RDKit | used by openclatura | BSD-3-Clause | installed with openclatura |
| Java runtime, Python | run OPSIN and openclatura | their own licenses | installed by the user |
| GTK 3, WebKitGTK (Linux app) | the window and the page | LGPL-2.1-or-later (and BSD for parts of WebKit) | the system's own libraries, loaded at start; not shipped |

## Data and references (facts, no code copied)

- Atomic weights, monoisotopic masses, isotope abundances: IUPAC/NIST values.
- MMFF94 force field (in OpenChemLib): T. A. Halgren, J. Comput. Chem. 1996, 17, 490; MMFF94s: T. A. Halgren, J. Comput. Chem. 1999, 20, 720.
- CDX tag numbers and enumerations: the CDX property table of ReShiki (`crates/io/src/exchange/schema.rs`, `decode.rs`, `values.rs`, and `reference/engine/cdx_schema.py`, commit 50453022fb59f8f79b03996f2d4e5cb24f68654e; MIT / Apache-2.0, see above). ReShiki generated it from the published CDX format documentation (CambridgeSoft CDX SDK, “Table of Properties”, which describes the format as being in the public domain; archived at https://iupac.github.io/IUPAC-FAIRSpec/cdx_sdk/TableOfProperties.htm). All 269 codes also appear in `CDXConstants.h` of Revvity's open-source ChemDraw file format library (BSD-3-Clause, © 1986–2025 CambridgeSoft Corp, Revvity Inc and others; https://github.com/Glysade/chemdraw, commit 5dd743230d75ecacacdf8dcd0b0e022f13173b9c), the stoichiometry grid of ChemDraw (objects 0x8022–0x8024, properties 0x1200–0x1208, also in that library's `CDXML.dtd`) included; 266 of the 269 data types agree, the other three are ReShiki's corrections (0x0013, 0x0308, 0x0A39). Only these numbers and names were taken: no code of ReShiki's CDXML reader, nor of the RDKit or Glysade ChemDraw readers it adapts (BSD-3-Clause, © Revvity Inc, CambridgeSoft Corp and others), is used here.
- Ideas from penzene (James O'Brien, GPL-3.0-or-later, https://github.com/JamesOBrien2/penzene): structure checks, stereo groups (abs, &, or), partial charges δ+/δ−, automatic renumbering of compound numbers when the scheme changes, and the command line (the list of structure checks: overlapping atoms, atoms on bonds, stray atoms, wedges not at stereocentres). Only the ideas were taken, no code: these features are Reactio Draw's own code, and the stereocentres are found with OpenChemLib.
- Journal style values follow the publishers' guidelines for authors (ACS, RSC, Nature, Angewandte; Synthesis / Synlett: the font size from Thieme's instructions); the other values are as ReShiki records them.
- Interface polish follows advice from two design guides, no code taken: Impeccable (Paul Bakaus, Apache-2.0, https://github.com/pbakaus/impeccable) and Taste Skill (Leonxlnx, MIT, https://github.com/Leonxlnx/taste-skill).
- Interface font: the fonts installed on the computer; nothing is downloaded.
- Jmol element colors (via ReShiki): https://jmol.sourceforge.net/jscolors/
- Open Reaction Database schema (for the ORD export format): https://github.com/open-reaction-database/ord-schema (Apache-2.0), format followed, no code copied.
- Office file formats: Microsoft Open Specifications (MS-EMF, MS-CFB, MS-OVBA, MS-CUSTOMUI, OOXML).
