# 🔌 TriagePulse — Hardware Firmware

> **ESP32 Gateway + Arduino UNO Patient Monitor**  
> Complete firmware for the physical IoT patient monitoring prototype

---

## 📦 Folder Structure

```
hardware/
├── README.md                          ← You are here
├── esp32_gateway/
│   ├── esp32_gateway.ino              ← ESP32 main firmware (Patient 01 + Gateway)
│   └── config.h                       ← WiFi, MQTT, pin, calibration config
└── arduino_patient02/
    ├── arduino_patient02.ino          ← Arduino UNO firmware (Patient 02)
    └── config.h                       ← Pin assignments & timing config
```

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PATIENT 01                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────┐  ┌──────┐ │
│  │ MAX30102 │  │ DS18B20  │  │ HX711 +  │  │ SOS │  │Buzzer│ │
│  │ HR+SpO2  │  │  Temp    │  │ LoadCell │  │ Btn │  │      │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──┬──┘  └──┬───┘ │
│       │I2C          │OW           │SPI         │GPIO    │GPIO  │
│  ┌────┴─────────────┴─────────────┴────────────┴────────┴───┐  │
│  │                    ESP32 DevKit                          │  │
│  │              (Patient 01 Direct Sensors)                 │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                         │ Serial2 RX (GPIO16)                  │
└─────────────────────────┼──────────────────────────────────────┘
                          │ UART (9600 baud)
                          │ ← Voltage Divider (5V→3.3V)
┌─────────────────────────┼──────────────────────────────────────┐
│                         │ Serial TX (D1)                       │
│  ┌────┴─────────────────┴─────────────────────────────────┐    │
│  │                  Arduino UNO                           │    │
│  │             (Patient 02 Sensors)                       │    │
│  └────┬─────────────┬─────────────┬────────────┬────┬────┘    │
│       │I2C          │OW           │Digital      │D7  │D8      │
│  ┌────┴─────┐  ┌────┴─────┐  ┌───┴──────┐  ┌──┴──┐ ┌┴─────┐ │
│  │ MAX30102 │  │ DS18B20  │  │ HX711 +  │  │ SOS │ │Buzzer│ │
│  │ HR+SpO2  │  │  Temp    │  │ LoadCell │  │ Btn │ │      │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────┘ └──────┘ │
│                        PATIENT 02                             │
└───────────────────────────────────────────────────────────────┘
                          │
                     ESP32 WiFi
                          │
                    ┌─────┴─────┐
                    │ Mosquitto │
                    │   MQTT    │
                    │  Broker   │
                    └─────┬─────┘
                          │
                    ┌─────┴─────┐
                    │  FastAPI  │
                    │  Backend  │
                    └─────┬─────┘
                          │
                    ┌─────┴─────┐
                    │   React   │
                    │ Dashboard │
                    └───────────┘
```

---

## 🔧 Wiring Diagrams

### Patient 01 — ESP32 Pin Connections

| Component | Signal | ESP32 Pin | Notes |
|-----------|--------|-----------|-------|
| **MAX30102** | VCC | 3.3V | ⚠️ 3.3V only! |
| | GND | GND | |
| | SDA | **GPIO21** | I2C Data |
| | SCL | **GPIO22** | I2C Clock |
| **DS18B20** | VCC | 3.3V | |
| | GND | GND | |
| | DATA | **GPIO4** | 4.7kΩ pull-up to 3.3V |
| **HX711** | VCC | 3.3V | |
| | GND | GND | |
| | DOUT | **GPIO18** | Data Out |
| | SCK | **GPIO19** | Serial Clock |
| **Load Cell** | Red | HX711 E+ | ⚠️ Check your load cell datasheet |
| | Black | HX711 E- | Wire colours may vary |
| | Green | HX711 A+ | |
| | White | HX711 A- | |
| **SOS Button** | Pin 1 | **GPIO27** | INPUT_PULLUP |
| | Pin 2 | GND | Active LOW when pressed |
| **Buzzer** | + | **GPIO15** | Use transistor if >20mA |
| | - | GND | |

### DS18B20 Pull-Up Resistor

```
        3.3V
         │
      [4.7kΩ]
         │
         ├──────── DS18B20 DATA ──── GPIO4
         │
       DS18B20
