@echo off
title Flashing Arduino UNO on COM9
echo ========================================================
echo Flashing Arduino UNO (Patient 02) on COM9
echo ========================================================
echo.
echo NOTE: If you have jumper wires plugged into Pin 0 (RX) or Pin 1 (TX),
echo please UNPLUG them temporarily now so the USB programmer can talk to the board.
echo.
pause
echo.
echo Uploading firmware...
"C:\Program Files\Arduino CLI\arduino-cli.exe" upload -p COM9 --fqbn arduino:avr:uno "%~dp0hardware\arduino_patient02\arduino_patient02.ino"
if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo SUCCESS: Arduino UNO flashed successfully!
    echo You can now plug the Pin 1 (TX) wire back in.
    echo ========================================================
) else (
    echo.
    echo Upload failed. If Pin 0/1 are empty, try pressing the red RESET
    echo button on the Arduino Uno board right when "Uploading..." appears.
)
echo.
pause
