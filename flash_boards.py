import subprocess
import json
import sys
import time

ARDUINO_CLI = r"C:\Program Files\Arduino CLI\arduino-cli.exe"
UNO_SKETCH = r"hardware\arduino_patient02\arduino_patient02.ino"
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
    print("=" * 60)
    print("TRIAGEPULSE — AUTO FIRMWARE FLASHER")
    print("=" * 60)
    
    ports = get_connected_boards()
    if not ports:
        print("\n[!] No serial boards detected yet.")
        print("    Please run 'install_drivers.bat' as Administrator first.")
        return 1

    uno_port = None
    esp32_port = None

    for p in ports:
        port_address = p.get("port", {}).get("address", "")
        matching_boards = p.get("matching_boards", [])
        protocol_label = p.get("port", {}).get("protocol_label", "")
        hardware_id = p.get("port", {}).get("hardware_id", "").lower()
        
        print(f"Found: {port_address} ({protocol_label}) - Hardware ID: {hardware_id}")
        
        # Check for CH340 (Arduino Uno clone)
        if "1a86" in hardware_id or "ch34" in hardware_id or "uno" in protocol_label.lower():
            uno_port = port_address
        # Check for CP2102 or ESP32
        elif "10c4" in hardware_id or "cp210" in hardware_id or "esp" in protocol_label.lower():
            esp32_port = port_address

    # Fallback if only 2 ports found and not differentiated by ID:
    if len(ports) == 2 and (not uno_port or not esp32_port):
        addresses = [p.get("port", {}).get("address") for p in ports]
        print(f"\nDiscovered 2 ports: {addresses}")
        # Default assignment
        if not uno_port:
            uno_port = addresses[0]
        if not esp32_port:
            esp32_port = addresses[1]

    # Flash Arduino UNO
    if uno_port:
        print(f"\n[1/2] Flashing Arduino UNO Patient 02 on {uno_port}...")
        upload_cmd = [
            ARDUINO_CLI, "upload",
            "-p", uno_port,
            "--fqbn", "arduino:avr:uno",
            UNO_SKETCH
        ]
        ret = subprocess.run(upload_cmd)
        if ret.returncode == 0:
            print(f"  [+] Arduino UNO successfully flashed on {uno_port}!")
        else:
            print(f"  [X] Failed to flash Arduino UNO on {uno_port}")
    else:
        print("\n[!] Arduino UNO COM port not found.")

    # Flash ESP32 Gateway
    if esp32_port:
        print(f"\n[2/2] Flashing ESP32 Gateway on {esp32_port}...")
        upload_cmd = [
            ARDUINO_CLI, "upload",
            "-p", esp32_port,
            "--fqbn", "esp32:esp32:esp32",
            ESP32_SKETCH
        ]
        ret = subprocess.run(upload_cmd)
        if ret.returncode == 0:
            print(f"  [+] ESP32 Gateway successfully flashed on {esp32_port}!")
        else:
            print(f"  [X] Failed to flash ESP32 Gateway on {esp32_port}")
    else:
        print("\n[!] ESP32 Gateway COM port not found.")

    print("\n=" * 60)
    print("Flashing process complete!")
    print("=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main())
