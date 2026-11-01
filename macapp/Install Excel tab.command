#!/bin/sh
# Connects Excel for Mac (2016 or later) to Reactio Draw: a small helper script goes into Excel's scripts folder (Excel's
# macros may start other programs only through a script there), and the Reactio Draw add-in, when it is here, into
# Excel's Startup folder. Run it again after moving Reactio Draw.app; with --remove it takes them away.
cd "$(dirname "$0")" || exit 1
g="$HOME/Library/Group Containers/UBF8T346G9.Office"
if [ "$1" = "--remove" ]; then
  for c in "User Content.localized" "User Content"; do for s in "Startup.localized" "Startup"; do
    rm -f "$g/$c/$s/Excel/Reactio Draw.xlam"; done; done
  rm -f "$HOME/Library/Application Scripts/com.microsoft.Excel/ReactioDraw.applescript" "$HOME/Library/Application Scripts/com.microsoft.Excel/ReactioDraw.scpt"
  echo "Reactio Draw is removed from Excel (restart Excel)."; exit 0
fi
app=""
for d in "/Applications/Reactio Draw.app" "$HOME/Applications/Reactio Draw.app"; do [ -d "$d" ] && { app="$d"; break; }; done
[ -n "$app" ] || { echo "Reactio Draw.app is not in Applications: run Install Reactio Draw.command first."; exit 1; }
[ -d "$g" ] || { echo "Microsoft Excel for Mac was not found (open Excel once, then run this again)."; exit 1; }
mkdir -p "$HOME/Library/Application Scripts/com.microsoft.Excel"
# Excel takes the helper only compiled (.scpt)
x="$HOME/Library/Application Scripts/com.microsoft.Excel"
sed "s|__APP__|$app|" ReactioDraw.applescript > "$x/ReactioDraw.applescript" || exit 1
osacompile -o "$x/ReactioDraw.scpt" "$x/ReactioDraw.applescript" && rm -f "$x/ReactioDraw.applescript" || exit 1
mkdir -p "$g/Reactio Draw"
if [ -f "Reactio Draw.xlam" ]; then
  c="User Content.localized"; [ -d "$g/$c" ] || { [ -d "$g/User Content" ] && c="User Content"; }
  s="Startup.localized"; [ -d "$g/$c/$s" ] || { [ -d "$g/$c/Startup" ] && s="Startup"; }
  mkdir -p "$g/$c/$s/Excel" && cp "Reactio Draw.xlam" "$g/$c/$s/Excel/" || exit 1
  echo "The Reactio Draw tab is in Excel now (restart Excel if it is open)."
else
  echo "Excel is connected to Reactio Draw. Now import ReactioExcel.bas in Excel (Tools > Macro > Visual Basic Editor,"
  echo "File > Import File) and run DrawStructures or CalculateProperties on a selected column of SMILES."
fi
echo "To take it away: sh \"Install Excel tab.command\" --remove"
