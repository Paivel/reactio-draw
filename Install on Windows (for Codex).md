# Install Reactio Draw with MCP on Windows: instructions for an AI agent (Codex)

You are an AI agent with a shell on the user's Windows 11 computer. Install Reactio Draw, connect it to Codex as an MCP
server, add the reactio-draw skill, and check that it works. Follow the steps in order. Use PowerShell. Nothing here
needs administrator rights; do not ask for them.

Rules:
- Ask the user before installing anything other than Reactio Draw itself (Java, Python and its packages).
- Never delete or overwrite other entries in a configuration file: back it up first, then add or replace only the
  `reactio-draw` entry.
- Do not download Reactio Draw from anywhere but the archive the user gives you or GitHub (github.com/Paivel/reactio-draw).
- At the end, tell the user plainly what was done, what was skipped, and the one step only they can do (step 4).

## 1. Find the two archives

Reactio Draw comes in two downloads: the program, `ReactioDraw-Windows-x64.zip` (or `-ARM.zip`), and the add-on for AI assistants,
`ReactioDraw-Windows-x64-AI-assistants.zip` (or `ReactioDraw-Windows-ARM-AI-assistants.zip`) (reactio-mcp.exe, the skill and these instructions). Look for both in the
user's Downloads folder:

```powershell
Get-ChildItem "$env:USERPROFILE\Downloads" -Recurse -Filter "ReactioDraw-Windows*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 5 FullName, LastWriteTime
```

Take the newest of each. If one is missing, ask the user for it. On Windows on ARM the program's archive must contain
`ReactioDraw-ARM.exe`; if it does not, tell the user they need the ARM build.

## 2. Install (copy) the program and the add-on

The program needs no installer: the "Reactio Draw" folder goes to `%LOCALAPPDATA%\Programs`. The add-on puts
reactio-mcp.exe beside the program (in its folder Files); without it the program has no local API and no MCP.

```powershell
$zip  = "<the program's archive from step 1>"
$kitZip = "<the add-on's archive from step 1>"
$dest = Join-Path $env:LOCALAPPDATA "Programs"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
# an older copy must not be running: ask the user to close it (it asks about unsaved documents); never kill it
while (Get-Process ReactioDraw* -ErrorAction SilentlyContinue) { Write-Host "Close Reactio Draw (save your documents), then this goes on"; Start-Sleep 3 }
Expand-Archive -Path $zip -DestinationPath $dest -Force
$rd = Join-Path $dest "Reactio Draw"
$bin = Join-Path $rd "Files"        # the program itself; the top folder has the installer, README and Documentation
Expand-Archive -Path $kitZip -DestinationPath $dest -Force
$kit = Join-Path $dest "Reactio Draw - AI assistants"
Copy-Item (Join-Path $kit "Files\reactio-mcp.exe"), (Join-Path $kit "Files\Connect Claude Desktop.cmd") $bin -Force
Get-ChildItem $rd, $kit | Select-Object FullName
```

`$bin` (Files) must now contain `ReactioDraw.exe`, `reactio.exe` and `reactio-mcp.exe`; `$kit` must contain the folder
`Skill for AI assistants`.
Unblock the files Windows marked as downloaded, then start the program once (it registers itself for the user):

```powershell
Get-ChildItem $rd, $kit -Recurse | Unblock-File
Start-Process (Join-Path $bin "ReactioDraw.exe")      # ReactioDraw-ARM.exe on Windows on ARM
```

Check the command line (it works without the window):

```powershell
& (Join-Path $bin "reactio.exe") --version
& (Join-Path $bin "reactio.exe") calc "CC(=O)Oc1ccccc1C(=O)O"     # aspirin: C9H8O4, 180.159 g/mol
```

## 3. Connect Reactio Draw to Codex

Codex reads MCP servers from `%USERPROFILE%\.codex\config.toml`. Back it up, then add the server (a TOML literal
string in single quotes keeps the backslashes):

