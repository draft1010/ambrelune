@echo off
setlocal
cd /d "%~dp0"
set "AMBRELUNE_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%AMBRELUNE_NODE%" set "AMBRELUNE_NODE=node"
start "" http://localhost:4173
"%AMBRELUNE_NODE%" server.mjs
pause
