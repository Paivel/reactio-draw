@echo off
rem Takes Reactio Draw out of Word, PowerPoint and the file types (the program in Files does it); then delete the folder.
set "D=%~dp0Files\"
if not exist "%D%ReactioDraw.exe" if not exist "%D%ReactioDraw-ARM.exe" set "D=%~dp0"
set "EXE=%D%ReactioDraw.exe"
if /i "%PROCESSOR_ARCHITECTURE%"=="ARM64" if exist "%D%ReactioDraw-ARM.exe" set "EXE=%D%ReactioDraw-ARM.exe"
"%EXE%" /unregister
