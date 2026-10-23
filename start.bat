@echo off
chcp 65001 >nul
cd /d "%~dp0"
start "Salaam School Server" cmd /k "node server.mjs"
timeout /t 2 >nul
start "" http://127.0.0.1:4173
