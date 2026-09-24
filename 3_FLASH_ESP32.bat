@echo off
title Flashing ESP32 Gateway
echo ========================================================
echo Flashing ESP32 Gateway (Patient 01) Firmware
echo ========================================================
python "%~dp0tools\flash_esp32.py"
pause
