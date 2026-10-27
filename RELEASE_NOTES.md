# Reactio Draw 1.5.1-xyz (test build)

## New

- XYZ files (issue #1, asked for by Onelightayear): Open and drag-and-drop take .xyz files. Each frame comes in its own 3D geometry, drawn ball and stick; bonds come from the distances (within 1.2 × the sum of the covalent radii, a hydrogen bonded only to its nearest atom), bond orders and charges from the valences, as for a CIF, so check them. A file with more than ten frames (an optimisation, a scan) opens its last frame.
- Save as XYZ: every structure on the sheet as one frame, in Å, with all its hydrogens; a structure drawn flat gets its 3D shape first (OpenChemLib, MMFF94s+). The local API exports and imports `xyz` too.

# Reactio Draw 1.5.1

## Changed

- Rings across a biaryl bond (BINOL phosphoric acids, BINOL acetonides and dioxepins, biphenyl phosphates, dibenzoxepines): the second aryl is drawn as the mirror image of the first, both upright, and the bridge between them (the O–P–O) takes up the strain, as these are usually drawn. The structure stands with its mirror line upright or level. Before, the ring was a regular heptagon and one naphthalene leaned.
- Carbazole, fluorene, fluorenone, dibenzofuran and other fused rings whose benzene rings cannot both stand upright: the tilt is shared between them, so the drawing comes out symmetric (carbazole with its NH at the top).

## Fixed

- A CDX or CDXML scheme with several steps and a stoichiometry grid for each: a grid could go to the wrong step, the product of a step with a short arrow was left out (no Products block), and with the limiting reagent above 1 equiv every amount came out too high.
- Clean Up turned a phosphoric acid by up to 45° because the labels of P and its O touched at a corner.

# Reactio Draw 1.5

## What changed since 1.4

- 3D styles: a new button at the end of the Colors group, and the same menu on a right-click on a structure: Lines (as drawn), Ball and stick, Tubes or Spheres. The look follows xyzrender by Alister S. Goodfellow (MIT): shaded balls with a black outline, double bonds as two lines, an aromatic ring as one solid and one dashed line, η5 and η6 rings with a dot at the centre and a dashed bond to the metal, spheres that cut into each other, fading with depth. Hydrogens on N, O and S and at stereocentres are drawn. A flat structure gets its 3D shape turned to fit the drawing, so only its look changes. The same menu switches the depth fade and adds an atom color legend beside the structure.
- Crystal structures (CIF), a test version: Open and drag-and-drop take .cif files. Every data block comes in its measured 3D geometry, drawn ball and stick, with the molecules of a salt or solvate grouped as they sit in the crystal. Bond orders and charges (N+, B−, PF6−, the charge of a metal that balances its ions) are worked out from the hydrogens in the file and the usual valences, so check them. A crystal structure keeps its measured shape: moving, turning and flipping move it as a whole, and Clean Up works on a copy put beside it.
- A 3D Molfile or SD file keeps its z coordinates: it opens in its own 3D geometry.
- Clean Up:
  - pressed again on the same structure, not changed since, it gives another layout (a branch turned over, the structure grown from another atom), each with its configuration kept; the message says which of how many it is;
  - crowded structures: three or four rings on one atom (BArF−, Ph4C) are set out as a cross; labels that cover each other are cleared by turning the structure a little; groups that do not fit are written as labels (CF3, OMe, tBu, iPr, PCy2…), all copies of the group alike, and a ring squashed for lack of room makes the whole structure use labels, so XPhos comes out as it is usually drawn;
  - an H drawn on N, O or S goes into the label (NH, OH, SH);
  - cages are drawn from their framework: homoadamantane is new (the Baeyer–Villiger lactone of adamantanone), a cage that came out with crossing bonds is drawn from its 3D shape, and Clean Up 2D keeps adamantane, cubane and bicyclo[2.2.2]octane in perspective;
  - Settings → Drawing has two new choices: a methoxy drawn as O–CH3 and a methyl drawn as a bond end can be left as drawn (the default) or written as OMe / OCH3 and Me / CH3.
- Contract Labels also knows iPr, Cy, PCy2 and PtBu2.
- Messages are shown in a small box over the sheet while the stoichiometry grid under the editor is hidden; before, most of them could not be seen.

## Fixed

- 3D shape built the mirror image of a drawn stereocentre (Clean Up 2D turned it back, so a round trip looked right).
- The simple 3D builder used when OpenChemLib cannot make a shape could turn stereocentres over; a shape that does not keep the configuration is no longer used.
- A SMILES with written hydrogens (N([H])…[C@H]…) lost the configuration of its stereocentres.
- With two reaction steps, deleting the step that was shown left the other step's grid with the deleted step's roles and amounts (a solvent came back as a reactant).
- A pasted group lost its grouping.
- A ferrocene drawn with the J key showed valence warnings on its Cp carbons.

## 1.4

- Clean Up 2D, a new button at the end of the Structure group: lays the selected structures out flat. A structure turned in 3D (3D shape, 3D rotate) becomes a flat drawing again, its configuration kept as wedges and hashes. Bridged rings such as norbornane, norbornene or camphor are drawn flat, as a regular hexagon with the bridge inside it, and turned onto the hexagon grid. Clean Up Structure is unchanged and keeps bridged systems in perspective. The local API does it with `clean {flat: true}`.
- The side panel folds away: the arrow at the left of its tabs hides it to a thin strip at the right edge, so the sheet gets the room, and the arrow on the strip opens it again. Remembered on the computer; a hotkey can be set for it.
- Reagent table: a volume can be entered for a reagent that has neither density nor molarity (not the limiting one). It is kept and follows the amounts: twice the equivalents, or twice the limiting reagent, twice the volume. Until its equivalents are entered they, its moles and its mass stay empty; enter the density later and they are calculated from that volume. In a CDXML file the volume is written as entered and read back.
- Text of several lines: the selection box covers every line, not only the first, and so do aligning, distributing and Clean Up making room around it.

## 1.3

- Clean Up keeps the configuration: after the new layout it checks R/S at every centre with wedges and E/Z at every double bond, and puts back what turned over (the mirror image, a branch turned back over its double bond, or the wedges of a centre swapped); when it cannot, the structure stays as drawn and a message says why.
- Fused rings are laid out as they are usually drawn: the layout starts from the largest ring system and puts it on the hexagon grid, hexagons regular and a five-membered ring between them taking up the strain (acenaphthene with its naphthalene flat), and symmetric when it can be (fluorene, carbazole); substituents grow from it. Bridged systems keep the layout they had.
- Reagents written as text: a caption such as MeMgBr, K2CO3 or nBuLi stays text on the sheet and is counted in the reagent table with its formula and mass. The new button Count text as a structure (at the end of the Text group) attaches the structure to a text or removes it; Shift+click draws the structure instead. These reagents are also in the reaction SMILES.
- More abbreviations and reagent names, from the Beilstein Chemical Lookup Collection (BChemLookup, CC0).
- Structure checks: a wedge or hash to a drawn H atom is checked on the right atom (a correct drawing was marked "not at a stereocentre").
- Links in the Windows, Mac and Linux apps (Info: what is new, the project page, the credits) open in the computer's own browser.
- The version is shown in Info, with a link to what is new; the local API has `version` and the command line `reactio --version`.
- How to cite: CITATION.cff, and each release is archived on Zenodo with its own DOI.
- The code is easier to read: the CSS and JavaScript of index.html are laid out one statement per line, and ARCHITECTURE.md is a map of the file for anyone who wants to change it.

## 1.2

- Opening CDXML and CDX files:
  - a bold double or triple bond stays double or triple, its main line bold;
  - labels with a generic group (OR, OR2, NR2, CO2R, NHAr) stay one label, and R, R1, R', Ar and X are no longer marked as unrecognized (Ar is the aryl group, not argon);
  - captions written in formula style keep their text, with the digits as subscripts; centred and right-aligned captions stay where they were;
  - curved arrows drawn on a structure, curved equilibrium arrows (two arcs), brackets, and ‡, † and charges next to them are kept;
  - dots hidden in white stay hidden.
- A group bonded to a metal (PPh2 on Ru, NMe2 on Pd) is no longer marked as having too many bonds.
- Opening a file shows the whole drawing (fit to the window).
- The mouse wheel scrolls the row of tabs when they do not all fit.
- New color theme, Color-blind safe: the eight colors of Okabe and Ito, which people with any kind of color blindness can tell apart.

## 1.1

- Top bar: a click on a group's grip ⋮ folds the group into one named menu (and back); Settings → Interface → Top bar → Compact puts everything but the file buttons into four menus in one row.
- Arrows: while you drag, the arrow itself is shown, faint, with its curve and heads. Curved (mechanism) arrows start and end on an atom or the middle of a bond, a small gap off it (Settings → Drawing → Ends of curved arrows: touching, small or larger gap). At an atom with a label the arrow stops short of the letters.
- Orbitals: lobes in the classic teardrop (dumbbell) shape; the menu has s (empty or filled), dxy, a single lobe (filled or empty), dz² (the ring or the lobes filled), p, and sp³ (the big or the small lobe filled); filling is always one phase; shaded orbitals in CDX and CDXML files open as shaded. An orbital put on an atom moves with it; selected, a round handle turns it about the atom and a square one changes its size. Overlap lines start and end at the tip or the middle of a lobe, or at the centre or edge of an s orbital; drawn with the dashed bond tool they stay dashed.

## 1.0.1

- Clean Up Reaction keeps conditions that are not one compound (Pd(PPh3)4, K2CO3; rt, 2 h) over or under the arrow, and the arrow grows to fit them; before, the product could land on top of such text.

1.0 was the first public version.

## Downloads

| File | For |
| --- | --- |
| `ReactioDraw-Windows-x64.zip` | Windows 11 on Intel or AMD: unzip, run `ReactioDraw.exe` |
| `ReactioDraw-Windows-ARM.zip` | Windows 11 on ARM (for example Parallels on an Apple-silicon Mac) |
| `ReactioDraw-Mac.zip` | macOS: double-click `Install Reactio Draw.command`; it builds the app on your Mac |
| `ReactioDraw-Linux-x64.tar.gz` | Linux on Intel or AMD: unpack, run `./install.sh` (needs WebKitGTK) |
| `ReactioDraw-Linux-ARM.tar.gz` | Linux on ARM |
| `ReactioDraw-Web.zip` | the browser version as one file, to keep offline |

The complete source code is the “Source code” archive GitHub attaches below: everything needed to build every version offline.

Every download carries `Reactio Draw - Getting started.pdf` (every function and button explained) and `Reactio Draw - Hotkeys.reactio`, a one-page hotkey chart that opens in Reactio Draw.

## Notes

- The Windows program is not signed with a certificate: Windows may say “Windows protected your PC” (More info → Run anyway).
- The Mac app is built on your own Mac by the installer (Apple's free Command Line Tools), so macOS does not block it.
- Paste name reads about 600 built-in names and abbreviations without extra software; other names need Java (OPSIN). Name it needs Python with openclatura and Java (each name is read back with OPSIN to check it). Everything else works without extra software, and nothing goes online.
