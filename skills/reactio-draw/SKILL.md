---
name: reactio-draw
description: Draw chemical structures, reactions and schemes, and get chemical data (formula, mass, m/z, elemental analysis, isotope pattern, cLogP, TPSA, R/S, E/Z, NMR prediction, IUPAC name, SMILES from a name), with Reactio Draw. Use for any request to draw a molecule or reaction, copy a scheme from a picture, make a structure picture for a document, or give a compound's numbers. Never draw molecules or compute these numbers any other way.
---

# Reactio Draw

## The rule

Structures and chemical numbers come only from Reactio Draw: drawings, pictures, formulas, masses, m/z, elemental
analysis, NMR shifts, names, SMILES from names, R/S, E/Z.
- Do not draw molecules yourself (SVG, matplotlib, an RDKit or other script, ASCII art).
- Do not give numbers from memory or compute them by hand or with other libraries.
- If the Reactio tools are missing or fail, say that Reactio Draw is not available and stop. Do not fall back.
- An NMR prediction is a prediction: say so, name the source (nmrshiftdb2), give each shift with the typical error
  Reactio answers. Reactio gives no multiplicity or coupling: do not invent them; an assignment (CH3, COOH) only from
  Reactio's H counts, and say it is yours.
- Names go to Reactio in English (OPSIN reads no Cyrillic): translate a Russian name to its English IUPAC or common
  name, and check the formula you get against what the user meant.
- Report numbers as Reactio answered them (Mol. Wt. g/mol, masses and m/z in Da, EA in %); pad trailing zeros only
  (8.8 → 8.80), never round. EA is "calcd".

## Tools (MCP `mcp__reactio-draw__*`), one call at a time

Never call them in parallel: one at a time; a long one answers "still working" (ask {"op": "result"}).
- **Numbers, no drawing**:
  - analyze_structure (a SMILES): formula, masses, [M+H]+, EA, isotopes, cLogP, TPSA, HBD/HBA, stereocentres with R/S
    and E/Z;
  - calculate, predict_nmr, name_structure.
- **Pictures for documents, the sheet untouched**: render_structure, render_reaction, render_grid ({"path"} writes the
  file). Look at the picture before giving it.
- **On the open sheet** (the user sees it and can undo):
  - draw_name, draw_smiles, draw_reaction, get_properties, list_structures, view_drawing ({"region"} or {"ids"} for
    details), export_drawing, undo;
  - reactio_command for the rest: help {"op": "<command>"} gives the arguments (unknown ones are errors).
  - When the sheet holds the user's work, draw in a new tab: reactio_command newDocument.
