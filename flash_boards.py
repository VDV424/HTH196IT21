import subprocess
import json
import sys
import time

ARDUINO_CLI = r"C:\Program Files\Arduino CLI\arduino-cli.exe"
UNO_SKETCH = r"hardware\arduino_patient02\arduino_patient02.ino"
ESP8266_SKETCH = r"hardware\esp8266_gateway\esp8266_gateway.ino"
ESP32_SKETCH = r"hardware\esp32_gateway\esp32_gateway.ino"

def get_connected_boards():
    cmd = [ARDUINO_CLI, "board", "list", "--format", "json"]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(res.stdout)
        detected = data.get("detected_ports", [])
        return detected
    except Exception as e:
        print(f"Error querying boards: {e}")
        return []

def main():
    print("=" * 65)
    print("  TRIAGEPULSE -- SMART MULTI-BOARD FIRMWARE FLASHER")
    print("  Supports: Arduino Uno (P02) + ESP8266 / ESP32 Gateway (P01)")
    print("=" * 65)
    
    ports = get_connected_boards()
    if not ports:
        print("\n[!] No serial boards detected yet.")
        print("    Please connect your Arduino UNO and ESP8266/ESP32 via USB.")
        return 1

    uno_port = None
    esp_port = None

    for p in ports:
        port_address = p.get("port", {}).get("address", "")
        matching_boards = p.get("matching_boards", [])
        protocol_label = p.get("port", {}).get("protocol_label", "")
        hardware_id = p.get("port", {}).get("hardware_id", "").lower()
        
        print(f"Found: {port_address} ({protocol_label}) - Hardware ID: {hardware_id}")
        
        # Check for CH340 (Arduino Uno clone) or port COM9
        if "1a86" in hardware_id or "ch34" in hardware_id or port_address.upper() == "COM9":
            uno_port = port_address
        # Check for CP2102 or ESP or port COM10
        elif "10c4" in hardware_id or "cp210" in hardware_id or port_address.upper() == "COM10":
            esp_port = port_address

    # Fallback if 2 ports detected
    if len(ports) >= 2 and (not uno_port or not esp_port):
        addresses = [p.get("port", {}).get("address") for p in ports]
        if not uno_port:
            uno_port = addresses[0]
        if not esp_port:
            esp_port = addresses[1]

    # Flash Arduino UNO
    if uno_port:
        print(f"\n[1/2] Compiling & Flashing Arduino UNO Patient 02 on {uno_port}...")
        comp_uno = subprocess.run([ARDUINO_CLI, "compile", "--fqbn", "arduino:avr:uno", UNO_SKETCH])
        if comp_uno.returncode == 0:
            upload_uno = [
                ARDUINO_CLI, "upload",
                "-p", uno_port,
                "--fqbn", "arduino:avr:uno",
                UNO_SKETCH
            ]
            ret = subprocess.run(upload_uno)
            if ret.returncode == 0:
                print(f"  [+] Arduino UNO successfully flashed on {uno_port}!")
            else:
                print(f"  [X] Failed to flash Arduino UNO on {uno_port}")
                print("      NOTE: Disconnect any jumper wires on Pin D0 (RX) and Pin D1 (TX)")
                print("      during upload, or press the physical RESET button right as upload starts.")
    else:
        print("\n[!] Arduino UNO COM port not found.")

    # Flash ESP8266 Gateway
    if esp_port:
        print(f"\n[2/2] Compiling & Flashing ESP8266 Gateway on {esp_port}...")
        comp_esp = subprocess.run([ARDUINO_CLI, "compile", "--fqbn", "esp8266:esp8266:nodemcuv2", ESP8266_SKETCH])
        if comp_esp.returncode == 0:
            upload_esp = [
                ARDUINO_CLI, "upload",
                "-p", esp_port,
                "--fqbn", "esp8266:esp8266:nodemcuv2",
                ESP8266_SKETCH
            ]
            ret = subprocess.run(upload_esp)
            if ret.returncode == 0:
                print(f"  [+] ESP8266 Gateway successfully flashed on {esp_port}!")
            else:
                print(f"  [X] Upload failed on {esp_port}.")
                print("      NOTE: Hold down the 'FLASH' button on the NodeMCU board,")
                print("      press 'RST', release 'FLASH', then re-run to enter bootloader.")
    else:
        print("\n[!] ESP Gateway COM port not found.")

    print("\n" + "=" * 65)
    print("Flashing sequence completed.")
    print("=" * 65)
    return 0

if __name__ == "__main__":
    sys.exit(main())
