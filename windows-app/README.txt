Reactio Draw for Windows
=========================================

Works on Windows 11 only (regular and ARM).

1. Put the "Reactio Draw" folder where programs live before you run it: Word remembers
   where the program is. Best: your own programs folder, %LOCALAPPDATA%\Programs
   (press Win+R, paste %LOCALAPPDATA%\Programs, Enter; no administrator rights needed).
   Copy the whole "Reactio Draw" folder from the archive there; nothing else to create.
   If Windows says the Programs folder does not exist, open %LOCALAPPDATA% and make a folder named Programs.
   C:\Program Files works too, but copying there asks for administrator rights.
2. Double-click "Install Reactio Draw.cmd". It starts the program (Files\ReactioDraw.exe, or
   ReactioDraw-ARM.exe on Windows on ARM), which registers itself for the current user on its first
   start: no administrator rights. It then offers the Reactio Draw tab in Excel. The program's own files are
   in the folder Files; the guides are in Documentation. AI assistants (Claude, Codex) are a separate
   download, "Reactio Draw - AI assistants", installed on top of this one; without it Reactio Draw has
   no local API and no MCP at all. Later, start Reactio Draw with Files\ReactioDraw.exe (or a .reactio file).
3. Draw a reaction, press Ctrl+C (or Ctrl+Shift+D), then Ctrl+V in Word or PowerPoint.
4. Double-clicking the drawing in Word opens it in a tab "Word object" of the open Reactio Draw
   window. The picture in Word follows your edits; Ctrl+S or closing that tab saves the drawing
   into the Word document, and the window stays open.
5. An object copied from Word (Ctrl+C) pastes back (Ctrl+V)
   together with its table.
6. From other chemistry editors: Ctrl+C there, Ctrl+V in Reactio Draw brings structures,
   arrows and captions. CDX objects from Word paste the same way;
   .cdx and .cdxml files open with the Open button.
7. Reactio Draw documents (.reactio) open on double-click. .cdxml, .cdx, .json, .mol, .rxn,
   .sdf and .smi files can too: right-click the file > Open with > Choose another app >
   Reactio Draw > Always. If the program is already open, the file opens there in a new tab.
8. Word gets a Reactio Draw tab (restart Word once): Plain pictures, Export to CDXML,
   Open in Reactio Draw, Mark drawings and Edit drawing (double-click the object works too).
   It is the template "Reactio Draw.dotm", copied into Word's Startup folder when ReactioDraw.exe
   starts; Word may ask once to enable its macros.

Your documents and settings stay where they were.

Documents, settings and the error log (ReactioDraw.log) are in %LOCALAPPDATA%\ReactioDraw.

To uninstall: double-click "Uninstall Reactio Draw.cmd". The program stops opening
drawings in Word and PowerPoint and lets go of .cdxml, .cdx and the other files.
Then delete the "Reactio Draw" folder. Drawings in Word documents stay as pictures.
Your documents in %LOCALAPPDATA%\ReactioDraw stay too: delete that folder if you do not need them.

Paste name (Analysis tab) turns a chemical name into a structure with OPSIN
(MIT license, https://github.com/dan2097/opsin; tools\opsin-2.9.0.jar, unchanged).
It needs Java on this computer (Java 8 or newer, e.g. Eclipse Temurin from adoptium.net).

Name it (Analysis tab) gives the IUPAC name of the selected structure with openclatura
(MIT, https://github.com/lamalab-org/openclatura) in this computer's own Python:
install Python 3.11+ from python.org, then in a command prompt: py -m pip install openclatura
Each name is read back with OPSIN and compared with the drawing.

Limitation: naming is the weak spot. openclatura names organic structures only; inorganic species
(PF6-, BF4-, SO4 2-, metal ions and complexes, water...) get no name. A salt is named part by part
("cation name; ?"): there is no combined salt name such as "... hexafluorophosphate", write that by hand.
Trust only names marked with the OPSIN check (✓).

NMR prediction (Analysis tab) predicts 1H, 13C, 19F and 31P shifts of the selected structure
offline, from measured spectra in nmrshiftdb2. Nothing to install.

Command line: reactio.exe in this folder renders, converts and checks files without a window
(reactio --help, and "Command line.txt").

Every function and button is described in "Reactio Draw - Getting started.pdf".
