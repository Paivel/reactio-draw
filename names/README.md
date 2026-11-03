# Names: OPSIN in JavaScript and the name tables of Octet Draw

These files let Reactio Draw read chemical names everywhere, the browser included, with no Java: systematic names
(OPSIN), common and trade names, CAS numbers and InChIKeys. They come unchanged from Octet Draw by Sam Ellis
(https://github.com/SamChemMan/Octet-Draw, Apache License 2.0, © 2026 Sam Ellis), commit
1296e6b3bf81eecfc6bd3e36956f88ef9198485b of 2 November 2026:

| File | From Octet Draw | What it is | Licence |
| --- | --- | --- | --- |
| `opsin.js`, `opsin-data.bin` | `src/vendor/opsin/` | OPSIN 2.8.0 (Daniel Lowe) compiled to JavaScript with TeaVM 0.16.0, and OPSIN's resources in one file; Octet Draw's build is in its `tools/opsin` | OPSIN: MIT; TeaVM and StAX API: Apache-2.0; dk.brics.automaton: BSD-3-Clause; Unicode data: Unicode-3.0; Octet Draw's own classes: Apache-2.0. All notices: `OPSIN-js-NOTICES.txt` |
| `dictionary.tsv.gz` | `data/names/` | 28,880 compounds with their common, trivial, German and trade names, CAS numbers and InChIKeys, from Wikidata | Wikidata: CC0 1.0 (`Wikidata-NOTICE.txt`); the selection: Apache-2.0 |
| `octet-names.json` | `src/common.ts` (`COMMON`) and `src/drugs.ts` (`DRUGS`), written out as JSON | abbreviations and names of solvents, reagents and ligands (each to the systematic name OPSIN reads, a SMILES, or another entry), and drugs and natural products as SMILES | Apache-2.0 |

Nothing in these files comes from a paid program: OPSIN and TeaVM are open source, the
dictionary is Wikidata's, and the tables are Octet Draw's own (each structure checked against PubChem's InChIKey).

`octet-namer.js` is Octet Draw's structure → name module (`src/namer.ts`, its namer of coordination compounds `src/complexes.ts`, and the files they import, same commit, Apache-2.0), made by `tools/bundle_octet.cjs`: TypeScript takes out the types and comments, the code is unchanged. It is the Alternative name button beside Name it, and runs in the page. A complex is named by additive nomenclature (κ, μ, η, Δ/Λ, cis/trans, fac/mer…) and given only when every part of the name checks out against the drawing (complexes.ts: ligands read back by OPSIN, donor atoms, metal and charge, compared by InChI).

`octet-condensed.js` is Octet Draw's reader of condensed formulas (`src/condensed.ts` and `src/labels.ts`, same commit, Apache-2.0), made the same way. CH3CH2OH, PhCH2OH, Me3SiCl, (CH3)3COH or CH3COOEt typed as a name, or written as a text and turned into a structure, is read as the structure it stands for; a molecular formula (C2H6O) is not, as it has more than one.

How Reactio Draw uses them: `tools/make_names_pack.py` puts the four files into one gzipped pack inside the page
(`<script id="namesPack">`); the web version keeps the pack in a file of its own, downloaded on the first name
after asking. A name is read in this order: Reactio Draw's own list of about 600 names; Octet Draw's tables; the
dictionary's names marked to be read before OPSIN; OPSIN; the rest of the dictionary (names, CAS numbers,
InChIKeys); in the apps, the OPSIN Java program as before.

`depictions.txt`: drawings of 83 natural products and drugs (strychnine, paclitaxel, morphine, quinine, artemisinin, the
steroids, the opioids, penicillins, statins and others from the tables) as ChEBI (EMBL-EBI, CC BY 4.0) draws them: per
line the OpenChemLib idcode of the structure (and of the drawing, where it reads a tautomer or a bridgehead N
differently), the ChEBI number, the atoms (element, x and y × 100, charge), the bonds (atoms, order, MDL stereo) and the
charge lines. Each was taken from the entry found by the InChIKey of the table's structure, and its InChIKey (stereo
included) was checked to be that one. A structure added from a name or a SMILES that is one of them takes the drawing's
places, wedges and drawn H; the configuration is checked again when it is used. Adamantanes (amantadine, memantine)
keep Reactio Draw's own drawing.
