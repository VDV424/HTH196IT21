"""
TriagePulse — Real-Time USB Serial Gateway
Bridges physical Arduino Uno & ESP32 USB serial streams directly
into the local TriagePulse FastAPI backend (http://127.0.0.1:8000).
"""

import sys
import time
import json
import urllib.request
import threading
import serial
import serial.tools.list_ports

BACKEND_URL = "http://127.0.0.1:8000/api/hardware/telemetry"

def send_telemetry(payload: dict):
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(BACKEND_URL, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=2.0) as resp:
            return resp.status == 200
    except Exception as e:
        return False

def listen_port(port_info):
    port = port_info.device
    desc = port_info.description.lower()
    
    # Identify default baud rate and target patient
    baud = 9600 if ("ch34" in desc or "uno" in desc) else 115200
    patient_id = "P02" if ("ch34" in desc or "uno" in desc) else "P01"
    
    print(f"[*] Starting listener on {port} ({port_info.description}) at {baud} baud -> Patient {patient_id}")
    
    try:
        ser = serial.Serial(port, baud, timeout=1.0)
    except Exception as e:
        print(f"[!] Could not open {port}: {e}")
        return

    while True:
        try:
            line = ser.readline().decode("utf-8", errors="ignore").strip()
            if not line:
                continue

            # Check if JSON line
            if line.startswith("{") and line.endswith("}"):
                try:
                    doc = json.loads(line)
                    # Standardize fields
                    payload = {
                        "patient_id": patient_id,
                        "heart_rate": doc.get("hr", doc.get("heart_rate", 0)),
                        "spo2": doc.get("spo2", 0),
                        "temperature": doc.get("temp", doc.get("temperature", 0)),
                        "iv_weight": doc.get("iv", doc.get("iv_weight", 0)),
                        "sos": bool(doc.get("sos", False)),
                        "signal_quality": doc.get("sq", doc.get("signal_quality", "GOOD")),
                    }
                    ok = send_telemetry(payload)
                    status_icon = "🟢" if ok else "🔴"
                    print(f"{status_icon} [{patient_id} via {port}] HR:{payload['heart_rate']} SpO2:{payload['spo2']}% Temp:{payload['temperature']}C IV:{payload['iv_weight']}g SOS:{payload['sos']}")
                except Exception as ex:
                    pass
        except Exception as e:
            print(f"[!] Disconnected from {port}: {e}")
            break

def main():
    print("=" * 65)
    print("   TRIAGEPULSE — USB SERIAL HARDWARE BRIDGE")
    print(f"   Target: {BACKEND_URL}")
    print("=" * 65)

    ports = list(serial.tools.list_ports.comports())
    if not ports:
        print("[!] No COM ports detected. Please plug in boards or install drivers.")
        return 1

    threads = []
    for p in ports:
        t = threading.Thread(target=listen_port, args=(p,), daemon=True)
        t.start()
        threads.append(t)

    print(f"\n[+] Active listeners on {len(threads)} port(s). Press Ctrl+C to exit.\n")
    try:
        while True:
            time.sleep(1.0)
    except KeyboardInterrupt:
        print("\nExiting gateway.")
        return 0

if __name__ == "__main__":
    sys.exit(main())
