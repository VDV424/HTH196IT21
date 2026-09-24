@echo off
title TriagePulse - Uploading Firmwares to Both Boards
echo ========================================================
echo Uploading to Arduino UNO (COM9) and ESP8266 (COM10)
echo ========================================================
python "%~dp0tools\upload_both.py"
pause
