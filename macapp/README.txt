Reactio Draw for Mac: its own app, no browser.

Install: double-click "Install Reactio Draw.command" (at the top of the folder). If macOS says it cannot check the file,
open System Settings > Privacy & Security and click Open Anyway (older macOS: right-click > Open).
It builds Reactio Draw.app on this Mac with Apple's free Command Line Tools, puts it into Applications and opens it,
then offers, ticked, what else is on this Mac: the Reactio Draw tab in Word and in Excel. The program's own files are
in the folder Files; the guides are in Documentation.

AI assistants (Claude, Codex and other MCP clients drawing in Reactio Draw) are a separate download, "Reactio Draw -
AI assistants", installed on top of this one. Without it Reactio Draw has no local API and no MCP at all.

Files: Reactio Draw documents (.reactio) open on double-click. .cdxml, .cdx, .json, .mol, .rxn, .sdf and .smi
can be opened with Reactio Draw from Finder; to make it the default for a file type: select a file > File > Get Info >
Open with: Reactio Draw > Change All.

Word: the installer adds a Reactio Draw tab to Word (Plain pictures, Export to CDXML, Open in Reactio Draw; Edit drawing, Update, Mark drawings) when Word
is on this Mac. "Install Word tab.command" (folder Files) adds it again, for example after moving the app; with --remove it takes it
away. It puts "Reactio Draw.dotm" into Word's Startup folder and a small helper script into Word's scripts folder
(Word's macros may start other programs only through a script there). Word may ask once to enable the macros.
Edit drawing opens the selected picture here; Save (Cmd+S) puts it back into Word. Allow Reactio Draw to control Word
when the Mac asks. Mark drawings shows hidden, non-printing marks beside pictures with Reactio Draw data.

Paste name (in the Analysis tab) turns a chemical name into a structure. It uses OPSIN (MIT license,
https://github.com/dan2097/opsin; opsin.jar here, unchanged) and needs Java on this Mac
(any Java 8 or newer, e.g. Eclipse Temurin from adoptium.net).

Name it (Analysis tab) gives the IUPAC name of the selected structure. It uses openclatura (MIT license,
https://github.com/lamalab-org/openclatura) in this Mac's own Python: install Python 3.11 or newer
(python.org or Homebrew), then in Terminal:
  python3.13 -m venv ~/.reactio-python && ~/.reactio-python/bin/pip install openclatura
(python3.12 or python3.11 work too). Reactio Draw uses ~/.reactio-python first; it also finds
the Python your Terminal uses. If naming still fails, the note under the Name box lists the
Pythons it tried.
Each name is read back with OPSIN (needs Java) and compared with the drawing.

Limitation: naming is the weak spot. openclatura names organic structures only; inorganic species
(PF6-, BF4-, SO4 2-, metal ions and complexes, water...) get no name. A salt is named part by part
("cation name; ?"): there is no combined salt name such as "... hexafluorophosphate", write that by hand.
Trust only names marked with the OPSIN check (✓).

Structure recognition from pictures (MolScribe) is for AI assistants: see the download "Reactio Draw - AI assistants".

NMR prediction (Analysis tab) predicts 1H, 13C, 19F and 31P shifts of the selected structure
offline, from measured spectra in nmrshiftdb2. Nothing to install.

Command line: reactio renders, converts and checks files without a window (reactio --help, and "Command line.txt");
it is inside the app, and the installer says how to call it.

Pasting back from Word or PowerPoint: copy the Reactio Draw picture there and press Cmd+V in Reactio Draw.
If nothing comes, choose Help > Clipboard Report right after copying: it saves
"Reactio Draw clipboard report.txt" in Downloads (what the clipboard holds); send that file.

Every function and button is described in "Reactio Draw - Getting started.pdf".
