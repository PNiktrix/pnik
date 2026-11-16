@echo off
title Pniktrix 3D Keychain Maker Studio
cd /d "%~dp0"
python keychain_app.py
if errorlevel 1 (
    echo.
    echo *** Error launching app. Make sure Python is installed. ***
    echo Press any key to close...
    pause >nul
)
