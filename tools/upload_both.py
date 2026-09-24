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
    print("  Starting upload...")
    
    cmd = [
        ARDUINO_CLI, "upload",
        "-p", UNO_PORT,
        "--fqbn", "arduino:avr:uno",
        UNO_SKETCH
    ]
    ret = subprocess.run(cmd)
    if ret.returncode == 0:
        print("\n  [+] ARDUINO UNO FLASHED SUCCESSFULLY!\n")
        return True
    else:
        print("\n  [X] Arduino UNO upload failed.")
        return False

def upload_esp():
    print("=" * 65)
    print("  STEP 2: UPLOADING TO ESP8266 GATEWAY (COM10)")
    print("=" * 65)
    print("  NOTE: ESP8266 NodeMCU needs bootloader mode:")
    print("        1. Hold down the 'FLASH' button on the board.")
    print("        2. Press and release the 'RST' button once.")
    print("        3. Release the 'FLASH' button.")
    print("  Starting upload...")

    cmd = [
        ARDUINO_CLI, "upload",
        "-p", ESP_PORT,
        "--fqbn", "esp8266:esp8266:nodemcuv2",
        ESP_SKETCH
    ]
    ret = subprocess.run(cmd)
    if ret.returncode == 0:
        print("\n  [+] ESP8266 GATEWAY FLASHED SUCCESSFULLY!\n")
        return True
    else:
        print("\n  [X] ESP8266 upload failed.")
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
    print(f"  Arduino UNO Result : {'SUCCESS' if uno_ok else 'FAILED (Check RX/TX wires or Reset button)'}")
    print(f"  ESP8266 Result     : {'SUCCESS' if esp_ok else 'FAILED (Hold FLASH + tap RST to retry)'}")
    print("=" * 65)

    if uno_ok and esp_ok:
        return 0
    return 1

if __name__ == "__main__":
    sys.exit(main())
