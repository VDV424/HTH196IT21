/*
 * ============================================================================
 *  TRIAGEPULSE — ESP32 GATEWAY CONFIG
 *  Configuration file for WiFi, MQTT, pins, and calibration constants
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
#define MQTT_BROKER        "10.10.53.125"         // Laptop IP on AIML network
#define MQTT_PORT          1883
#define MQTT_CLIENT_ID     "ESP32_GATEWAY"
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
#define DEVICE_01_ID       "ESP32-P01"
#define DEVICE_02_ID       "UNO-P02"

// ======================== MQTT TOPICS ========================
// Patient 01 (local ESP32 sensors)
#define TOPIC_P01_VITALS   "triagepulse/patient/P01/vitals"
#define TOPIC_P01_IV       "triagepulse/patient/P01/iv"
#define TOPIC_P01_SOS      "triagepulse/patient/P01/sos"
#define TOPIC_P01_STATUS   "triagepulse/patient/P01/status"

// Patient 02 (Arduino UNO via UART)
#define TOPIC_P02_VITALS   "triagepulse/patient/P02/vitals"
#define TOPIC_P02_IV       "triagepulse/patient/P02/iv"
#define TOPIC_P02_SOS      "triagepulse/patient/P02/sos"
#define TOPIC_P02_STATUS   "triagepulse/patient/P02/status"

// ======================== ESP32 PIN ASSIGNMENTS (Patient 01) ========================
// MAX30102 Pulse Oximeter (I2C)
#define PIN_MAX30102_SDA   21   // ESP32 GPIO21
#define PIN_MAX30102_SCL   22   // ESP32 GPIO22

// DS18B20 Temperature Sensor (OneWire)
#define PIN_DS18B20        4    // ESP32 GPIO4 (4.7kΩ pull-up to 3.3V)

// HX711 Load Cell Amplifier (IV Weight)
#define PIN_HX711_DOUT     18   // ESP32 GPIO18
#define PIN_HX711_SCK      19   // ESP32 GPIO19

// SOS Push Button
#define PIN_SOS_BUTTON     27   // ESP32 GPIO27 (INPUT_PULLUP, active LOW)

// Buzzer
#define PIN_BUZZER         15   // ESP32 GPIO15

// ======================== UART FOR PATIENT 02 (Arduino UNO) ========================
// ESP32 Serial2 — receives data from Arduino UNO via voltage divider
#define PIN_UART2_RX       16   // ESP32 GPIO16 (RX from Arduino TX via 10kΩ+20kΩ divider)
#define PIN_UART2_TX       17   // ESP32 GPIO17 (TX to Arduino RX — optional)
#define UART2_BAUD         9600

// ======================== HX711 CALIBRATION ========================
// These values MUST be calibrated with your specific load cell!
// Place a known weight (e.g., 500g) and adjust until reading matches.
#define HX711_CALIBRATION_FACTOR  -420.0f   // Adjust during calibration
#define HX711_TARE_OFFSET         0         // Set after tare

// IV Bag Constants
#define IV_BAG_TARE_WEIGHT_G      25.0f     // Empty bag weight in grams
#define IV_BAG_FULL_VOLUME_ML     500.0f    // Standard IV bag volume

// IV State Thresholds (grams of fluid remaining)
#define IV_THRESHOLD_LOW          100.0f    // Below this = LOW
#define IV_THRESHOLD_NEAR_EMPTY   40.0f     // Below this = NEAR_EMPTY
#define IV_THRESHOLD_EMPTY        10.0f     // Below this = EMPTY/STOPPED

// ======================== TIMING ========================
#define SENSOR_READ_INTERVAL_MS   2000      // Read sensors every 2 seconds
#define MQTT_PUBLISH_INTERVAL_MS  3000      // Publish to MQTT every 3 seconds
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

// ======================== SIGNAL QUALITY ========================
// If data is older than this, mark as STALE
#define SIGNAL_STALE_TIMEOUT_MS   10000

#endif // CONFIG_H
