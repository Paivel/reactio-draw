# Drawing with Reactio Draw: what worked

Lessons from real runs (Diels–Alder schemes, β-santalol, HTE screen of 30 structures, cubane synthesis, triazene and
triazinane scopes of 40 structures, Noyori Ru complexes, DA + IDPi catalyst, nitrenium → triazane with orbitals), Reactio Draw 1.6. Read with
help {"op": "guide"}; this file adds what the guide does not say.

## 1. Order of work

### With a picture

1. The picture must be a file (path or clipboard); a picture only in the chat cannot be placed. Ask for the file.
2. place_reference {"path", "x": 0, "y": 0} without bond. If calibration answers "the figure's bond could not be found"
   or "bondGuessed", give bond: the median bond length from recognizeStructures, or findStructures' "bond".
3. findStructures {"ref"}: structure boxes, lines, arrows, fills. recognizeText {"ref"}: text lines.
4. recognizeStructures {"ref", "boxes"} for every structure that is not a plain flat ring system (perspective, cages,
   long chains, metal complexes, crowded catalysts), with "smiles": [your SMILES per box] and minConfidence 0: the
   model gives the places, your SMILES the chemistry. Read the "warnings" (missed bond, Cl read as C, ball read as O)
   and where model and SMILES differ.
5. Inventory: structures with labels; arrows (straight, bent, headless); "+", "or"; every text line with its style;
   graphics (frames, fills, braces, balls, coloured bonds, dashed lines, photos, icons). Keep it to the end.
6. addScheme with units "figure": fitted structures, texts, arrows, shapes. Recognized structures in their own
   addScheme, then fitToReference {"ref", "ids"} on them (without it they came ~15 % larger and shifted).
6a. Make them even: clean {"ids", "keepOrientation": true} (metal complexes: {"rings": true} only). The user prefers
   regular rings and equal bonds to a pixel match.
7. Look at each structure over the figure (view_drawing {"ids"} or {"region"}, scale 2). Score is no proof.
8. Fixes in one batch: flipBond, fitToReference {"layout": k} (numbers from the last answer only), pin, rotate, flip.
9. Delete the figure, one view_drawing without it, final checklist (section 6).

### Without a picture (from knowledge or a name)

1. Chemistry first: a SMILES for each compound from draw_name / reactio smiles (or written by you and checked with
   calculate); check key steps (the rearrangement gives the right isomer).
2. Layout in rows, left to right; on a wrap a down arrow and the next row right to left.
3. One addScheme (structures by "at", arrows, texts), one view_drawing, fixes in one batch.

### Several figures on one sheet, or a new figure

- Prefer a new tab: newDocument (documents lists them); the earlier work stays.
- On one sheet: addScheme {"replace": "all"} first (removes old figures; replace: true keeps them and calibration may
  take a wrong one), then place_reference per figure with its own y (gap ≥ 100), then one addScheme per figure with
  its "reference" and no replace.
- Calibration may rescale a figure (0.74, 0.588): fine, the bond is ~40 everywhere. recognizeStructures may rescale it
  too, silently: read objects before drawing more.
- If the figure was moved (the user spread figures to compare), new units "figure" structures land on the figure, not by
  the drawing: move them by the figure's shift afterwards.

## 2. Writing the chemistry

- Abbreviations (MeO, CF3, NO2, B(OH)2, Ph, Bpin, CO2Me, Ts, tBu): atom labels, [*:n] + "alias", in their usual order
  when the bond is horizontal; with a vertical bond as the figure writes it (ArSO2 over N; the bond then meets the
  first letter). OCH3 draws H3CO.
- A wrong label after drawing: setLabel {"index", "atom", "label", "direction": "keep" | "reverse"}; on a near-vertical
  bond the label's direction follows the bond's tilt (SO2Ar came out ArO2S): fix it with direction.
