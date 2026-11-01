@echo off
rem Adds Reactio Draw to Claude Desktop as an MCP server (reactio-mcp.exe beside this file), keeping everything else in
rem its settings. Then tick Info - MCP in Reactio Draw and reopen Claude Desktop. With --remove it takes the entry away.
setlocal
set "exe=%~dp0reactio-mcp.exe"
if not exist "%exe%" ( echo reactio-mcp.exe is not in this folder. & pause & exit /b 1 )
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p = Join-Path $env:APPDATA 'Claude\claude_desktop_config.json';" ^
  "New-Item -ItemType Directory -Force -Path (Split-Path $p) | Out-Null;" ^
  "if (Test-Path $p) { Copy-Item $p ($p + '.before-reactio') -Force; $t = Get-Content -Raw $p } else { $t = '' };" ^
  "if ($t -and $t.Trim()) { $c = $t | ConvertFrom-Json } else { $c = New-Object PSObject };" ^
  "if (-not $c.mcpServers) { $c | Add-Member -NotePropertyName mcpServers -NotePropertyValue (New-Object PSObject) };" ^
  "$c.mcpServers.PSObject.Properties.Remove('reactio-draw');" ^
  "if ('%~1' -ne '--remove') { $c.mcpServers | Add-Member -NotePropertyName 'reactio-draw' -NotePropertyValue ([PSCustomObject]@{ command = '%exe%' }) };" ^
  "[IO.File]::WriteAllText($p, ($c | ConvertTo-Json -Depth 20), (New-Object Text.UTF8Encoding $false))"
if errorlevel 1 ( echo Claude Desktop's settings could not be changed. & pause & exit /b 1 )
if "%~1"=="--remove" ( echo Reactio Draw is removed from Claude Desktop. ) else ( echo Reactio Draw is added to Claude Desktop. Reopen Claude Desktop and tick Info - MCP in Reactio Draw. )
pause