```

---

### Patient 02 — Arduino UNO Pin Connections

| Component | Signal | Arduino Pin | Notes |
|-----------|--------|-------------|-------|
| **MAX30102** | VCC | 3.3V | ⚠️ 3.3V from UNO's 3.3V pin |
| | GND | GND | |
| | SDA | **A4** | Fixed I2C on UNO |
| | SCL | **A5** | Fixed I2C on UNO |
| **DS18B20** | VCC | 5V | |
| | GND | GND | |
| | DATA | **D4** | 4.7kΩ pull-up to VCC |
| **HX711** | VCC | 5V | |
| | GND | GND | |
| | DOUT | **D2** | Data Out |
| | SCK | **D3** | Serial Clock |
| **SOS Button** | Pin 1 | **D7** | INPUT_PULLUP |
| | Pin 2 | GND | Active LOW when pressed |
| **Buzzer** | + | **D8** | Use transistor if >20mA |
| | - | GND | |

---

### Arduino UNO → ESP32 UART Connection

**⚠️ CRITICAL: Voltage Level Shifting Required!**

Arduino UNO operates at 5V logic. ESP32 operates at 3.3V logic.  
Connecting Arduino TX directly to ESP32 RX can **damage the ESP32**.

```
                    Arduino UNO                          ESP32
                  ┌─────────────┐                  ┌─────────────┐
                  │             │                  │             │
                  │   TX (D1)  ├────┐              │             │
                  │             │    │              │             │
                  │             │  [10kΩ]           │             │
                  │             │    │              │             │
                  │             │    ├──────────────┤  GPIO16/RX  │
                  │             │    │              │             │
                  │             │  [20kΩ]           │             │
                  │             │    │              │             │
                  │   GND      ├────┴──────────────┤  GND        │
                  │             │                  │             │
                  └─────────────┘                  └─────────────┘

Voltage Divider: V_out = 5V × (20kΩ / (10kΩ + 20kΩ)) = 3.33V ✓
```

**Connection Summary:**
1. Arduino D1 (TX) → **10kΩ resistor** → junction point
2. Junction point → **ESP32 GPIO16 (RX)**
3. Junction point → **20kΩ resistor** → **GND**
4. Arduino GND → ESP32 GND (common ground)

---

## 📚 Required Libraries

### ESP32 (install in Arduino IDE)

| Library | Author | Version | Install Method |
|---------|--------|---------|----------------|
| WiFi | Espressif | Built-in | Included with ESP32 board package |
| PubSubClient | Nick O'Leary | 2.8+ | Library Manager |
| MAX30105 | SparkFun | 1.1+ | Library Manager: "SparkFun MAX3010x" |
| OneWire | Paul Stoffregen | 2.3+ | Library Manager |
| DallasTemperature | Miles Burton | 3.9+ | Library Manager |
| HX711 | Bogdan Necula | 0.7+ | Library Manager: "HX711 Arduino Library" |
| ArduinoJson | Benoit Blanchon | 6.0+ | Library Manager |

### Arduino UNO (install in Arduino IDE)

| Library | Author | Version | Install Method |
|---------|--------|---------|----------------|
| MAX30105 | SparkFun | 1.1+ | Library Manager: "SparkFun MAX3010x" |
| OneWire | Paul Stoffregen | 2.3+ | Library Manager |
| DallasTemperature | Miles Burton | 3.9+ | Library Manager |
| HX711 | Bogdan Necula | 0.7+ | Library Manager: "HX711 Arduino Library" |

> ⚠️ Arduino UNO does NOT use ArduinoJson — JSON is manually formatted to save the 2KB RAM.

---

## ⚡ Quick Start

### Step 1: Install Arduino IDE Board Support

1. Open Arduino IDE → **File → Preferences**
2. In "Additional Board Manager URLs" add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. **Tools → Board → Board Manager** → Search "esp32" → Install **ESP32 by Espressif Systems**

### Step 2: Install Libraries

1. **Sketch → Include Library → Manage Libraries**
2. Search and install each library listed above

### Step 3: Configure WiFi & MQTT

Edit `hardware/esp32_gateway/config.h`:

```c
#define WIFI_SSID     "YourWiFiName"       // ← Change this
#define WIFI_PASSWORD "YourWiFiPassword"   // ← Change this
#define MQTT_BROKER   "192.168.1.100"      // ← Your laptop's IP address
```

### Step 4: Upload Arduino UNO Firmware (Patient 02)

1. **⚠️ Disconnect the UART wire** from Arduino D1 (TX) before uploading
2. Select Board: **Arduino Uno**
3. Select Port: the Arduino's COM port
4. Open `hardware/arduino_patient02/arduino_patient02.ino`
5. Click **Upload**
6. Reconnect the UART wire to D1 after upload

### Step 5: Upload ESP32 Firmware

1. Select Board: **ESP32 Dev Module**
2. Select Port: the ESP32's COM port
3. Open `hardware/esp32_gateway/esp32_gateway.ino`
4. Click **Upload**

### Step 6: Start Mosquitto MQTT Broker

On your laptop (Windows):
```cmd
mosquitto -v
```

Or with a config file:
```cmd
mosquitto -c mosquitto.conf -v
```

### Step 7: Start TriagePulse Backend

```cmd
cd triagepulse/backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Step 8: Verify Data Flow

