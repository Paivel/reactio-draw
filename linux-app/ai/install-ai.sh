#!/bin/sh
# Reactio Draw — AI assistants for Linux: puts reactio-mcp (the program AI assistants talk to) beside ReactioDraw, which
# must be installed first (the download "Reactio Draw", ./install.sh). Without this add-on Reactio Draw has no local API
# and no MCP at all. ./remove-ai.sh takes it away again.   Run:  ./install-ai.sh
set -e
d="$(cd "$(dirname "$0")" && pwd)"
case "$(uname -m)" in aarch64|arm64) m="reactio-mcp-arm64";; *) m="reactio-mcp-x64";; esac
[ -f "$d/Files/$m" ] || { echo "Files/$m is missing: unpack the whole archive again."; exit 1; }
bin="$(readlink -f "$HOME/.local/bin/reactiodraw" 2>/dev/null || true)"
[ -n "$bin" ] && [ -x "$bin" ] || { echo "Reactio Draw is not installed: run ./install.sh in the download \"Reactio Draw\" first, then this again."; exit 1; }
dir="$(dirname "$bin")"
cp "$d/Files/$m" "$dir/reactio-mcp"; chmod 755 "$dir/reactio-mcp"
echo "reactio-mcp is added to $dir."
echo
echo "Now, in Reactio Draw (open it again if it was open): Info → API:"
echo "  1. tick MCP;"
echo "  2. Add a folder… — the folders the assistant may read and write (none until you add one)."
echo "Connect your assistant to $dir/reactio-mcp (see Documentation/MCP.txt), and add the skill"
echo "(folder \"Skill for AI assistants\", see INSTALL.md there)."
