@echo off
title Parkwise Local Server
cd /d "%~dp0"
py --version >nul 2>&1
if errorlevel 1 (
  echo Python was not found. Install Python 3 from https://www.python.org/downloads/
  echo During installation, enable "Add Python to PATH".
  pause
  exit /b 1
)
echo Starting Parkwise local website and parking-data proxy...
py server.py
pause
