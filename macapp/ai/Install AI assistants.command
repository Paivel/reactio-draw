#!/bin/bash
# Reactio Draw — AI assistants: adds reactio-mcp (the program AI assistants talk to) to Reactio Draw.app, which must be
# installed first (the download "Reactio Draw"), and offers the connection to Claude Desktop. Without this add-on
# Reactio Draw has no local API and no MCP at all. "Remove AI assistants.command" takes it away again.
d="$(cd "$(dirname "$0")" && pwd)"; f="$d/Files"
app=""
for a in "/Applications/Reactio Draw.app" "$HOME/Applications/Reactio Draw.app"; do [ -d "$a" ] && { app="$a"; break; }; done
[ -n "$app" ] || { echo "Reactio Draw.app is not installed: install it first (Install Reactio Draw.command in the download \"Reactio Draw\"), then run this again."; exit 1; }
case "$(uname -m)" in arm64) m="reactio-mcp-arm64";; *) m="reactio-mcp-x86_64";; esac
[ -f "$f/$m" ] || { echo "Files/$m is missing: unzip the whole archive again."; exit 1; }
if pgrep -xq ReactioDraw; then
  echo "Reactio Draw is open: it sees the add-on after it is closed and opened again."
fi
cp "$f/$m" "$app/Contents/MacOS/reactio-mcp" || exit 1
chmod 755 "$app/Contents/MacOS/reactio-mcp"
xattr -d com.apple.quarantine "$app/Contents/MacOS/reactio-mcp" 2>/dev/null || true
codesign --force --deep -s - "$app" >/dev/null 2>&1 || true
echo "reactio-mcp is added to $app."
if { [ -d "/Applications/Claude.app" ] || [ -d "$HOME/Library/Application Support/Claude" ]; } && [ -f "$f/Connect Claude Desktop.command" ]; then
  a=$(osascript -e 'button returned of (display dialog "Connect Reactio Draw to Claude Desktop?" buttons {"Skip", "Connect"} default button "Connect" with title "Reactio Draw — AI assistants")' 2>/dev/null)
  [ "$a" = "Connect" ] && sh "$f/Connect Claude Desktop.command"
fi
echo
echo "Now, in Reactio Draw (open it again if it was open): Info → API:"
echo "  1. tick MCP;"
echo "  2. Add a folder… — the folders the assistant may read and write (none until you add one)."
echo "Then add the skill (folder \"Skill for AI assistants\", see INSTALL.md there)."
echo "Done. You can close this window."