- Generic groups ([B], R, X, Ar, LG): atoms with a label bonded to the skeleton. Never free text over the drawing.
- Ring "Het"/"Ar": Kekulé benzene + "rings": [{"atom", "label": "Het", "style": "kekule", "fill": "#808080",
  "fillOpacity": 0.28}]. A grey area inside the ring is a fill, not "inner".
- Coloured ball "R or H": C with marks [{"atom", "color", "diameter", "opacity": 1, "outline": false}]; several balls on
  one fragment: pin them. Ring-only ball: "fill": false. opacity 1 always (the default 0.38 shows a ghost ball), one
  mark per atom, one diameter for all balls of the figure. A legend of shaded balls: shapes circle with "shade": true.
- Oval balls (aryl groups shown as ellipses) cannot be drawn: use round marks and say so.
- Coloured bond: bonds.color, not highlight. Band along a chain: highlight {"bonds": true}, width ≈ 0.4 bond.
- Coloured labels and structures: "color" (whole structure), "atomColors" {"#c00000": [n…]} (some labels); journal
  schemes: style {"atomColors": false}.
- Carbanion C with ⊖: "showCarbons": [n]. NH in a ring drawn "HN" in one line: "hSide".
- Wedge or bold: look whether the width changes along the bond. Narrowing to one end → wedge (narrow end n1, wide n2).
  Same width all along → bold. Hashes narrowing to an atom → hash. Perspective bicycle bridges → bold; a flat
  norbornane with the bridge inside → wedges towards C7.
- Draw what the figure shows, not what is "right": a missing methyl stays missing; tell the user.
- Explicit [H] at ring fusions spoils SMILES fits (score 0.6, H inside rings); with coords they are fine.
- Near-symmetric molecules (Ar–N=N–NH–Ar, triazolinium with two Ar, 1a dienes, IDPi): the fit gives score 1 mirrored.
  Check where H, "+", the double bond and NH sit; fix with flip {"axis": "h"} or layout. A layout from alternatives
  mirrored IDPi (NH on the wrong side): compare before keeping it.
- Mirror pair ((S,S)/(R,R) complexes): duplicate {"index", "flip": "h", "x", "y"} of the good one (wedges go with it:
  the enantiomer), then fitToReference. No coordinate arithmetic.
- Cubane and cages: Reactio lays them in 3D itself; check that no bond runs through a vertex.
- Metal complexes: η⁶-arene or Cp sandwich on the metal with key {"index", "atom": <metal>, "key": "J"} (η⁶-benzene)
  or keys ["j", "j"] (Cp sandwich); keys {"query": "η"} lists them. Then move the ring to the figure's place and check.
  Variable attachment ("–Rn" across a ring) is not possible: a short shapes line from a ring bond's middle outwards
  plus text R_{\i{n}}; say so. Full clean of a complex pulls M–Cl short: clean {"rings": true}, or put Cl back with
  moveAtoms (40 units, 30°).

- Mechanism figures (nitrenium → triazane, 2026-10-29): a dashed arc between two N is a tether, not a ring (the user
  corrected a ring). Open chain + hidden C on a dash bond at each arc end + dashed polyline through the dash centres.
  Thin plain R–N and N–N bonds looked like hashes at figure size: crop ×3 before choosing styles. Orbitals: ellipse
  and circle shapes as a stand-in at first; after the update real orbitals (lobe, size 1.5), atoms {hydrogens: 0},
  boldLabels, a curved arrow to {orbital: id} with bend 0.2, a smooth dashed polyline: 1 addScheme + 2 fixes.
  Pavel's review: empty + filled lobes are one p (filled: true); the lone pair is two circle shapes inside the lobe,
  not ':' by the letter; the N⁺–N wedge is narrow at N⁺ (I had it backwards): crop every wedge ×5 first.
  Pavel's own copy: three separate lobes of size 1, each from the edge of the N⁺ letter (shifted ≈ half a letter),
  the pair of electrons free on the layer inside the right lobe.
  Short hash = wedge look: units-figure labels were 18 % too wide and deaf to fontPerBond; redrawn in sheet units
  with fontPerBond 0.56 the bonds came long enough to read.
  After the next update (v6): style first, sheet units, three lobes with offset 0.22, free lonePair symbols in the
  lobes, arrow to {orbital}: 1 addScheme + 1 batch. Left: the "+" moved to the lower right.
  Fresh run (v8, as a first-timer): 21 calls; atom places from letter boxes + ×4 crops (no tool gave them), bond 93 px,
  fontPerBond 0.58, texts by line width (≈ 20 units), one addScheme from a file; "+" went upper left.

