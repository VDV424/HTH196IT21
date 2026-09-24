# TriagePulse — Hardware Integration Guide (ESP32)

This guide explains how to connect 3 physical ESP32 patient monitoring nodes to TriagePulse.

---

## 1. Supported Physical Patient Slots

TriagePulse pre-reserves 3 dedicated hardware slots:
- **P01**: Bedside Device `ESP32_P01` (Room 101)
- **P02**: Bedside Device `ESP32_P02` (Room 102)
- **P03**: Bedside Device `ESP32_P03` (Room 103)

The dashboard visually tags these patients with the **`PHYSICAL DEVICE`** badge whenever real packets are received.

---

## 2. Hardware Connections

### Sensors:
- **Pulse Oximeter & Heart Rate**: MAX30102 / MAX30100 via I2C (SDA -> GPIO 21, SCL -> GPIO 22).
- **Body Temperature**: DS18B20 / MLX90614 (OneWire -> GPIO 4 with 4.7kΩ pull-up).
- **IV Bag Load Cell**: HX711 Load Cell Amplifier (DT -> GPIO 18, SCK -> GPIO 19).
- **Motion / Accelerometer**: MPU6050 via I2C (address 0x68).

---

## 3. Communication Options

### Option A: Direct HTTP REST Push (No MQTT broker needed)
ESP32 can push periodic telemetry directly to the TriagePulse backend:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* serverUrl = "http://192.168.1.100:8000/api/hardware/telemetry";

void sendTelemetry(float hr, float spo2, float temp, float ivWeight) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<256> doc;
    doc["patient_id"] = "P01";
    doc["device_id"] = "ESP32_P01";
    doc["heart_rate"] = hr;
    doc["spo2"] = spo2;
    doc["temperature"] = temp;
    doc["iv_weight"] = ivWeight;
    doc["signal_quality"] = (hr > 40 && hr < 200) ? "GOOD" : "NOISY";
    doc["motion"] = 0.12;

    String jsonString;
    serializeJson(doc, jsonString);
    int httpResponseCode = http.POST(jsonString);
    http.end();
  }
}
```

### Option B: MQTT Publish via Mosquitto
Configure ESP32 PubSubClient to publish to:
`triagepulse/patient/P01/vitals`
`triagepulse/patient/P01/iv`
`triagepulse/patient/P01/quality`
