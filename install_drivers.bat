@echo off
echo ========================================================
echo Installing USB Drivers for ESP32 and Arduino Uno (CH340)
echo ========================================================

echo.
echo [1/3] Installing Silicon Labs CP2102 driver (for ESP32)...
pnputil.exe /add-driver "%~dp0tools\cp210x\silabser.inf" /install

echo.
echo [2/3] Installing WCH CH340 / CH341 driver (for Arduino Uno)...
pnputil.exe /add-driver "%~dp0tools\ch341\CH341SER.INF" /install

echo.
echo [3/3] Scanning for hardware changes...
pnputil.exe /scan-devices

echo.
echo ========================================================
echo Installation completed! Checking detected COM ports:
echo ========================================================
powershell -Command "[System.IO.Ports.SerialPort]::GetPortNames()"

echo.
echo Done! You can close this window now.
pause
