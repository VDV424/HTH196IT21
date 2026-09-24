import subprocess
import time
import sys

ARDUINO_CLI = r"C:\Program Files\Arduino CLI\arduino-cli.exe"
UNO_SKETCH = r"hardware\arduino_patient02\arduino_patient02.ino"
ESP_SKETCH = r"hardware\esp8266_gateway\esp8266_gateway.ino"

UNO_PORT = "COM9"
ESP_PORT = "COM10"

def upload_uno():
    print("=" * 65)
    print("  STEP 1: UPLOADING TO ARDUINO UNO (COM9)")
    print("=" * 65)
    print("  NOTE: If upload fails with 'not in sync: resp=0x00':")
    print("        1. Unplug any jumper wire from Pin 0 (RX) and Pin 1 (TX).")
    print("        2. Press the red/black RESET button on the UNO right now.")
    print("  Starting upload...\n")
    
    cmd = [
        ARDUINO_CLI, "upload",
        "-p", UNO_PORT,
        "--fqbn", "arduino:avr:uno",
        UNO_SKETCH,
        "-v"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    out = res.stdout + res.stderr
    print(out)
    
    if "avrdude done.  Thank you." in out or (res.returncode == 0 and "not in sync" not in out and "Error:" not in out):
        print("\n  [+] ARDUINO UNO FLASHED SUCCESSFULLY!\n")
        return True
    else:
        print("\n  [X] Arduino UNO upload failed.")
        print("      Troubleshooting: Unplug Pin 0 (RX) and Pin 1 (TX) during upload!")
        return False

def upload_esp():
    print("=" * 65)
    print("  STEP 2: UPLOADING TO ESP8266 GATEWAY (COM10)")
    print("=" * 65)
    print("  NOTE: ESP8266 NodeMCU needs bootloader mode:")
    print("        1. Hold down the 'FLASH' button on the board.")
    print("        2. Press and release the 'RST' button once.")
    print("        3. Release the 'FLASH' button.")
    print("  Starting upload...\n")

    cmd = [
        ARDUINO_CLI, "upload",
        "-p", ESP_PORT,
        "--fqbn", "esp8266:esp8266:nodemcuv2",
        ESP_SKETCH,
        "-v"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    out = res.stdout + res.stderr
    print(out)

    if ("Hash of data verified" in out or "Hard resetting" in out or "Leaving..." in out) and "fatal" not in out.lower():
        print("\n  [+] ESP8266 GATEWAY FLASHED SUCCESSFULLY!\n")
        return True
    else:
        print("\n  [X] ESP8266 upload failed.")
        print("      Troubleshooting: Hold FLASH + tap RST on the NodeMCU board, then retry!")
        return False

def main():
    print("\n" + "#" * 65)
    print("  TRIAGEPULSE -- DUAL BOARD UPLOAD UTILITY")
    print("  Arduino UNO -> COM9 | ESP8266 Gateway -> COM10")
    print("#" * 65 + "\n")

    uno_ok = upload_uno()
    print("-" * 65)
    esp_ok = upload_esp()

    print("\n" + "=" * 65)
    print(f"  Arduino UNO Result : {'SUCCESS' if uno_ok else 'FAILED (Unplug RX/TX wires or press Reset)'}")
    print(f"  ESP8266 Result     : {'SUCCESS' if esp_ok else 'FAILED (Hold FLASH + tap RST to enter bootloader)'}")
    print("=" * 65)

    if uno_ok and esp_ok:
        return 0
    return 1

if __name__ == "__main__":
    sys.exit(main())