- If MCP stops answering, say so and ask the user to untick and tick Info → MCP (that writes the app's address again);
  do not retry in a loop. (Builds before 28 Oct 2026: the `reactio` command line took that address over; avoid it there
  while MCP is in use.)

## Copying a scheme from a picture

Read help {"op": "guide"} once and `references/drawing.md` (beside this file) before the first drawing call.
1. place_reference {"path": "<file>"} without bond. It reads files you cannot (e.g. ~/Downloads on a Mac). PNG, JPEG,
   WebP and GIF go as they are; HEIC and TIFF are converted by the MCP server.
2. findStructures → structure boxes, lines, arrows, fills. On a low-res bold figure the structures come as "photos"
   (use their boxes) and grey round "fills" are halos of text (ignore them). recognizeText → text lines with box,
   baseline and size; re-type the words.
3. Write the inventory (structures, arrows, "+", text lines, graphics) and the SMILES of every structure yourself.
4. Structures that are not plain flat rings and chains (perspective cages, metal complexes, crowded catalysts):
   recognizeStructures {"boxes", "smiles": [yours, one per box], "minConfidence": 0}. The model gives the places, your
   SMILES the chemistry; read its "warnings" and where they differ.
5. ONE addScheme with "units": "figure" for the fitted structures, texts, arrows and shapes; the recognized structures
   in a separate addScheme, then fitToReference on them.
6. **Make every structure even** (below), then ONE look with the figure (each structure, view_drawing {"region"}),
   fixes in one batch, delete the figure, one look without it.
7. Final checklist (guide, step 6) and say plainly what could not be reproduced.

## Even structures beat a close match

The figure gives each structure's place, orientation and layout; the geometry is always standard: regular rings, equal
bonds, 120° angles. A fit or the model's coords can leave a ring skewed, a chain bent or a label on a bond.
- After drawing, clean {"ids": [all structures], "keepOrientation": true}. Where that changes too much (metal
  complexes: M–Cl pulled short), clean {"index", "rings": true} only.
- Then look for: rings not regular, bonds of unequal length, a label touching another label or a bond (Ph–N, N–N,
  3u over a methyl), a compound label over a bond. Fix them before the final look.

## Arrows and texts never touch a structure

- A scheme drawn without a picture: place structures first, read their boxes (objects {"type": "structure",
  "fields": ["id", "box"]}, labels included), then put each arrow from the left box's x1 + 20 to the right box's x0 − 20
  (half a bond clear of every label: HO, OH, Br). Or let Reactio do it: clean {"what": "reaction"} lines up reactants,
  arrow, products and texts, and grows the arrow to its texts.
- Texts over and under an arrow stay inside its length; widen the gap between structures rather than shorten the arrow.
- **The same gap above and below the arrow** (≈ 10 units of clear space each side). At text size 22: the last line
  above has its baseline at arrow y − 18, the first line below at arrow y + 28 (a baseline sits under the letters,
  so the numbers differ); lines 27 apart; all centred on the arrow's middle ("align": "center"). Other sizes: scale
  these numbers by size / 22. Check it on the look: the two gaps must look equal.
- Before the final look: check {"layout": true} lists overlapping boxes. Fix every arrow, text or label that touches a
  structure.

## Coloured balls (R groups, "R or H")

- A ball on a structure is a carbon with marks [{"atom", "color", "diameter", "opacity": 1, "outline": false}] in
  the structure itself. Always opacity 1: the default is see-through (0.38) and shows as a faint ghost ball. Never draw
  a ball as a shape or a second mark on the same atom.
- The same diameter for every ball of the figure (≈ 0.6 bond, 24 units), colours from the figure; give them in the
  fit (they are matched) and "pin" the balled atoms if the fit swaps them.
- After drawing, check: one ball per balled atom, each at the bond's end and not over a neighbour, none left over
  (objects or view_drawing). Two balls on a short branch overlap: the branch bond must be a full bond.
- A legend ("● ● ● = R or H") is shapes: {"type": "circle", "box", "fill", "shade": true} for shaded balls, the text
  beside them.

## Mechanism figures: orbitals, lone pairs, tethers, curved arrows

- **Style first**: setStyle {"atomColors": false, "fontPerBond", "linePerBond"} before addScheme, and draw labelled
  structures in sheet units (coords = figure px × the figure's scale): units "figure" fixes the label size from the
  figure. After calibration setStyle {"fromReference": id} measures fontPerBond and linePerBond on the figure and
  answers them in "measured" with what they were measured on (check them: by hand fontPerBond = the figure's N height /
  its bond ÷ 0.72; linePerBond = line width / bond; the width is measured across straight bond lines). Each stereo bond
  must show ≥ 10 units (check flags "shortStereo"; hashSpacing, labelGap if not).
- **Orbitals**: "orbitals" [{atom, type: lobe|p|sp3|s|dxy|dz2, filled, angle (clockwise from right), size}] in the
  structure, or addOrbital. On a labelled atom the lobes start just off the letter (the charge is not counted; setStyle
  "orbitalGap"; "offset" in bonds to set it by hand, ≈ 0.22 at fontPerBond 0.56). Separate "lobe"s, size 1.
  setOrbital changes size, angle, offset in place, one orbital, "ids" or all on an atom ({"index", "atom"}); tied arrows
  follow. objects {"type": "orb"} gives angle, offset, centre, tip and the lobe's own box.
- **A pair of electrons inside a lobe** is a free symbol on the layer: "symbols" [{"type": "lonePair", "orbital":
  <id> | "tag.n" (from 1) | {"structure": tag, "atom": n, "angle": 0}, "along": 0.67}] or addSymbol; setSymbol moves
  it to another lobe or frees it. Check with objects {"type": "symbol", "fields": ["id", "orbital"]}. The atom gets no
  lonePairs.
- **Charges and symbols on an atom**: setAtom {"chargePos": "upper-right" | "left" | … | degrees, "chargeStyle":
  "plain" | "circled" | "hidden", "partialPos", "radicalPos", "lonePairAngles"}, also in addScheme "atoms". By
  default a charge keeps off bonds, labels and lobes, upper right when free; set chargePos as in the figure when it
  differs (atoms shows where each symbol stands). A free charge: addSymbol {"type": "charge", "text": "+", "at"}.
  Free symbols move with setSymbol {at, angle, orbital}.
- **Lone pairs, radicals, H**: "atoms" {n: {lonePairs, radical, hydrogens, partial, attachment, bold}} or setAtom. An N
  on a tether arc gets {"hydrogens": 0}; a nitrenium N+ {"hydrogens": 0, "radical": 0}. Bold labels: "boldLabels".
- **An arc of delocalized charge** (under N–N–N, an allyl, a carboxylate): addShape {"type": "delocalization",
  "structure": id, "atoms": [first, …, last], "side": "below" | "above" | "auto", "charge": "+"}: with three atoms or
  more a small arc bowing toward the middle atom (∩ under a bent N–N–N), its ends beside the end letters, clear of
  every atom, its sign just under it; the atoms' own signs hidden (they still count); it follows the atoms. A plain arc:
  "bow": "up" | "down" | "left" | "right" (the sign of "bulge" depends on from → to; bow does not), ends at atoms
  {"structure", "atom", "at": "bottom"} start at the letter's edge; "fit": true reads the bulge from the figure (no
  guessing 0.45 → 0.75 → 0.55). Check which way it bows on the first look.
- **A dashed arc between two atoms** ("the rest of the ring") is not a ring: open chain, ends {"hydrogens": 0}, the arc
  as shapes arc {"from": {"structure": tag, "atom": n}, "to": {…}, "bulge", "dash": true} (it follows the atoms and is
  no overlap in check), or a smooth dashed polyline through the dash centres. Never close it into a ring.
- **Curved arrows**: addArrow {from: [x, y] | {index, atom} | {index, bond} | {orbital: id, …}, to: {orbital: id,
  lobe: 1 | 2 | "filled" | "empty", at: "tip" | "side" | "middle", side}, bend: 0.25, side: "left" | "right" (seen
  along the arrow)}, after the orbitals. A figure's arrow usually enters a lobe's side: at: "side" (tied to it). From
  a text: {"text": id, "at": "upper-left" | …} (tied to it). objects gives each arrow's from, to, curve, side, head.
- **Bond styles on a bold, low-res figure**: a thin plain bond half hidden by the labels looks like a dash or a hash.
  Crop each wedge and hash at ×5 and write down which atom its narrow end touches: wedge/hash [[n1, n2]] is narrow at
  n1. Check it again on the look.
- findStructures gives "atomLabels" (box, ink colour, text with confidence and a close "or"; lobes, wedges and brackets
  are left out), per structure "vertices" (where bonds meet: the unlabelled atoms), "arrows" (any slope; curved with
  bend and side), "dashedLines" / "dashedArcs", and "orbitals" (also lobes touching their letters). recognizeText
  {"letters": true} splits lines into letters, a sign (+, −) apart ("sign": true), strokes and lobes left out, "or"
  on doubtful ones; findStructures leaves out lobes and arrows inside text, braces and letter corners. Check readings on a ×4
  crop where they matter. Take atom centres from the letter boxes and, for
  the rest, from ×4 crops; bond = median distance between bonded labels, then place_reference {"bond", "replace":
  true}. recognizeStructures on a figure with orbitals reads poorly; if it rescales the figure its answer says so
  ("rescaled": lay it again with its bond).
- check {"layout": true} measures arrows and lines by their own line (a slanted arrow's box no longer counts); other
  objects by their boxes.
- **Rings in perspective** (a mechanism's five-membered ring with long N–N sides): coords as measured, and "tidyRings":
  "keepShape" if at all (atoms with letters stay put, bare carbons move, each at most maxMove; the answer lists
  moves). Ring C atoms have no label: read them from a crop.
- **A charge corner "⌉+"** for a whole species: addBracket {"type": "chargeCorner", "structure": id, "charge": "+"}
  (or in addScheme "brackets"): the atoms' own "+" is then not drawn and still counts. With "structure" it is short, at
  the structure's right, its shelf level with the uppermost atom there, its side a third of the structure ("arm",
  "drop" to change); "box" with "structure" takes the place
  from box and still hides the signs. Its sign goes with the corner.
- **Texts over and under an arrow**: addText or addScheme texts {"text", "arrow": id, "place": "above" | "below",
  "line", "gap"}: Reactio places them half a line off the arrow ("gap" in line heights) and they follow the arrow.
- **Roles**: list gives each structure's role by every arrow ("steps"), by each arrow's tail and head (schemes
  branching two ways or a star read right); setRole {"index", "role"} sets one by hand.

## Fixes the API now has

- A wrong label: setLabel {"index", "atom", "label", "direction": "keep" | "reverse"} (no redrawing).
- A mirror-image pair or analogue: duplicate {"index", "flip": "h", "x", "y"}.
- A ring the model left open: bondAtoms.
- An η⁶-arene or a Cp sandwich on a metal: key {"index", "atom", "key": "J"} (keys {"query": "η"} lists the keys).
- Only the rings tidied: clean {"index", "rings": true}.

## Traps that cost the most

- **Score lies.** Score 1 came with labels on the wrong vertex, bent rings and mirrored molecules. Look at each
  structure: heteroatoms, labels, NH, "+" where the figure has them.
- **Near-symmetric molecules mirror** at high score: the fit keeps the molecule (a centre laid over gets its wedge
  and hash swapped: "stereoKept"), prefers the layout whose wedges and hashes fall on the figure's, and says
  "mirrored" and "stereo" (matched / not matched): look at those. Open branches off the figure swing round their atom
  toward their lines and letters; check them anyway. "boldFromFigure" lists bonds made bold from thick lines.
- **Isotopes**: SMILES [15N], [13CH3] (Molfile, CDXML too) are drawn (¹⁵N upper left unless a bond runs there; setAtom
  {"isotopePos": "upper-right"} for N¹⁵; the number black unless "isotopeColor") and counted with their own mass.
- **Atom numbers (locants)**: atoms {n: {"number": "8", "numberColor": "#1565c0"}} (or setAtom): beside the atom, going
  with it; no separate texts. **3D balls** with a highlight: marks [{"atom", "color", "shade": true}].
- **Letter sizes**: setStyle {"fromReference": id} now gives labelFontPerBond and textFontPerBond apart (texts and
  labels are often different) and line width as the median.
- **A label or text partly coloured** (a red P in "PPh2"): \\c[#e8251f]{P}Ph2 in the alias or the text. A reagent
  with a group on a letter: addText {"text": "KPPh_{2}", "above": {"letter": 2, "text": "O", "bond": 2}}.
- **Abbreviations in usual order** (NO2, CF3, OMe, CO2Me) when the bond comes from the left or right: Reactio turns
  the label itself. On a vertical bond the label's direction follows the bond's tilt: fix it with setLabel
  {"direction"}.
- **Model errors**: balls read as O/N/CH3, atoms doubled (two Ru), an arene lost, Cl read as C. Give your SMILES and
  read the warnings.
- **Disconnected fragments** ("A.B", an arene apart from Ru) are separate objects: move or delete each one.
- **coords and fit do not mix** in one addScheme; fitToReference after coords can change the layout: check.
- **Perspective skeletons** (norbornene, cages): recognized coords, bridge bonds bold, not wedges. A flat fused
  norbornane: never fit by SMILES (template in references/drawing.md).
- **The figure moves**: calibration and recognizeStructures may rescale it; replace: true keeps old figures, use "all".
- **batch** items are {"op", "args"} (or the arguments beside "op"); its "results" holds each command's answer. Long
  calls answer "still working": ask {"op": "result"}, do not repeat.
- **setStyle** takes {"style": "journal"} ("preset" too); its fontPerBond is for what is drawn next ("existing": true
  for what is drawn, "labelsOnly": true for atom labels only): set it first.
- **check {"layout": true}** leaves out the figure under the drawing, an orbital on its own atom, a symbol in its lobe
  and a tether arc at its atoms.
- **Not possible yet**: variable attachment (–Rn across a ring), ellipse balls, rotated ellipses, "CH3O" as written,
  coloured letters in CDXML export. Draw an honest approximation and say so.

## Checked on the 29 Oct 2026 builds: what still needs a hand

- **delocalization** now bows toward the middle atom (∩ under a bent N–N–N, ends beside the end letters, sign just
  under it, clear of every atom); still look at it on the first picture.
- **fit "stereo: not matched"**: the fit now keeps the molecule (stereoKept: wedges and hashes swapped where a layout
  laid a centre over) and picks the layout whose wedges match; if a copy still says "not matched", swap that copy's
  wedge and hash with setBond. A branch may still land on the wrong side: moveAtoms it, setLabel {"direction": "keep"}.
- **findStructures** on schemes with letters is better (no lobes or arrows inside text, no braces, no letter corners
  as vertices, straight arrows with their texts) but still check each found arrow on a crop; atom centres best from
  recognizeText {"letters": true}.
- **fromReference** gives labelFontPerBond and textFontPerBond apart and the line width as a median: compare with
  "measuredOn" all the same.
- **tidyRings "keepShape"** keeps atoms with letters where they were put; bare carbons move.
- **chargeCorner** with only "structure" sits by the uppermost atom on the right; "box" still wins when given.
- **Bold bonds from a fit** are listed in its check (boldFromFigure): set them plain if the figure has none.
- **Fused polycycles with distorted rings** (azulene-fused heptalenes): build from the model's own graph
  (recognizeStructures without smiles), fix labels and drop junk fragments, then fitToReference {"box", "units":
  "figure", "templates": false} per structure. addScheme takes a recognizeStructures answer as it is (its "figure" key
  is checked and left out; a figure laid again since is warned about); its "out" file is written when the answer comes
  with {"op": "result"} and carries "savedAt". With "smiles" under 90 % matched the structure is "not read" and fitted
  from the SMILES. delete {"id", "part": true} (or {index}) for a junk fragment (delete {id} alone deletes its whole group). Ring fills:
  "ringFills": "fromReference" in addScheme, or ring {"atoms"} in any order. A later whole-molecule fitToReference may
  undo a flipBond you made: fit first, flip last.
- **Texts tied to an arrow** keep half a line off it; "gap" (in line heights) to match the figure.
- **batch** writes picture and export to "path" as alone; place_reference answers the picture's source and size, and
  warns when the clipboard holds the same picture as last time.
- **Rings uneven after a fit** (places read off a figure): fitToReference and addScheme now say "bondSpread" and warn
  over 10 %; give "tidy": true (or clean {"keepOrientation": true}) and look again. clean {"rings": true} lays a fused
  system out whole and keeps chains as drawn; {"keepBox": true} keeps the old size; clean answers new overlaps.
- **A ring system the wrong way round** (one half of a spirobifluorene): flipPart {"index", "atom": <spiro or
  attachment atom>, "part": <its neighbour in the part>} mirrors it over its own axis, the molecule kept.
- recognizeStructures makes one atom read twice close together into one, and says at once when it rescaled the
  figure; place_reference {"replace": true} keeps pictures cut from earlier figures; atoms answers "number".
- **A long ring bond** (O–I of a Togni reagent, 1.75 bonds): stretch {"index", "bond": [O, I], "factor": 1.75} rebuilds
  the ring symmetric (90° at O and I, CF3 straight on from O–I, as Togni II is drawn) and keeps the fused benzene; do not drag atoms. A short bond between two labels that shows too little
  line: setStyle {"labelGap": 0.08, "existing": true}.
- **marks with a colour are solid** now (black dots: {"color": "#000000", "diameter": 10}); "opacity" to make them pale.
- **index or id**: give "id" (an atom id from addScheme or objects) when you mean an id; a bare number is an index
  when such a structure exists.
- A skeleton with different labels at its ends (H2N…CF3) is laid with each label on its own letters; still check it.