```powershell
$cfgDir = Join-Path $env:USERPROFILE ".codex"
$cfg    = Join-Path $cfgDir "config.toml"
New-Item -ItemType Directory -Force -Path $cfgDir | Out-Null
if (Test-Path $cfg) { Copy-Item $cfg "$cfg.before-reactio" -Force }
$mcp = Join-Path $bin "reactio-mcp.exe"
$text = if (Test-Path $cfg) { Get-Content -Raw $cfg } else { "" }
if ($text -notmatch '(?m)^\[mcp_servers\.reactio-draw\]') {
  Add-Content -Path $cfg -Value "`n[mcp_servers.reactio-draw]`ncommand = '$mcp'`n"
}
Get-Content $cfg
```

If a `[mcp_servers.reactio-draw]` section was already there, check that its `command` is the path in `$mcp` and
correct only that line.

The same for Claude Desktop, if the user has it (ask). The script ends with a pause, so give it an Enter:

```powershell
'' | & (Join-Path $bin "Connect Claude Desktop.cmd")
```

Then the user quits Claude Desktop completely (tray icon > Quit) and opens it again.

Claude Code, if the user has it: `claude mcp add reactio-draw -- "$mcp"`.

## 4. The one step only the user can do

Tell the user: in Reactio Draw, Info > API > tick **MCP** (it turns the Local API on too), and under "Folders for
AI assistants" **Add a folder…** for the folder Codex works in (the list is empty until they add
one, and no script can add it). Assistants are refused until MCP is ticked. Wait until they say it is done.

## 5. Add the skill

```powershell
$skills = Join-Path $env:USERPROFILE ".codex\skills"
New-Item -ItemType Directory -Force -Path $skills | Out-Null
Copy-Item -Recurse -Force (Join-Path $kit "Skill for AI assistants\reactio-draw") $skills
Get-ChildItem (Join-Path $skills "reactio-draw")
```

Claude Code uses `%USERPROFILE%\.claude\skills` the same way. Claude Desktop: zip the `reactio-draw` folder and the
user uploads it in Settings > Capabilities > Skills.

## 6. Optional extras (ask the user first)

Everything above works without these.

a) **Names to structures for systematic names (OPSIN)** need Java 8 or newer. Common names work without it.

```powershell
java -version 2>&1        # already there?
winget install --id EclipseAdoptium.Temurin.21.JRE -e --accept-source-agreements --accept-package-agreements
```

b) **IUPAC names of drawn structures** (name_structure) need Python 3.11 or newer with openclatura.

```powershell
py --version              # already there? (3.11 or newer)
winget install --id Python.Python.3.12 -e --accept-source-agreements --accept-package-agreements
py -m pip install openclatura
```

After installing Java or Python, Reactio Draw must be closed and opened again to find them.

c) **Reading structures from pictures (MolScribe)**: large (PyTorch about 1 GB, the model about 1.1 GB), so ask
   first. It needs Python 3.10 exactly (no torch 1.x for 3.11 or newer) and numpy below 2.

   First check whether it is already there and works (an environment may have no pip.exe and still work: do not
   reinstall a working one for that):

```powershell
& "$env:USERPROFILE\.reactio-ocsr\Scripts\python.exe" -c "import sys, numpy, torch; from molscribe import MolScribe; print(sys.version); print(numpy.__version__, torch.__version__)"
```

   Only if that fails, install it (checked: Python 3.10, numpy 1.26.4, torch 1.13.1+cpu, MolScribe 1.1.1):

```powershell
py -3.10 --version        # already there?
winget install --id Python.Python.3.10 -e --accept-source-agreements --accept-package-agreements
py -3.10 -m venv "$env:USERPROFILE\.reactio-ocsr"
& "$env:USERPROFILE\.reactio-ocsr\Scripts\python.exe" -m pip install "numpy<2" torch MolScribe huggingface_hub
```

   The model is read from the file named in MOLSCRIBE_CKPT, else `%USERPROFILE%\.reactio-ocsr\molscribe.pth`, else
   `%USERPROFILE%\.reactio-ocsr\models\molscribe.pth`; only when none is there is it downloaded, once (a few minutes).
   Then Reactio Draw is closed and opened again (ask the user to close it: never stop it by force, documents may be
   unsaved). Check the whole path, not just that the tools are listed:
   1. place_reference with a picture of a simple known structure;
   2. reactio_command recognizeStructures (without draw), and look at the chemistry and places it answers;
   3. only then draw it; 4. reactio_command recognizeText on its labels.

   An error is reported as it is: it is not a sign that packages are missing. When MolScribe fails inside the
   assistant's sandbox with "WinError 5" at multiprocessing (a pipe it may not open), the sandbox stops it, not the
   installation: run it with the user's permission outside the sandbox; do not reinstall torch or the model for that.

   Limits: MolScribe reads plain structures. On a mechanism, orbitals and electron pairs can be read as atoms and bonds,
   and R or general labels as wrong atoms; a high confidence does not prove the chemistry right. Check what it read
   before drawing. Without MolScribe, assistants still copy schemes by fitting structures onto the picture.

   Text in pictures (recognizeText) uses Windows' own text recognition (Windows PowerShell 5.1, built in) and needs
   nothing; it needs an OCR language: if it answers that none is installed, add English (United States) in Settings >
   Time & language > Language & region.

   A config.toml changed while Codex runs does not change the MCP server already running: restart Codex after an
   update, and use the installed copy (%LOCALAPPDATA%\Programs\Reactio Draw), not one left in Downloads.

## 7. Check it works

1. Restart Codex so it loads the new MCP server and the skill (the user may have to start a new session).
2. In Codex, list the MCP tools: `reactio-draw` must show tools such as draw_smiles, view_drawing, analyze_structure,
   render_structure.
3. Try, with Reactio Draw open and MCP ticked:
   - analyze_structure with SMILES `CC(=O)Oc1ccccc1C(=O)O` → formula C9H8O4, exact mass 180.0423;
   - draw_name "ibuprofen" → the structure appears on the open sheet;
   - render_structure with the same SMILES → a picture (this one works even with the app closed).

## If something fails

- "Reactio Draw is not open, or MCP is off": the user opens Reactio Draw and ticks Info > MCP; if it is ticked,
  untick and tick it again (that writes the app's address again).
- "Reactio Draw does not answer at its address": the same.
- The tools do not show in Codex: check `config.toml` (the path must exist: `Test-Path $mcp`), then restart Codex.
- The program does not start: Windows 11 is needed, with WebView2 (built into Windows 11). Errors are logged in
  `%LOCALAPPDATA%\ReactioDraw\ReactioDraw.log`.
- To remove the add-on only: `"$kit\Remove AI assistants.cmd"` and delete the `[mcp_servers.reactio-draw]` section
  from config.toml. To remove everything: that, then `"$rd\Uninstall Reactio Draw.cmd"`, then delete both folders.

Files: reactio.exe and reactio-mcp.exe read and write only inside the folders listed in Reactio Draw → Settings →
API → "Folders for AI assistants" (empty until the user adds a folder). Ask the user to add the folder
Codex works in there; it cannot be added from a script.

More: MCP.txt and "Local API.txt" (Documentation of the add-on), "Command line.txt" and README.txt (the program).
