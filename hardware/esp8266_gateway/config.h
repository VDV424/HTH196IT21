/*
 * ============================================================================
 *  TRIAGEPULSE — ESP8266 GATEWAY CONFIG
 *  Configuration for NodeMCU v2 / D1 Mini / Generic ESP8266
 *  WiFi Hotspot, MQTT, Direct HTTP Telemetry, Pins, and Calibration
 * ============================================================================
 */

#ifndef CONFIG_H
#define CONFIG_H

// ======================== WIFI CONFIGURATION ========================
#define WIFI_SSID          "abcd"                 // Hotspot SSID
#define WIFI_PASSWORD      "12345678"             // Hotspot password
#define WIFI_RETRY_DELAY   500                    // ms between WiFi retries
#define WIFI_MAX_RETRIES   40                     // Max WiFi connection attempts

// ======================== MQTT CONFIGURATION ========================
// Default host IP (Laptop Hotspot is usually 192.168.137.1 or LAN 10.10.53.125)
#define MQTT_BROKER        "192.168.137.1"        
#define MQTT_PORT          1883
#define MQTT_CLIENT_ID     "ESP8266_GATEWAY"
#define MQTT_USER          ""                     // Leave empty if no auth
#define MQTT_PASS          ""
#define MQTT_RETRY_DELAY   5000                   // ms between MQTT reconnects

// ======================== HTTP REST DIRECT TELEMETRY ========================
// Direct ingestion into FastAPI backend if MQTT broker is offline
#define HTTP_TELEMETRY_ENABLED  true
#define BACKEND_HTTP_PORT       8000
#define BACKEND_HTTP_PATH       "/api/hardware/telemetry"
#define DEMO_FALLBACK_ENABLED   true

// ======================== PATIENT IDs ========================
#define PATIENT_01_ID      "P01"
#define PATIENT_02_ID      "P02"
#define DEVICE_01_ID       "ESP8266-P01"
#define DEVICE_02_ID       "UNO-P02"

// ======================== MQTT TOPICS ========================
// Patient 01 (local ESP8266 sensors)
#define TOPIC_P01_VITALS   "triagepulse/patient/P01/vitals"
#define TOPIC_P01_IV       "triagepulse/patient/P01/iv"
#define TOPIC_P01_SOS      "triagepulse/patient/P01/sos"
#define TOPIC_P01_STATUS   "triagepulse/patient/P01/status"

// Patient 02 (Arduino UNO via SoftwareSerial)
#define TOPIC_P02_VITALS   "triagepulse/patient/P02/vitals"
#define TOPIC_P02_IV       "triagepulse/patient/P02/iv"
#define TOPIC_P02_SOS      "triagepulse/patient/P02/sos"
#define TOPIC_P02_STATUS   "triagepulse/patient/P02/status"

// ======================== ESP8266 / NODEMCU PINOUT (Patient 01) ========================
// MAX30102 Pulse Oximeter (I2C)
#define PIN_MAX30102_SDA   4    // NodeMCU D2 (GPIO4)
#define PIN_MAX30102_SCL   5    // NodeMCU D1 (GPIO5)

// DS18B20 Temperature Sensor (OneWire)
#define PIN_DS18B20        14   // NodeMCU D5 (GPIO14) — 4.7kΩ pull-up to 3.3V

// HX711 Load Cell Amplifier (IV Weight)
#define PIN_HX711_DOUT     12   // NodeMCU D6 (GPIO12)
#define PIN_HX711_SCK      16   // NodeMCU D0 (GPIO16)

// SOS Push Button (GPIO0 is wired to physical FLASH button on NodeMCU!)
#define PIN_SOS_BUTTON     0    // NodeMCU D3 (GPIO0) — active LOW with internal pullup

// Buzzer
#define PIN_BUZZER         15   // NodeMCU D8 (GPIO15)

// ======================== SOFTWARE SERIAL FOR PATIENT 02 (Arduino UNO) ========================
// Connect Arduino UNO TX (Pin D1) via 10k/20k voltage divider to NodeMCU D7
#define PIN_SWSERIAL_RX    13   // NodeMCU D7 (GPIO13) — RX from Arduino TX
#define PIN_SWSERIAL_TX    2    // NodeMCU D4 (GPIO2)  — TX to Arduino RX (optional)
#define SWSERIAL_BAUD      9600

// ======================== HX711 CALIBRATION ========================
#define HX711_CALIBRATION_FACTOR  -420.0f
#define HX711_TARE_OFFSET         0

// IV Bag Constants
#define IV_BAG_TARE_WEIGHT_G      25.0f     // Empty bag weight in grams
#define IV_BAG_FULL_VOLUME_ML     500.0f    // Standard IV bag volume

// IV State Thresholds (grams of fluid remaining)
#define IV_THRESHOLD_LOW          100.0f    // Below this = LOW
#define IV_THRESHOLD_NEAR_EMPTY   40.0f     // Below this = NEAR_EMPTY
#define IV_THRESHOLD_EMPTY        10.0f     // Below this = EMPTY/STOPPED

// ======================== TIMING ========================
#define SENSOR_READ_INTERVAL_MS   2000      // Read sensors every 2 seconds
#define MQTT_PUBLISH_INTERVAL_MS  3000      // Publish every 3 seconds
#define STATUS_PUBLISH_INTERVAL_MS 30000    // Device status heartbeat every 30 seconds
#define SOS_DEBOUNCE_MS           300       // SOS button debounce time
#define BUZZER_DURATION_MS        200       // Buzzer beep duration

// ======================== MAX30102 CONFIG ========================
#define MAX30102_LED_BRIGHTNESS   60        // 0-255
#define MAX30102_SAMPLE_AVERAGE   4         // 1, 2, 4, 8, 16, 32
#define MAX30102_LED_MODE         2         // 1=Red only, 2=Red+IR (SpO2)
#define MAX30102_SAMPLE_RATE      100       // 50, 100, 200, 400, 800, 1000, 1600, 3200
#define MAX30102_PULSE_WIDTH      411       // 69, 118, 215, 411
#define MAX30102_ADC_RANGE        4096      // 2048, 4096, 8192, 16384

// Finger detection threshold
#define FINGER_DETECT_THRESHOLD   30000     // IR value below this = no finger

#endif // CONFIG_H
