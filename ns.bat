@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set PY_EXE=
if exist "%~dp0python\python.exe" (
    set "PY_EXE=%~dp0python\python.exe"
) else if exist "%~dp0..\..\.venv\Scripts\python.exe" (
    set "PY_EXE=%~dp0..\..\.venv\Scripts\python.exe"
) else (
    set "PY_EXE=python.exe"
)

"%PY_EXE%" "%~dp0server.py" %*
