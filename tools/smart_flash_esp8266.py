import serial
import subprocess
import time
import sys

ARDUINO_CLI = r"C:\Program Files\Arduino CLI\arduino-cli.exe"
ESP_SKETCH = r"hardware\esp8266_gateway\esp8266_gateway.ino"
ESP_PORT = "COM10"
FQBN = "esp8266:esp8266:nodemcuv2"

def main():
    print("=" * 65)
    print("  TRIAGEPULSE -- SMART ESP8266 BOOTLOADER DETECTOR & FLASHER")
    print("=" * 65)
    print(f"\nTarget Board: ESP8266 NodeMCU on {ESP_PORT}")
    print("Sketch      : hardware\\esp8266_gateway\\esp8266_gateway.ino")
    print("\n-------------------------------------------------------------")
    print("  PLEASE DO THIS NOW ON YOUR ESP8266 BOARD:")
    print("  1. Press and HOLD the physical 'FLASH' button.")
    print("  2. Tap the 'RST' button once.")
    print("  3. Keep holding 'FLASH' until flashing starts!")
    print("-------------------------------------------------------------\n")
    print("Listening on COM10 for boot mode (1,X)...")

    detected = False
    t_start = time.time()

    # Listen on COM10 at 74880 baud for bootloader mode
    while time.time() - t_start < 25:
        try:
            s = serial.Serial(ESP_PORT, 74880, timeout=0.3)
            data = s.read(200)
            s.close()
            text = data.decode('ascii', errors='ignore')
            if "boot mode:(1," in text or "boot mode:(1 " in text:
                print("\n[+] DETECTED: ESP8266 is now in BOOTLOADER MODE (1,X)!")
                detected = True
                break
            elif "boot mode:(3," in text:
                print(".", end="", flush=True)
        except Exception:
            pass
        time.sleep(0.2)

    if not detected:
        print("\n[!] Auto-detector timed out waiting for boot mode (1,X).")
        print("    Attempting direct upload anyway...")

    print(f"\n--> Starting upload to {ESP_PORT}...")
    cmd = [
        ARDUINO_CLI, "upload",
        "-p", ESP_PORT,
        "--fqbn", FQBN,
        ESP_SKETCH
    ]
    res = subprocess.run(cmd)
    if res.returncode == 0:
        print("\n============================================================")
        print("  [+] ESP8266 GATEWAY SUCCESSFULLY FLASHED!")
        print("============================================================")
        return 0
    else:
        print("\n[X] Upload did not complete. Try holding FLASH button continuously.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
