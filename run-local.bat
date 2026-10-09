@echo off
title Parkwise Server
cd /d "%~dp0"
py --version >nul 2>&1
if errorlevel 1 (
  echo Python 3 was not found. Install it from https://www.python.org/downloads/
  pause
  exit /b 1
)
echo If this is the first launch, set PARKWISE_ADMIN_PASSWORD in your terminal before running this file.
echo The initial Test Administrator is seeded only once.
py server.py
pause
