import subprocess
import json
import sys
import os

ARDUINO_CLI = r"C:\Program Files\Arduino CLI\arduino-cli.exe"
ESP8266_SKETCH = r"hardware\esp8266_gateway\esp8266_gateway.ino"
FQBN = "esp8266:esp8266:nodemcuv2"

def get_ports():
    try:
        res = subprocess.run([ARDUINO_CLI, "board", "list", "--format", "json"], capture_output=True, text=True, check=True)
        data = json.loads(res.stdout)
        return data.get("detected_ports", [])
    except Exception as e:
        print(f"Error querying boards: {e}")
        return []

def main():
    print("=" * 65)
    print("  TRIAGEPULSE -- ESP8266 GATEWAY FIRMWARE FLASHER (NodeMCU/D1)")
    print("=" * 65)

    print("\n[1/2] Compiling ESP8266 Gateway firmware...")
    comp = subprocess.run([ARDUINO_CLI, "compile", "--fqbn", FQBN, ESP8266_SKETCH])
    if comp.returncode != 0:
        print("\n[X] Compilation failed! Review the errors above.")
        return 1
    print("  [+] Compilation OK! (Clean 0 errors)")

    print("\n[2/2] Detecting ESP8266 COM port...")
    ports = get_ports()
    
    target_port = None
    for p in ports:
        port_addr = p.get("port", {}).get("address", "")
        hw_id = p.get("port", {}).get("hardware_id", "").lower()
        label = p.get("port", {}).get("protocol_label", "")
        print(f"  Found Port: {port_addr} | Label: {label} | HW: {hw_id}")
        
        # Look for CP2102 (10c4:ea60), CH340, or known ESP COM10
        if "10c4" in hw_id or "cp210" in hw_id:
            target_port = port_addr
            break

    if not target_port:
        for p in ports:
            if p.get("port", {}).get("address", "").upper() == "COM10":
                target_port = "COM10"
                break

    if not target_port and len(ports) > 0:
        target_port = ports[-1].get("port", {}).get("address")
        print(f"  Selecting available port: {target_port}")

    if not target_port:
        print("\n[!] No serial COM port found.")
        print("    Please connect the ESP8266 board via USB and verify Silicon Labs CP210x or CH340 driver.")
        return 1

    print(f"\n--> Uploading to ESP8266 Gateway on {target_port}...")
    print("    TIP: If upload gets stuck on 'Connecting...', press and HOLD the 'FLASH' button")
    print("         on the NodeMCU board, press 'RST' once, then release 'FLASH' to enter bootloader mode.\n")

    upload_cmd = [
        ARDUINO_CLI, "upload",
        "-p", target_port,
        "--fqbn", FQBN,
        ESP8266_SKETCH
    ]
    ret = subprocess.run(upload_cmd)
    if ret.returncode == 0:
        print(f"\n============================================================")
        print(f"[SUCCESS] ESP8266 GATEWAY SUCCESSFULLY FLASHED ON {target_port}!")
        print(f"============================================================")
        return 0
    else:
        print(f"\n[X] Upload failed on {target_port}.")
        print("    -----------------------------------------------------------")
        print("    ACTION REQUIRED TO ENTER BOOTLOADER ON ESP8266 NODEMCU:")
        print("    1. Press and HOLD the physical 'FLASH' button on the board.")
        print("    2. While holding FLASH, press and release the 'RST' button.")
        print("    3. Release the 'FLASH' button.")
        print("    4. Re-run this flasher script: 3_FLASH_ESP8266.bat")
        print("    -----------------------------------------------------------")
        return 1

if __name__ == "__main__":
    sys.exit(main())
