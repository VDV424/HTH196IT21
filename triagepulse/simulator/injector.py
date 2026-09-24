#!/usr/bin/env python3
"""
TriagePulse - Hardware Simulator & Scenario Injector
Can inject scenarios and ESP32 telemetry payloads into the running local server.
"""

import sys
import time
import requests

SERVER_URL = "http://localhost:8000"

def inject_scenario(name: str):
    url = f"{SERVER_URL}/api/demo/scenario"
    try:
        res = requests.post(url, json={"scenario_name": name})
        if res.status_code == 200:
            print(f"[OK] Injected scenario: {name}")
        else:
            print(f"[ERR] Failed: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"[ERR] Connection error: {e}")

def push_esp32_telemetry(patient_id: str, hr: float, spo2: float, temp: float, signal_quality: str = "GOOD"):
    url = f"{SERVER_URL}/api/hardware/telemetry"
    payload = {
        "patient_id": patient_id,
        "device_id": f"ESP32_{patient_id}",
        "heart_rate": hr,
        "spo2": spo2,
        "temperature": temp,
        "signal_quality": signal_quality,
        "motion": 0.12,
    }
    try:
        res = requests.post(url, json=payload)
        if res.status_code == 200:
            print(f"[OK] Pushed ESP32 telemetry for {patient_id}: HR={hr}, SpO2={spo2}%, Temp={temp}°C")
        else:
            print(f"[ERR] Failed: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"[ERR] Connection error: {e}")

def main():
    print("=" * 60)
    print("TriagePulse — Hardware Telemetry & Scenario Injector")
    print("Educational / Research Prototype Only")
    print("=" * 60)
    print("Select an option:")
    print("1. Normal Ward (All Stable)")
    print("2. Deterioration Event (P04 & P05)")
    print("3. IV Failure Event (P03 Near Empty, P09 No-Flow)")
    print("4. Multi-Patient Surge (P04, P05, P08, P11, P12)")
    print("5. Sensor Failure (P06 Noisy, P07 Missing, P10 Motion)")
    print("6. Patient Recovery")
    print("7. Push simulated ESP32 hardware packet to P01")
    print("8. Push simulated ESP32 hardware packet to P02")
    print("9. Push simulated ESP32 hardware packet to P03")
    print("0. Exit")
    print("=" * 60)

    if len(sys.argv) > 1:
        choice = sys.argv[1]
    else:
        choice = input("Enter choice (0-9): ").strip()

    if choice == "1":
        inject_scenario("NORMAL")
    elif choice == "2":
        inject_scenario("DETERIORATION")
    elif choice == "3":
        inject_scenario("IV")
    elif choice == "4":
        inject_scenario("SURGE")
    elif choice == "5":
        inject_scenario("SENSOR")
    elif choice == "6":
        inject_scenario("RECOVERY")
    elif choice == "7":
        push_esp32_telemetry("P01", 84.0, 97.5, 36.9)
    elif choice == "8":
        push_esp32_telemetry("P02", 76.0, 98.0, 36.8)
    elif choice == "9":
        push_esp32_telemetry("P03", 92.0, 96.0, 37.1)
    else:
        print("Exiting.")

if __name__ == "__main__":
    main()
