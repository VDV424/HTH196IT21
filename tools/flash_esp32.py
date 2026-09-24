import subprocess
import json
import sys

ARDUINO_CLI = r"C:\Program Files\Arduino CLI\arduino-cli.exe"
GATEWAY_SKETCH = r"hardware\esp32_gateway\esp32_gateway.ino"

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
    print("  TRIAGEPULSE -- ESP GATEWAY FIRMWARE FLASHER (ESP8266 / ESP32)")
    print("=" * 65)

    ports = get_ports()
    target_port = None
    for p in ports:
        port_addr = p.get("port", {}).get("address", "")
        hw_id = p.get("port", {}).get("hardware_id", "").lower()
        label = p.get("port", {}).get("protocol_label", "")
        print(f"  Found Port: {port_addr} | Label: {label} | HW: {hw_id}")
        
        if "10c4" in hw_id or "cp210" in hw_id or port_addr.upper() == "COM10":
            target_port = port_addr
            break

    if not target_port and len(ports) > 0:
        target_port = ports[-1].get("port", {}).get("address")
        print(f"  Selecting available port: {target_port}")

    if not target_port:
        print("\n[!] No serial COM port found.")
        print("    Please connect the ESP board via USB.")
        return 1

    # First compile for ESP8266 (primary target), with ESP32 fallback
    fqbn = "esp8266:esp8266:nodemcuv2"
    print(f"\n[1/2] Compiling Gateway firmware for {fqbn}...")
    comp = subprocess.run([ARDUINO_CLI, "compile", "--fqbn", fqbn, GATEWAY_SKETCH])
    if comp.returncode != 0:
        print("  Retrying with esp32:esp32:esp32...")
        fqbn = "esp32:esp32:esp32"
        comp = subprocess.run([ARDUINO_CLI, "compile", "--fqbn", fqbn, GATEWAY_SKETCH])
        if comp.returncode != 0:
            print("\n[X] Compilation failed!")
            return 1
            
    print(f"  [+] Compilation OK with {fqbn}!")

    print(f"\n[2/2] Uploading to Gateway on {target_port} ({fqbn})...")
    print("    TIP: If upload gets stuck on 'Connecting...', press and HOLD the 'FLASH' button")
    print("         on the NodeMCU board, press 'RST' once, then release 'FLASH' to enter bootloader mode.\n")

    upload_cmd = [
        ARDUINO_CLI, "upload",
        "-p", target_port,
        "--fqbn", fqbn,
        GATEWAY_SKETCH
    ]
    ret = subprocess.run(upload_cmd)
    if ret.returncode == 0:
        print("\n============================================================")
        print(f"[SUCCESS] GATEWAY SUCCESSFULLY FLASHED ON {target_port}!")
        print("============================================================")
        return 0
    else:
        print(f"\n[X] Upload failed on {target_port}.")
        print("    -----------------------------------------------------------")
        print("    ACTION REQUIRED TO ENTER BOOTLOADER ON ESP8266 NODEMCU:")
        print("    1. Press and HOLD the physical 'FLASH' button on the board.")
        print("    2. While holding FLASH, press and release the 'RST' button.")
        print("    3. Release the 'FLASH' button.")
        print("    4. Re-run this flasher script.")
        print("    -----------------------------------------------------------")
        return 1

if __name__ == "__main__":
    sys.exit(main())
