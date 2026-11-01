@echo off
rem Reactio Draw - AI assistants: adds reactio-mcp.exe (the program AI assistants talk to) to the installed Reactio Draw
rem (the download "Reactio Draw" must be installed first) and offers the connection to Claude Desktop. Without this
rem add-on Reactio Draw has no local API and no MCP at all. "Remove AI assistants.cmd" takes it away again.
setlocal
set "K=%~dp0Files"
set "B="
for /f "tokens=2,*" %%a in ('reg query "HKCU\Software\VB and VBA Program Settings\ReactioDraw\App" /v Folder 2^>nul ^| find "Folder"') do set "B=%%b"
if not defined B if exist "%LOCALAPPDATA%\Programs\Reactio Draw\Files\ReactioDraw.exe" set "B=%LOCALAPPDATA%\Programs\Reactio Draw\Files"
if not defined B if exist "%LOCALAPPDATA%\Programs\Reactio Draw\Files\ReactioDraw-ARM.exe" set "B=%LOCALAPPDATA%\Programs\Reactio Draw\Files"
if not defined B ( echo Reactio Draw is not installed: install it first ^(the download "Reactio Draw"^), start it once, then run this again. & pause & exit /b 1 )
if not exist "%B%\ReactioDraw.exe" if not exist "%B%\ReactioDraw-ARM.exe" ( echo Reactio Draw was not found in %B%: start it once from its folder, then run this again. & pause & exit /b 1 )
if not exist "%K%\reactio-mcp.exe" ( echo Files\reactio-mcp.exe is missing: unzip the whole archive again. & pause & exit /b 1 )
copy /y "%K%\reactio-mcp.exe" "%B%\" >nul || ( echo Could not copy reactio-mcp.exe to %B% & pause & exit /b 1 )
copy /y "%K%\Connect Claude Desktop.cmd" "%B%\" >nul
echo reactio-mcp.exe is added to %B%.
if not exist "%APPDATA%\Claude" goto next
choice /c YN /m "Connect Reactio Draw to Claude Desktop"
if errorlevel 2 goto next
call "%B%\Connect Claude Desktop.cmd" <nul
:next
echo.
echo Now, in Reactio Draw (close and open it again if it is open): Info - API:
echo   1. tick MCP;
echo   2. Add a folder... - the folders the assistant may read and write (none until you add one).
echo Then add the skill (folder "Skill for AI assistants", see INSTALL.md there).
pause
