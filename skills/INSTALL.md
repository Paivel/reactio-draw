# Installing the reactio-draw skill

The skill is the folder `reactio-draw/` with `SKILL.md` (in the repository: `skills/reactio-draw`). Reactio Draw itself must be installed
(`/Applications/Reactio Draw.app`), and its MCP server added to the client.

## Claude Code

Copy the folder to the user skills (all projects) or to one project:

    mkdir -p ~/.claude/skills && cp -R reactio-draw ~/.claude/skills/
    # or: <project>/.claude/skills/reactio-draw

MCP server: `claude mcp add reactio-draw -- "/Applications/Reactio Draw.app/Contents/MacOS/reactio-mcp"`.
Check: `/skills` lists reactio-draw; it loads by itself on chemistry requests.

## Codex

    mkdir -p ~/.codex/skills && cp -R reactio-draw ~/.codex/skills/

MCP server in `~/.codex/config.toml`:

    [mcp_servers.reactio-draw]
    command = "/Applications/Reactio Draw.app/Contents/MacOS/reactio-mcp"

Restart Codex.

## Claude Desktop (claude.ai app)

Zip the folder (`zip -r reactio-draw.zip reactio-draw`), then Settings → Capabilities → Skills → Upload skill.
MCP server: Settings → Developer → Edit Config, in `claude_desktop_config.json`:

    "mcpServers": {"reactio-draw": {"command": "/Applications/Reactio Draw.app/Contents/MacOS/reactio-mcp"}}

Restart the app. In Claude Desktop the command line path works only where the app can run shell commands (Code tab);
in chat the skill uses the MCP tools.

## ChatGPT

Not yet: ChatGPT connects only remote (HTTPS) MCP servers, and Reactio Draw's MCP runs locally. In ChatGPT the skill
would be text without tools. Use Codex (above), which runs the local MCP server and draws on the open sheet.
