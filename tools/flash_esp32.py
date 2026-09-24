import subprocess
import json
import sys

ARDUINO_CLI = r"C:\Program Files\Arduino CLI\arduino-cli.exe"
ESP32_SKETCH = r"hardware\esp32_gateway\esp32_gateway.ino"

def get_ports():
    try:
        res = subprocess.run([ARDUINO_CLI, "board", "list", "--format", "json"], capture_output=True, text=True, check=True)
        data = json.loads(res.stdout)
        return data.get("detected_ports", [])
    except Exception as e:
        print(f"Error querying boards: {e}")
        return []

def main():
    print("=" * 60)
    print("TRIAGEPULSE — ESP32 GATEWAY FIRMWARE FLASHER")
    print("=" * 60)

    print("\n[1/2] Compiling ESP32 Gateway firmware...")
    comp = subprocess.run([ARDUINO_CLI, "compile", "--fqbn", "esp32:esp32:esp32", ESP32_SKETCH])
    if comp.returncode != 0:
        print("[X] Compilation failed!")
        return 1
    print("  [+] Compilation OK!")

    print("\n[2/2] Detecting ESP32 COM port...")
    ports = get_ports()
    
    target_port = None
    for p in ports:
        port_addr = p.get("port", {}).get("address", "")
        hw_id = p.get("port", {}).get("hardware_id", "").lower()
        label = p.get("port", {}).get("protocol_label", "")
        print(f"  Found Port: {port_addr} | Label: {label} | HW: {hw_id}")
        
        # Look for CP2102 (10c4:ea60) or ESP32
        if "10c4" in hw_id or "cp210" in hw_id or "esp" in label.lower():
            target_port = port_addr
            break

    if not target_port and len(ports) > 0:
        # Fallback to second or first port
        target_port = ports[-1].get("port", {}).get("address")
        print(f"  Selecting available port: {target_port}")

    if not target_port:
        print("\n[!] No serial COM port found.")
        print("    If CP2102 driver is missing, right-click tools/cp210x/silabser.inf and click 'Install'.")
        return 1

    print(f"\n--> Uploading to ESP32 Gateway on {target_port}...")
    upload_cmd = [
        ARDUINO_CLI, "upload",
        "-p", target_port,
        "--fqbn", "esp32:esp32:esp32",
        ESP32_SKETCH
    ]
    ret = subprocess.run(upload_cmd)
    if ret.returncode == 0:
        print(f"\n============================================================")
        print(f"✅ ESP32 GATEWAY SUCCESSFULLY FLASHED ON {target_port}!")
        print(f"============================================================")
        return 0
    else:
        print(f"\n[X] Upload failed on {target_port}.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
