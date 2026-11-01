Reactio Draw for Excel

Select a column of SMILES or names (one per cell: CCO, caffeine, 2-acetyloxybenzoic acid) and Reactio Draw puts
a picture of each structure, or its properties, into the columns to the right. Everything is drawn by Reactio Draw on this computer; nothing is sent anywhere.

Install
  Mac:     "Install Reactio Draw.command" offers the Excel tab (tick it); later, or again: "Install Excel tab.command"
           in the folder Files. Restart Excel.
  Windows: "Install Reactio Draw.cmd" offers the Excel tab; later, or again: "Install Excel tab.cmd" in the folder
           Files. Restart Excel.
  Excel then has a Reactio Draw tab in every workbook: Structures, Properties, Formula, Style and Atom colors.
  (Without the tab: import ReactioExcel.bas in the Visual Basic Editor, File > Import File, and run the macros below.)

Use
  Select the cells with SMILES or names and press a button of the tab (or run a macro: Tools > Macro > Macros):
    Structures (DrawStructures)       a picture of each structure inside its cell (it scales with the cell)
    Properties (CalculateProperties)  formula, Mol. Wt., exact mass, cLogP, TPSA, H-bond donors and acceptors,
                                      rotatable bonds and InChIKey
  Where they go is set by the headers in the row above the SMILES:
    a column headed "Structure" gets the pictures; columns headed "MW", "cLogP", "TPSA", "InChIKey" and so on get
    only those properties (case, spaces and dots do not matter: "Mol. Wt." = "MW"). The name ("name"), the SMILES
    ("SMILES") and the predicted NMR shifts ("1H NMR", "13C NMR") come only when a header asks for them.
    With no such headers, everything goes into the first free columns to the right and the headers are written above,
    so the next run fills the same columns again.
  Formula: a column of =REACTIO(cell, "MW") (or another property) beside the selection. Or type it in any cell:
    =REACTIO(B2, "MW")    also "formula", "exact mass", "cLogP", "TPSA", "HBD", "HBA", "rotatable bonds", "InChIKey",
                          "name", "SMILES", "1H NMR", "13C NMR"
    New SMILES show "..." for a moment: they are all sent to Reactio Draw in one run, then the values appear.
    Update formulas on the tab calculates them all again at once (for cells that still show "...").
  A name becomes its structure first (common names built in, systematic names through OPSIN, which needs Java);
  "SMILES" then gives its SMILES. Empty cells are skipped; what cannot be read gets "(not read …)".

Settings on the tab (kept between sessions)
  Style        ACS 1996 (default), RSC, Nature, Angewandte, or as in Reactio Draw
  Atom colors  off: black structures; on: heteroatoms in color

The predicted NMR shifts come from nmrshiftdb2 data (https://nmrshiftdb.nmr.uni-koeln.de, nmrshiftdb2 Database
License). Names are made by Reactio Draw's naming tools on this computer.

The same works without Excel from the command line:
  reactio table smiles.tsv -o out --png --props --inchikey --name --nmr
