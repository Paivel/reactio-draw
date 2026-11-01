#!/bin/sh
# Takes the AI add-on (reactio-mcp) out of Reactio Draw. Reactio Draw stays.   Run:  ./remove-ai.sh
bin="$(readlink -f "$HOME/.local/bin/reactiodraw" 2>/dev/null || true)"
if [ -n "$bin" ] && [ -f "$(dirname "$bin")/reactio-mcp" ]; then
  rm -f "$(dirname "$bin")/reactio-mcp" && echo "reactio-mcp is taken out of $(dirname "$bin")."
fi
echo "Done: Reactio Draw has no local API and no MCP now (close and open it again if it is open)."
