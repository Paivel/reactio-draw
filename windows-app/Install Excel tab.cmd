@echo off
rem Adds the Reactio Draw tab to Excel: "Reactio Draw.xlam" (beside this file) goes into Excel's startup folder, so it
rem opens with Excel in every workbook. Start ReactioDraw.exe once first (the tab finds the program through it).
rem With --remove it takes the tab away. Restart Excel afterwards.
setlocal
set "x=%APPDATA%\Microsoft\Excel\XLSTART"
if "%~1"=="--remove" ( del /q "%x%\Reactio Draw.xlam" 2>nul & echo The Reactio Draw tab is removed from Excel. & pause & exit /b 0 )
if not exist "%~dp0Reactio Draw.xlam" ( echo Reactio Draw.xlam is not in this folder. & pause & exit /b 1 )
if not exist "%x%" mkdir "%x%"
copy /y "%~dp0Reactio Draw.xlam" "%x%\" >nul || ( echo Could not copy the add-in. & pause & exit /b 1 )
echo The Reactio Draw tab is in Excel now (restart Excel if it is open).
pause
