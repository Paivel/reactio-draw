#!/bin/sh
# Adds Reactio Draw to Claude Desktop as an MCP server (reactio-mcp), keeping everything else in its settings.
# Then tick Info → MCP in Reactio Draw and reopen Claude Desktop. With --remove it takes the entry away again.
app=""
for d in "/Applications/Reactio Draw.app" "$HOME/Applications/Reactio Draw.app"; do [ -d "$d" ] && { app="$d"; break; }; done
[ -n "$app" ] || { echo "Reactio Draw.app is not in Applications: run Install Reactio Draw.command first."; exit 1; }
[ -x "$app/Contents/MacOS/reactio-mcp" ] || { echo "This Reactio Draw has no reactio-mcp: run Install Reactio Draw.command from this folder again."; exit 1; }
cfg="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
mkdir -p "$(dirname "$cfg")"
[ -f "$cfg" ] && cp "$cfg" "$cfg.before-reactio"
osascript -l JavaScript - "$cfg" "$app/Contents/MacOS/reactio-mcp" "$1" <<'JS' || exit 1
function run(argv) {
  ObjC.import('Foundation');
  var path = argv[0], cmd = argv[1], remove = argv[2] === '--remove';
  var cfg = {};
  var s = $.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null);
  if (s && s.js && s.js.trim()) cfg = JSON.parse(s.js);
  cfg.mcpServers = cfg.mcpServers || {};
  if (remove) delete cfg.mcpServers['reactio-draw'];
  else cfg.mcpServers['reactio-draw'] = { command: cmd };
  $(JSON.stringify(cfg, null, 2) + '\n').writeToFileAtomicallyEncodingError(path, true, $.NSUTF8StringEncoding, null);
  return remove ? 'Reactio Draw is removed from Claude Desktop.' : 'Reactio Draw is added to Claude Desktop.';
}
JS
echo "Quit and reopen Claude Desktop, and tick Info → MCP in Reactio Draw."
