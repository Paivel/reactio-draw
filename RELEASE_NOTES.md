# Reactio Draw 1.7

## New

- Excel, a test version: a column of SMILES becomes pictures in their cells and properties beside them; the REACTIO formula gives one property in any cell (formula, mass, name, predicted 1H and 13C NMR) and is described in Excel's formula help; a Formula menu and an Update formulas button on the tab. Chapter 8 of Getting started
- MCP for AI assistants (Info → MCP): Claude and other assistants draw, check and name structures in the open app; a figure to copy is laid under the drawing (place_reference), and view_drawing shows the whole sheet or a part of it
- Local API, drawing from a figure: a whole scheme in one command and one undo step (addScheme, batch); structures laid onto the figure without bending them (skeleton templates for perspective norbornanes and chairs, letters and balls matched, bold bonds where the figure's lines are thick); the figure's structures, texts, arrows and fills found (findStructures), its texts read (recognizeText, Mac), its scale found from its bonds
- Structures read from a figure atom by atom with MolScribe, when it is installed apart (Mac app; see its README): balls, stereo marks and bold bonds sorted out, warnings where the figure's letters or bonds disagree with what was read, and with a SMILES given only the places are taken from it
- Local API, looks: a label and a fill in a ring (Het), colours of a structure, of single atoms and of bonds, bond widths, shapes, bent arrows, the side of the H of an NH, balls drawn as rings
- Local API, documents: a new document in its own tab, the list of open documents, going to one
- Local API: change a label in place (setLabel, with its reading direction), duplicate a structure (mirrored or turned), join two atoms (bondAtoms), press an editor key on an atom or bond (key: an η6-arene, a Cp sandwich, tBu, a fused ring…; keys lists them), make only the rings regular (clean rings), and batch answers each command
- A skill for Claude Code, Codex and Claude Desktop (reactio-draw): how to draw and copy schemes with Reactio Draw, and to take structures and numbers only from it
- Local API, mechanisms: orbitals on atoms (addOrbital, or in addScheme), curved arrows from an atom, a bond or an orbital to another, smooth curves and arcs (a dashed tether), lone pairs, δ+ / δ−, attachment points, radicals and hydrogens set per atom (setAtom), bold atom labels
- Local API, orbitals: on a labelled atom (N, O, N⁺) lobes start at the label's edge, as bonds do; electrons drawn inside a lobe; setOrbital changes an orbital in place with its arrows; an arrow can aim at either half of a p orbital; orbitals go with their structure when it is deleted; objects describe orbitals in full
- Orbitals: the square handle resizes all orbitals on the same atom together (Alt: the one alone); curved arrows tied to a lobe follow
- Free symbols: a lone pair or a radical/electron clicked on the sheet stands on its own; put (or dragged) into an orbital's lobe it sits inside it and goes with the orbital, sliding along it when dragged (Alt: no snapping; the lobe is outlined while dragging). Local API: addSymbol, setSymbol, addScheme "symbols"
- Hashed bonds always have at least four separate strokes; on a short bond they get thinner rather than run together
- findStructures finds orbitals' lobes in a figure (teardrops and p orbitals, outlined or filled)
- Local API: setStyle labelGap (room between a label and its bonds) and hashSpacing
- Orbitals start just off the atom's letter (the charge is not counted; setStyle orbitalGap); charges, lone pairs and radicals keep off an atom's lobes, and a charge goes upper right when that is free
- Local API: setAtom chargePos, partialPos, radicalPos, lonePairAngles, and atoms tells where each symbol stands; addSymbol type charge (a free charge); an arrow can enter a lobe from its side (at: side) or end inside it; orbitals' boxes are the lobes themselves; scheme orbitals numbered from 1 ("tag.1") or named by structure, atom and angle
- A charge dragged to another place keeps its look (a plain + no longer turns into ⊕); setAtom chargeStyle and setStyle chargeStyle choose plain or circled
- Charge corner: an atom's sign erased inside a charge corner ⌉ goes out of sight only, the species keeps its charge (shown once at the corner); Local API addBracket chargeCorner, setAtom chargeVisible
- Local API: texts over or under an arrow that follow it; arrows from a text; objects describe arrows in full; arcs from atom to atom (tethers) follow their atoms; tidyRings keepShape; setRole and list roles by every arrow; setStyle fromReference (the figure's letter size and line width, measured); findStructures atomLabels with their ink colour and fewer false lobes; pictures in WebP and GIF (HEIC, TIFF converted by the MCP)
- Copying from pictures: findStructures finds arrows of any slope (straight or curved, with their heads), dashed and dotted lines and arcs, where the bonds of each structure meet (its unlabelled atoms), lobes that touch their letters, and reads atom labels' letters; structures whose bonds are cut short by labels are no longer taken for text; recognizeText gives each letter on its own (letters) and sizes lines by their capitals
- Charge corner: short by default, at the structure's top right, down to its charged atom; its sign goes and moves with it
- Roles in a scheme follow each arrow's tail and head (a scheme branching both ways reads right)
- The Mac installer waits for an open Reactio Draw to quit (it asks about unsaved documents) instead of going on while it is open
- Isotopes: ¹⁵N, ¹³C, ²H and the usual tracer labels in SMILES ([15N]), Molfiles and CDXML; drawn as a mass number upper left of the symbol (or upper right); counted with their own mass in formula, masses, elemental analysis and isotope pattern
- Rich text colour \c[#e8251f]{P} in texts and atom labels; a text can carry a group on one of its letters (KPPh2 with =O over the P)
- Delocalization arcs (addShape delocalization) over atoms with their sign; arcs bow up, down, left or right as asked; arc ends at a side of an atom's letters
- Fitting to a figure: among equally good layouts the one whose wedges and hashes fall on the figure's wins, and a mirrored layout is said; groups off the figure are turned about the atom they hang on toward their lines and letters
- check {"layout": true}: an arrow or line counts by its own line, not its box; texts tied to an arrow are no overlap
- setStyle fromReference measures the line width across straight bond lines (wedges, heads and bold letters left out)
- Local API: setStyle can restyle what is already drawn (or only the atom labels); check warns of wedges and hashes too short to read; a wedge's narrow end is reported; undo takes back a whole addScheme, shapes included
- Delocalization arcs bow toward the atoms between, small (a ∩ under a bent N–N–N, its ends beside the end letters), clear of every atom, the sign just under them
- Fitting to a figure keeps the molecule: where a layout lays a stereocentre over (a mirror image, a flipped chain), its wedges and hashes are swapped, and among equal layouts the one whose wedges fall on the figure's wins; groups may swing right round their atom; bold bonds only where a line is clearly thicker than the figure's own (each reported)
- Isotope mass numbers in the colour of text (isotopeColor), on the side of the atom free of bonds; atom numbers (locants) beside atoms (setAtom number), going with them; shaded 3D balls as marks
- Local API: texts over an arrow keep half a line's gap (gap); an arc's bulge read from the figure (fit); the charge corner's shelf level with the uppermost atom on the right; tidyRings keepShape leaves atoms with letters where they are; setStyle textFontPerBond (fromReference measures labels and texts apart, line widths as the median, to a fraction of a pixel)
- Copying from pictures: findStructures leaves out lobes and arrows inside text, braces, and corners of letters; straight arrows with a head are found with their texts run into them; recognizeText letters gives signs apart from their letters, with "or" for doubtful ones; recognizeStructures with a SMILES answers "not read" under nine tenths matched instead of a tangle
- Windows: structures read with MolScribe (as on the Mac) and text recognition that loads its Windows types itself; the model is also found in .reactio-ocsr\models
- MCP: batch writes pictures and exports to their path; place_reference says where the picture came from, its size, and warns when the clipboard holds the same picture as last time
- Structures read with MolScribe: labels as figures write them (R¹, ⁱPr, ᵗBu), stray pieces beside a molecule left out, impossible graphs (five-bonded C, C=C=C in a ring) warned about; the answer goes to addScheme as it is, and a figure laid again since is said
- Local API: ring fills from the figure (ringFills "fromReference"), ring atoms in any order, delete one piece of a group (part), an id given where an index is asked taken as the id; MCP writes the answer of a long command to its file when it comes (result), with the time it was written
- Clean Up keeps the molecule: where turning the tidied structure back onto its place lays a stereocentre over, its wedge and hash are swapped. Local API: clean rings lays each ring system out whole (fused rings together) and keeps the chains as drawn; keepBox keeps the old size; the answer lists overlaps; fitToReference and addScheme answer how even the bonds are and tidy: true cleans in place after a fit; flipPart mirrors a ring system or a group over its own axis
- Structures read with MolScribe: one atom read twice close together is made one (the molecule no longer comes in two pieces); a figure rescaled on reading is said at once; laying a new figure keeps the pictures cut from earlier ones; atoms answers atom numbers
- Clean Up of a part: with only some atoms of a structure selected, only they are tidied and joined to the rest where it stands; the rest does not move (Local API: clean {index, atoms}, select {index, atoms})
- Local API: stretch makes a ring bond longer as a figure draws it (a Togni reagent's O–I), the ring rebuilt symmetric; a ball given a colour is solid; fitting prefers the layout whose labels stand on the figure's letters (H2N and CF3 at the right ends); setStyle fromReference guesses the figure's bond when it is not measured yet
- Equilibrium arrows with thin half heads (harpoons), straight and curved, at the end of the Equilibrium group; half heads sit flush on the shaft, straight or curved, with no notch or step
- Texts in formula style subscript the digits of formulas only: names such as Int1 or TS2 keep their digits on the line
- Local API: arrows along a circle (through three points, or an arc round a centre; a catalytic cycle's arrows on one circle in addScheme); the size of an atom's charge, radical and lone pairs (symbolSize) and of free symbols; setImage; pieces cut from a figure without its drawing (eraseInk); addScheme lists every object it made; coords made regular; a clearly better fitted layout taken; frames and crossing arrows are no overlap in check
- Local API: arrows leaving another along its way or touching it from outside; check finds arrows that nearly touch; one electron in an atom's orbital is its radical (counted, drawn in the lobe); findStructures splits a catalytic cycle into its structures (free arrows no longer join them)
- A double bond shared by a five- and a six-membered ring (an indole's, a fluorenone's) has its second line in the six-membered ring; Local API setBond side puts it where asked
- Local API: groups round one atom with different labels are laid each on its own letters of a figure, and Clean Up keeping the orientation keeps each group on its side; a small structure fitted to a figure is set level; bond colours stay over a structure's colour; arcs of turned ellipses; a lobe's length in bonds and its electron dots' size; every command answers the objects it made besides those it says (alsoMade); findStructures gives straight arrows with heads among the arrows, and a letter beside a line's end is no head
- Pictures and answers in the background, for AI assistants (MCP: render_structure, render_grid, render_reaction, analyze_structure) and scripts: a grid of structures labelled a, b, c or by name, a reaction scheme, and one structure in full (masses, isotopes, cLogP, TPSA, R/S and E/Z, specified or not), without touching the open sheet

- Reactio Draw — AI assistants, a separate download added on top of Reactio Draw: the local API, MCP, the skill and their notes come only with it, so a chemist who only draws installs none of it ("Install AI assistants" and "Remove AI assistants" for Mac and Windows, install-ai.sh for Linux)
- Folders for AI assistants (Info → API): AI assistants read and write only in the folders you add there, only drawings, pictures and their data, never hidden files, Library or AppData; the list starts empty, and only you can change it, in the app
- Check for updates (Info): asks GitHub for the newest release only when you press it
- ¹H NMR prediction gives multiplicities and coupling constants (dq, J = 7.0, 1.5 Hz): open chains from the substituents' electronegativity, cis and trans alkenes from the drawing, aromatic ortho and meta couplings, and rigid rings from their 3D shape with a Karplus equation; in the panel, the text and the API
- Chair templates (two chair cyclohexanes) in the palette after Cubane; bridged templates drawn as chemists draw them (adamantane, bicyclo[3.2.1], [2.1.1], [1.1.1]) and the bicyclobutane butterfly
- Mirror label, a new button at the end of the Structure group: OtBu ↔ ᵗBuO, OTBS ↔ TBSO, CO2Me ↔ MeO2C, the attaching atom at the bond (Local API setLabel mirror)
- Highlights: bonds as wide as the atoms' circles (no "dumbbells"), larger circles for atoms with letters, a whole label (OH) highlighted in one piece
- Clean Up: fused rings made regular, explicit ring H taken off and put back on its stereocentre; Clean Up of a part keeps its joints
- Local API: placeLike (a structure laid like another on a figure, with boxes and checks against the figure's ink), check geometry and clean level, closeDocument, clear resetIds, setAtom numberSize, bold texts, units of the figure for every place; long commands show a bar with Stop and never wait endlessly
- Open documents are kept in memory when the browser's storage is full, with a warning

## Changed

- Windows: a drawing opened from Word or PowerPoint (double-click) comes into a tab "Word object" of the open Reactio Draw window instead of a window of its own (Reactio Draw starts if it is not open); closing that tab gives the drawing back to Word and leaves the window open
- Reagent table: typing the mass, moles or volume of the limiting reagent keeps its equivalents and rescales the other reagents and the solvent volumes (the concentration stays); its equivalents can still be changed by hand
- Local API.txt arranged by task (basics, documents, reading, drawing, changing, look, a whole scheme, copying a figure), each command once with all its arguments; the MCP instructions as one workflow
- Markush structures: Enumerate draws substituents written as SMILES as atoms and lays the compounds out by their real size; Collect into Markush writes its list under the series and selects it

## Fixed

- A one-letter label (X, R, M) stood off its atom (it was set from the atom's side, as long labels are): it is centred on it now, as element symbols are
- The command line run beside the open app took over the app's local API address (api.json) and could change its open documents: it now keeps to itself, so AI assistants keep reaching the app
- A label on a bond from straight above or below (SO2Ar under an N) no longer turns round when the bond leans a little
- Two wedges whose wide ends meet at one atom left a notch between them
- NO2 and N3 written as labels lost the charges inside the group (N+ and O−), which cancel each other, and could come out with a wrong valence in SMILES
- Collect into Markush rewrote an older list of another series, or a caption under an enumerated compound, instead of writing the new list
- Wedges and hashes read from a figure: few-stroke hashes, short fat wedges and wedges cut at labels are read right; wedges are kept only at stereocentres

# Reactio Draw 1.6

## New

- XYZ files: open, and save with a conformer search (MMFF94s+), charge and multiplicity for quantum chemistry (issue #1; the export by Onelightayear)
- R/S and E/Z labels on the structures
- cLogP, TPSA, H-bond donors and acceptors, rule of five
- Markush structures: R-groups with value lists, Enumerate, and Collect into Markush
- η-rings (Cp, arenes): proper line breaks where the bond to the metal crosses the ring; drag the ring centre to move the ligand round its metal
- Structures from .cif and .xyz keep their R/S (wedges from the 3D shape)

## Changed

- Cleaner layouts for porphyrins, fused cages (benzonorbornene) and bicyclo[2.2.2]octanes; crossing bonds get a gap after Clean Up
- Much faster on big sheets: opening, Select All, Clean Up, dragging, 3D turning and zooming
- Side panel tabs scroll when they do not fit

## Fixed

- Zooming or turning a sheet of crystal structures could make the app hang
- In the apps, the Check line and the licence link opened the browser

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
| `ReactioDraw-Windows-x64.zip` | Windows 11 on Intel or AMD: unzip, double-click `Install Reactio Draw.cmd` |
| `ReactioDraw-Windows-ARM.zip` | Windows 11 on ARM (for example Parallels on an Apple-silicon Mac) |
| `ReactioDraw-Mac.zip` | macOS: double-click `Install Reactio Draw.command`; it builds the app on your Mac |
| `ReactioDraw-Linux-x64.tar.gz` | Linux on Intel or AMD: unpack, run `./install.sh` (needs WebKitGTK) |
| `ReactioDraw-Linux-ARM.tar.gz` | Linux on ARM |
| `ReactioDraw-Web.zip` | the browser version as one file, to keep offline |
| `…-AI-assistants.zip` / `.tar.gz` | only for AI assistants (Claude, Codex and other MCP clients) and scripts: the add-on with the local API, MCP and the skill, one for each of the downloads above; install the program first, then the add-on (`Install with AI assistants.txt`) |

The complete source code is the “Source code” archive GitHub attaches below: everything needed to build every version offline.

Every download carries `Reactio Draw - Getting started.pdf` (every function and button explained) and `Reactio Draw - Hotkeys.reactio`, a one-page hotkey chart that opens in Reactio Draw.

## Notes

- The Windows program is not signed with a certificate: Windows may say “Windows protected your PC” (More info → Run anyway).
- The Mac app is built on your own Mac by the installer (Apple's free Command Line Tools), so macOS does not block it.
- Paste name reads about 600 built-in names and abbreviations without extra software; other names need Java (OPSIN). Name it needs Python with openclatura and Java (each name is read back with OPSIN to check it). Everything else works without extra software, and nothing goes online.
