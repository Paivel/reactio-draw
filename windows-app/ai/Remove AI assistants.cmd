@echo off
rem Takes the AI add-on out of Reactio Draw (reactio-mcp.exe) and out of Claude Desktop's settings. Reactio Draw stays.
setlocal
set "B="
for /f "tokens=2,*" %%a in ('reg query "HKCU\Software\VB and VBA Program Settings\ReactioDraw\App" /v Folder 2^>nul ^| find "Folder"') do set "B=%%b"
if not defined B set "B=%LOCALAPPDATA%\Programs\Reactio Draw\Files"
if exist "%B%\Connect Claude Desktop.cmd" call "%B%\Connect Claude Desktop.cmd" --remove <nul
del /q "%B%\reactio-mcp.exe" "%B%\Connect Claude Desktop.cmd" 2>nul
echo Done: Reactio Draw has no local API and no MCP now (close and open it again if it is open).
pause
