#!/bin/bash
# Takes the AI add-on out of Reactio Draw.app (reactio-mcp) and out of Claude Desktop's settings. Reactio Draw stays.
d="$(cd "$(dirname "$0")" && pwd)"; f="$d/Files"
[ -f "$f/Connect Claude Desktop.command" ] && sh "$f/Connect Claude Desktop.command" --remove 2>/dev/null
for a in "/Applications/Reactio Draw.app" "$HOME/Applications/Reactio Draw.app"; do
  if [ -f "$a/Contents/MacOS/reactio-mcp" ]; then
    rm -f "$a/Contents/MacOS/reactio-mcp" && codesign --force --deep -s - "$a" >/dev/null 2>&1
    echo "reactio-mcp is taken out of $a."
  fi
done
echo "Done: Reactio Draw has no local API and no MCP now (close and open it again if it is open)."