- Triazolium scheme (two ways from one N⁺, 2026-10-29): webp laid as it is; setStyle fromReference measured
  fontPerBond 0.534 (by hand 0.53); perspective rings with coords, no tidyRings; texts tied to arrows; curved arrow
  from the B⁻ text to the top lobe's side; a short charge corner from "box" + chargeVisible false on the N⁺.

- Scheme 3 (naphthotriazinium 5 and five products, 2026-10-29): [15N] refused ("isotope labels not supported") →
  plain N + text "15"; fit mirrored 4 of 5 symmetric products (wedge and hash swapped) at the same score — found by
  atoms; substituents on the centre N moved by hand; star scheme roles all set by hand; red P in labels not possible.

## 2a. Skeleton templates

Built in (listTemplates): norbornane, norbornane-perspective, chair, adamantane, bco, b321, b331, cubane,
homoadamantane; the fit tries them itself.

Own template when neither works:
1. Place the structure by standard geometry: "smiles" with [*:n] + "alias" + "coords" {n: [x, y]} + bond styles (molfile
   input loses labels).
2. fitToReference {"ids"}: it keeps the current layout and only moves and turns it.
3. saveTemplate {"index", "name", "atoms": [skeleton atoms]}: its bold bonds, wedges and hashes are kept.

Flat norbornane fused at C2–C3 (exo) with a five-membered ring on top (never fit: true by SMILES; Reactio lays it in
3D, MolScribe cannot read it). SMILES `[*:1][N+]1=NN([*:2])C2([H])C1([H])C1CCC2C1`, coords in bond units (y up),
then x = cx + 40·X, y = cy − 40·Y:

| atom | 1 Ar | 2 N⁺ | 3 N | 4 N | 5 Ar | 6 C3 | 7 H | 8 C2 | 9 H | 10 C1 | 11 C6 | 12 C5 | 13 C4 | 14 C7 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| X | −1.76 | −0.809 | 0 | 0.809 | 1.76 | 0.5 | 1.45 | −0.5 | −1.45 | −1 | −0.5 | 0.5 | 1 | 0 |
| Y | 1.26 | 0.951 | 1.539 | 0.951 | 1.26 | 0 | 0.05 | 0 | 0.05 | −0.866 | −1.732 | −1.732 | −0.866 | −1.2 |

Bonds: hash 6–7, 8–9; wedge 10→14, 13→14. A six-membered ring on top: a hexagon on the edge C2–C3, same norbornane.

## 3. recognizeStructures (MolScribe) — check every answer

Good at: perspective norbornenes, endo/exo adducts, long chains, Ru complexes, crowded catalysts (IDPi), whole scopes
(36 of 40 fitted at score 1 after coords).
Its errors, each seen in real runs:
- coloured balls read as O, N, CH3 or Cl (in a ring: O between two N) → C + mark;
- background of frames and halos round coloured text taken as balls up to 379 px → delete those marks;
- "C@@H", "C@" kept as atom labels → plain C with the wedge from bonds;
- Cl dropped, Ar read as C or R, H labels as methyls;
- a ring left open: two unbonded atoms closer than a bond (atoms "lost" in the picture);
- wedge where the figure has a bold bond of constant width (bicycle bridgeheads) → bold;
- alkyne or aryl fragments of a neighbour inside the box; tiny stray fragments → drop them;
- two neighbouring structures merged into one (two Ru) → narrower box;
- no bold bonds, no "Het", no bands.
Compare its SMILES with yours atom by atom; when you know the chemistry, give "smiles". Under 90 % of its atoms
matched ("minMatched") the answer is "not read" and the SMILES is fitted instead: do not force the places then.
Mac and Windows both run it (MolScribe in .reactio-ocsr; the model in .reactio-ocsr/molscribe.pth or models/). On
mechanisms it takes orbitals and electron pairs for atoms: a high confidence proves nothing.
Class rules help on a scope: write them once (ball read as O/N → C; C bonded to Ar → N; CH2 between two N → ball) and
apply them to every answer before addScheme.