Open the Serial Monitor for ESP32 (115200 baud) and you should see:
```
[WiFi] Connecting to YourWiFiName... CONNECTED!
[WiFi] IP: 192.168.1.105  RSSI: -45dBm
[MQTT] Connecting to 192.168.1.100:1883... CONNECTED!
[MQTT] P01 Vitals: HR=75 SpO2=98 T=36.7 Q=GOOD
[MQTT] P01 IV: W=450g Rem=425mL Flow=18.5mL/hr St=NORMAL
[UART2] P02: HR=82 SpO2=97 T=36.9 IV=380g SOS=0
```

---

## 🔬 HX711 Load Cell Calibration

The HX711 calibration factor varies per load cell. Follow this procedure:

1. Open `config.h` and set `HX711_CALIBRATION_FACTOR` to `-420.0`
2. Upload firmware and open Serial Monitor
3. Place the load cell on a flat surface with nothing on it
4. The firmware auto-tares on boot (reads zero)
5. Place a **known weight** (e.g., 500g water bottle) on the load cell
6. If the reading shows **higher** than 500g → **decrease** the calibration factor
7. If the reading shows **lower** than 500g → **increase** the calibration factor
8. Repeat until the reading matches the known weight within ±5g

---

## 📡 MQTT Topic Reference

| Topic | Direction | Payload |
|-------|-----------|---------|
| `triagepulse/patient/P01/vitals` | ESP32 → Broker | `{"heart_rate":75,"spo2":98,"temperature":36.7,"signal_quality":"GOOD"}` |
| `triagepulse/patient/P01/iv` | ESP32 → Broker | `{"iv_weight_grams":450,"iv_remaining_ml":425,"iv_flow_ml_hr":18.5,"iv_state":"NORMAL"}` |
| `triagepulse/patient/P01/sos` | ESP32 → Broker | `{"sos":true}` or `{"sos":false}` |
| `triagepulse/patient/P01/status` | ESP32 → Broker | `{"device_id":"ESP32-P01","rssi":-45,"uptime_sec":3600,"ip":"192.168.1.105"}` |
| `triagepulse/patient/P02/vitals` | ESP32 → Broker | `{"heart_rate":82,"spo2":97,"temperature":36.9,"signal_quality":"GOOD"}` |
| `triagepulse/patient/P02/iv` | ESP32 → Broker | `{"iv_weight_grams":380,"iv_remaining_ml":355,"iv_state":"NORMAL"}` |
| `triagepulse/patient/P02/sos` | ESP32 → Broker | `{"sos":true}` or `{"sos":false}` |

---

## 🛡️ Safety Notes

1. **This is an educational prototype** — NOT for clinical use
2. **Voltage levels**: Never connect Arduino 5V signals directly to ESP32 3.3V pins
3. **Load cell**: Does NOT control the IV infusion — it only monitors weight
4. **Buzzer current**: If buzzer draws >20mA, use a transistor driver (NPN + 1kΩ base resistor)
5. **MAX30102 supply**: Always use 3.3V (the onboard regulator accepts up to 5V on some modules)
6. **Common ground**: Arduino GND and ESP32 GND **must** be connected

---

## 🔋 Component List (Bill of Materials)

| # | Component | Qty | For |
|---|-----------|-----|-----|
| 1 | ESP32 DevKit V1 | 1 | Patient 01 + Gateway |
| 2 | Arduino UNO R3 | 1 | Patient 02 |
| 3 | MAX30102 Pulse Oximeter Module | 2 | HR + SpO2 (1 per patient) |
| 4 | DS18B20 Waterproof Temperature Sensor | 2 | Temperature (1 per patient) |
| 5 | 5kg Load Cell | 2 | IV weight (1 per patient) |
| 6 | HX711 Amplifier Module | 2 | Load cell ADC (1 per patient) |
| 7 | Tactile Push Button | 2 | SOS (1 per patient) |
| 8 | Active Buzzer (3.3V/5V) | 2 | Audible alert (1 per patient) |
| 9 | 4.7kΩ Resistor | 2 | DS18B20 pull-up (1 per patient) |
| 10 | 10kΩ Resistor | 1 | UART voltage divider |
| 11 | 20kΩ Resistor | 1 | UART voltage divider |
| 12 | Breadboard (830-point) | 2 | Prototyping (1 per patient) |
| 13 | Jumper Wires (M-M, M-F) | ~40 | Connections |
| 14 | USB Cable (Micro-USB) | 1 | ESP32 power + programming |
| 15 | USB Cable (Type-B) | 1 | Arduino UNO power + programming |

---

## 📄 License

MIT License — Same as the parent TriagePulse project
