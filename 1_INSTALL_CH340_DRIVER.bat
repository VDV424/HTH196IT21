@echo off
title CH340 Driver Installer
echo ========================================================
echo Launching CH340 Driver Installer for Arduino UNO
echo ========================================================
echo.
echo Opening installer window... 
echo Please click the blue "INSTALL" button in the window!
echo.
start "" "%~dp0tools\ch341\SETUP.EXE"
echo.
echo If a window pops up asking for permission, click YES.
echo Once it says "Driver install success!", run FLASH_UNO.bat.
echo.
pause