## 4. Typography

- Condition texts 22 (sheet units, ACS); when copying a figure, size by the width of the longest line over the figure
  (recognizeText reads sizes 6–12 % small). Sizes differ within one figure: measure each group.
- setStyle {"fontPerBond"} before addScheme only (it also resizes texts already drawn); later setText {"ids", "size",
  "keepCentre": true}.
- Over an arrow: baseline of the last line = arrow y − 18; under it: first baseline = arrow y + 28; line step ≈ 27.
- Arrow length = longest text + 15 each side; move structures apart rather than squeeze text.
- Compound labels centred under the structure, baseline ≈ 30 below the lowest atom, one line per row, clear of atom
  labels.
- Down arrow: texts to the right, left aligned, x = arrow + 20.
- Unstable intermediate: brackets "[]".
- Bent arrow under a circle or a box: two segments in points, the upper with head "none", the gap at the edge.
- Bold type of a figure: texts \b{}; atom labels cannot be bold. "CH3O" is written "H3CO". "ᵗBu": tBu. Say so.
- Tables, frames, section lines, circles with text: shapes (rect, polyline with dash, circle; "z" above arrows),
  white text inside dark circles. findStructures does not find dashed lines: place them from the text rows.

## 5. API traps

- Score once gave 1 to bent rings, swapped labels (C=O ↔ OMe) and mirrored molecules. Look.
- fitToReference without box can beat one with a rough box.
- fitToReference after coords may change the layout (Cl moved down): check it; keep the coords result if worse.
- coords and fit structures in one addScheme bent the coords one; units "figure" inside batch put a structure at x < 0:
  call addScheme on its own.
- clean ignores the selection and re-lays the structure; use {"index", "keepOrientation": true}.
- undo may undo the user's own edit: read "undone", redo if it was not yours.
- texts: "at" is the baseline start; move takes the box centre; a structure's "at" is the centre of its atoms without
  labels and balls. shapes line: from/to.
- A long addScheme may time out and still finish: check objects / compareReference before running it again; or
  reactio_command {"op": "result"}.
- batch items are {"op", "args"}; without args: "Give index or id".
- setStyle takes {"style": "journal", "atomColors": false, "fontPerBond"}; it rejects the guide's {"preset": …}.
- findStructures: fragments one molecule (take the union of its pieces), merges blocks joined by frames or lines,
  sends low-res bold figures to "photos". Big figures answer ~60 000 characters: ask only the fields you need.
- recognizeText: "CI" for Cl, lost subscripts, Cyrillic letters, "n°" for η⁶, glued pieces ("NN-Ar") that are atom
  labels, not texts. Re-type.
- A coloured band over a structure may defeat every layout: say so rather than try them all.

## 6. Saving calls

One addScheme per figure (per 15–20 structures on a scope), fixes in one batch, objects with type/fields/ids, two
looks (with and without the figure). On a big sheet look by region, a third at a time.

## 7. Final checklist

- Counts match the inventory: structures, arrows, "+", text lines, graphics.
- Each structure checked by eye: even geometry, orientation, labels in place, no bond through an atom.
- No free text instead of a substituent; abbreviations, rings, double, bold and wedged bonds as in the figure.
- Text–arrow gaps equal, arrows longer than texts, nothing overlaps.
- Figure deleted.
- Tell the user what matched, what did not and why.

Timing seen: a simple scheme ~5 calls; HTE (30 structures) 27 of 30 right from the first call; a 40-structure scope
~40 minutes; the DA + IDPi scheme ~12 calls.
