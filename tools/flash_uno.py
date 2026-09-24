import subprocess
import json
import sys

ARDUINO_CLI = r"C:\Program Files\Arduino CLI\arduino-cli.exe"
UNO_SKETCH = r"hardware\arduino_patient02\arduino_patient02.ino"

def get_ports():
    try:
        res = subprocess.run([ARDUINO_CLI, "board", "list", "--format", "json"], capture_output=True, text=True, check=True)
        data = json.loads(res.stdout)
        detected = data.get("detected_ports", [])
        return detected
    except Exception as e:
        print(f"Error querying boards: {e}")
        return []

def main():
    print("=" * 60)
    print("TRIAGEPULSE — ARDUINO UNO FIRMWARE FLASHER")
    print("=" * 60)

    # First compile to make sure binary is 100% fresh
    print("\n[1/2] Compiling Arduino Uno firmware...")
    comp = subprocess.run([ARDUINO_CLI, "compile", "--fqbn", "arduino:avr:uno", UNO_SKETCH])
    if comp.returncode != 0:
        print("[X] Compilation failed!")
        return 1
    print("  [+] Compilation OK!")

    print("\n[2/2] Detecting Arduino Uno COM port...")
    ports = get_ports()
    
    target_port = None
    for p in ports:
        port_addr = p.get("port", {}).get("address", "")
        hw_id = p.get("port", {}).get("hardware_id", "").lower()
        label = p.get("port", {}).get("protocol_label", "")
        print(f"  Found Port: {port_addr} | Label: {label} | HW: {hw_id}")
        
        # Check for CH340 or standard Uno VID:PID (2341:0043, 1a86:7523)
        if "1a86" in hw_id or "ch34" in hw_id or "2341" in hw_id or "uno" in label.lower():
            target_port = port_addr
            break

    if not target_port and len(ports) > 0:
        # Fallback to first port
        target_port = ports[0].get("port", {}).get("address")
        print(f"  Selecting first available port: {target_port}")

    if not target_port:
        print("\n[!] No serial COM port found.")
        print("    If you have a CH340 Uno clone, please run CH340_INSTALLER.exe first.")
        return 1

    print(f"\n--> Uploading to Arduino UNO on {target_port}...")
    upload_cmd = [
        ARDUINO_CLI, "upload",
        "-p", target_port,
        "--fqbn", "arduino:avr:uno",
        UNO_SKETCH
    ]
    ret = subprocess.run(upload_cmd)
    if ret.returncode == 0:
        print(f"\n============================================================")
        print(f"✅ ARDUINO UNO SUCCESSFULLY FLASHED ON {target_port}!")
        print(f"============================================================")
        return 0
    else:
        print(f"\n[X] Upload failed on {target_port}.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
