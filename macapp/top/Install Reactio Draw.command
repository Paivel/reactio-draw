#!/bin/bash
# Installs Reactio Draw: builds the app on this Mac and puts it into Applications (Files/Install Reactio Draw.command),
# then offers, ticked, what else is on this Mac: the Reactio Draw tab in Word and in Excel. Each can be added later
# with its own script in Files. AI assistants (MCP) are a separate download: Reactio Draw — AI assistants.
d="$(cd "$(dirname "$0")" && pwd)"; f="$d/Files"
[ -f "$f/Install Reactio Draw.command" ] || { echo "The folder Files is missing beside this script: unzip the whole archive again."; exit 1; }
RD_ASK=1 bash "$f/Install Reactio Draw.command" || exit 1
g="$HOME/Library/Group Containers/UBF8T346G9.Office"
opts=()
{ [ -d "/Applications/Microsoft Word.app" ] || [ -d "$g" ]; } && [ -f "$f/Install Word tab.command" ] && opts+=("Reactio Draw tab in Word")
{ [ -d "/Applications/Microsoft Excel.app" ] || [ -d "$g" ]; } && [ -f "$f/Install Excel tab.command" ] && opts+=("Reactio Draw tab in Excel")
if [ ${#opts[@]} -gt 0 ]; then
  list=""; for o in "${opts[@]}"; do list="$list\"$o\", "; done; list="{${list%, }}"
  pick=$(osascript -e "choose from list $list with title \"Reactio Draw\" with prompt \"Reactio Draw is installed. Also add (Cmd-click to change):\" default items $list OK button name \"Add\" cancel button name \"Skip\" with multiple selections allowed and empty selection allowed" 2>/dev/null)
  case "$pick" in *Word*) sh "$f/Install Word tab.command";; esac
  case "$pick" in *Excel*) sh "$f/Install Excel tab.command";; esac
fi
echo "Done. You can close this window."
