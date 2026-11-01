@echo off
rem Installs Reactio Draw for this user: starts the program once (on its first start it registers itself with Word,
rem PowerPoint and the file types; no administrator rights), then offers the Reactio Draw tab in Excel. AI assistants
rem (MCP) are a separate download: Reactio Draw - AI assistants. Keep the "Reactio Draw" folder where it is: Word remembers where the program lives.
setlocal
set "F=%~dp0Files"
set "EXE=%F%\ReactioDraw.exe"
if /i "%PROCESSOR_ARCHITECTURE%"=="ARM64" if exist "%F%\ReactioDraw-ARM.exe" set "EXE=%F%\ReactioDraw-ARM.exe"
if not exist "%EXE%" ( echo The program is not in the folder Files beside this file: unzip the whole archive again. & pause & exit /b 1 )
start "" "%EXE%"
echo Reactio Draw is starting.
echo.
if not exist "%F%\Install Excel tab.cmd" goto done
choice /c YN /m "Add the Reactio Draw tab to Excel"
if errorlevel 2 goto done
call "%F%\Install Excel tab.cmd" <nul
:done
echo.
echo Done. Start Reactio Draw later with Files\ReactioDraw.exe (ReactioDraw-ARM.exe on ARM), or by opening a .reactio file.
pause
