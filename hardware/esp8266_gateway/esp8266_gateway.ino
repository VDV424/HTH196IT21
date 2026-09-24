/*
 * ============================================================================
 *  TRIAGEPULSE — ESP8266 GATEWAY FIRMWARE (RECTIFIED & OPTIMIZED)
 *  Patient 01 Direct Monitoring + Patient 02 Arduino UNO SoftwareSerial Gateway
 *  Dual Ingestion: MQTT + Direct FastAPI HTTP REST Telemetry
 * ============================================================================
 *
 *  HARDWARE WIRING (Patient 01 on NodeMCU ESP8266):
 *    - MAX30102 (I2C: SDA=D2/GPIO4, SCL=D1/GPIO5, 3.3V, GND) → HR + SpO2
 *    - DS18B20  (OneWire: D5/GPIO14 with 4.7kΩ pull-up to 3.3V, 3.3V, GND) → Temp
 *    - HX711    (DOUT=D6/GPIO12, SCK=D0/GPIO16, 3.3V, GND) → IV Bag Load Cell
 *    - SOS Button (D3/GPIO0 or Built-in FLASH button, active LOW)
 *    - Buzzer   (D8/GPIO15 positive, GND negative)
 *
 *  UART RECEIVER (Patient 02 from Arduino UNO):
 *    - NodeMCU D7/GPIO13 (SoftwareSerial RX) ← 10k/20k divider from Arduino TX (D1)
 *    - Arduino GND ─── NodeMCU GND
 *
 *  COMMUNICATION PIPELINE:
 *    Primary:   MQTT Broker (Port 1883)
 *    Fallback:  Direct FastAPI REST Endpoint (POST http://<gateway_ip>:8000/api/hardware/telemetry)
 * ============================================================================
 */

#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <ESP8266HTTPClient.h>
#include <PubSubClient.h>
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <OneWire.h>
#include <DallasTemperature.h>
#include "HX711.h"
#include <ArduinoJson.h>
#include <SoftwareSerial.h>

#include "config.h"

// ======================== HARDWARE DRIVERS ========================
MAX30105 particleSensor;
OneWire oneWire(PIN_DS18B20);
DallasTemperature tempSensor(&oneWire);
HX711 scale;
SoftwareSerial unoSerial(PIN_SWSERIAL_RX, PIN_SWSERIAL_TX);

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ======================== HARDWARE DETECTION FLAGS ========================
bool max30102Present = false;
bool ds18b20Present = false;
bool hx711Present = false;

// ======================== PATIENT 01 STATE ========================
struct PatientData {
  float heartRate;
  float spo2;
  float temperature;
  float ivWeightGrams;
  float ivRemainingMl;
  float ivFlowMlHr;
  String ivState;
  bool  sosActive;
  String signalQuality;
  unsigned long lastVitalsTime;
};

PatientData patient01 = {
  0.0, 0.0, 0.0,
  0.0, 0.0, 0.0,
  "NORMAL", false,
  "MISSING", 0
};

// ======================== HEART RATE BUFFER ========================
#define HR_BUFFER_SIZE 4
byte rates[HR_BUFFER_SIZE];
byte rateSpot = 0;
unsigned long lastBeat = 0;
float beatsPerMinute = 0;
int beatAvg = 0;

// ======================== IV FLOW TRACKING ========================
float lastIvWeight = -1.0;
unsigned long lastIvReadTime = 0;

// ======================== SOFTWARE SERIAL BUFFER ========================
String unoSerialBuffer = "";

// ======================== TIMING ========================
unsigned long lastSensorReadTime = 0;
unsigned long lastMqttPublishTime = 0;
unsigned long lastStatusPublishTime = 0;
unsigned long lastSosDebounceTime = 0;
unsigned long bootTime = 0;
bool lastSosButtonState = HIGH;
byte simCounter = 0;

// Forward Declarations
void connectWiFi();
void connectMQTT();
void readMAX30102();
void readDS18B20();
void readHX711();
void checkSOSButton();
void receiveUnoUART();
void parseAndForwardP02(String &jsonStr);
void publishPatient01();
void publishDeviceStatus();
void sendHttpTelemetry(const String& patientId, float hr, float spo2, float temp, float ivWeight, bool sos, const String& sq, const String& ivState, float ivFlow);
void beepBuzzer(int count);
String getBackendHost();


// ============================================================================
//  SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.println(F("========================================"));
  Serial.println(F("  TRIAGEPULSE ESP8266 GATEWAY v2.0"));
  Serial.println(F("  Patient 01 + Patient 02 (Uno) Gateway"));
  Serial.println(F("========================================\n"));

  bootTime = millis();

  // Pin Modes
  pinMode(PIN_SOS_BUTTON, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  // Initialize SoftwareSerial for Arduino Uno (Patient 02)
  unoSerial.begin(SWSERIAL_BAUD);
  Serial.printf("[SoftwareSerial] Listening for Patient 02 on D7 (GPIO%d) at %d baud\n", PIN_SWSERIAL_RX, SWSERIAL_BAUD);

  // Initialize I2C for MAX30102
  Wire.begin(PIN_MAX30102_SDA, PIN_MAX30102_SCL);
  Wire.setClock(100000); // 100kHz standard mode

  // Initialize MAX30102
  Serial.print(F("[MAX30102] Initializing... "));
  if (particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    max30102Present = true;
    Serial.println(F("OK"));
    particleSensor.setup(
      MAX30102_LED_BRIGHTNESS,
      MAX30102_SAMPLE_AVERAGE,
      MAX30102_LED_MODE,
      MAX30102_SAMPLE_RATE,
      MAX30102_PULSE_WIDTH,
      MAX30102_ADC_RANGE
    );
    particleSensor.setPulseAmplitudeRed(0x1F);
    particleSensor.setPulseAmplitudeGreen(0);
  } else {
    Serial.println(F("NOT DETECTED (Using Demo Fallback if enabled)"));
  }

  // Initialize DS18B20
  Serial.print(F("[DS18B20] Initializing... "));
  tempSensor.begin();
  if (tempSensor.getDeviceCount() > 0) {
    ds18b20Present = true;
    tempSensor.setResolution(10); // 10-bit: 0.25°C in ~187ms
    tempSensor.setWaitForConversion(true);
    Serial.println(F("OK"));
  } else {
    Serial.println(F("NOT DETECTED (Using Demo Fallback if enabled)"));
  }

  // Initialize HX711
  Serial.print(F("[HX711] Initializing... "));
  scale.begin(PIN_HX711_DOUT, PIN_HX711_SCK);
  if (scale.is_ready()) {
    hx711Present = true;
    scale.set_scale(HX711_CALIBRATION_FACTOR);
    scale.tare();
    Serial.println(F("OK"));
  } else {
    Serial.println(F("NOT DETECTED (Using Demo Fallback if enabled)"));
  }

  // Connect WiFi
  connectWiFi();

  // Setup MQTT
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setBufferSize(512);
  connectMQTT();

  // Startup beep
  beepBuzzer(2);
  Serial.println(F("\n[READY] TriagePulse ESP8266 Gateway operational.\n"));
}


// ============================================================================
//  MAIN LOOP
// ============================================================================
void loop() {
  yield(); // Prevent ESP8266 Software Watchdog Timer reset

  // Maintain WiFi
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // Maintain MQTT (if broker is reachable)
  if (WiFi.status() == WL_CONNECTED && !mqttClient.connected()) {
    connectMQTT();
  }
  if (mqttClient.connected()) {
    mqttClient.loop();
  }

  unsigned long now = millis();

  // Read Patient 01 sensors
  if (now - lastSensorReadTime >= SENSOR_READ_INTERVAL_MS) {
    lastSensorReadTime = now;
    readMAX30102();
    readDS18B20();
    readHX711();
  }

  // Check SOS Button
  checkSOSButton();

  // Receive Patient 02 data via SoftwareSerial
  receiveUnoUART();

  // Publish / Dispatch Telemetry
  if (now - lastMqttPublishTime >= MQTT_PUBLISH_INTERVAL_MS) {
    lastMqttPublishTime = now;
    publishPatient01();
  }

  // Heartbeat status
  if (now - lastStatusPublishTime >= STATUS_PUBLISH_INTERVAL_MS) {
    lastStatusPublishTime = now;
    publishDeviceStatus();
  }
}


// ============================================================================
//  SENSOR READING FUNCTIONS
// ============================================================================

void readMAX30102() {
  yield();
  if (!max30102Present) {
    if (DEMO_FALLBACK_ENABLED) {
      simCounter++;
      patient01.heartRate = 74.0 + (simCounter % 4);
      patient01.spo2 = 98.0 + ((simCounter % 2) == 0 ? 1 : 0);
      patient01.signalQuality = "SIM";
      patient01.lastVitalsTime = millis();
    }
    return;
  }

  long irValue = particleSensor.getIR();

  if (irValue < FINGER_DETECT_THRESHOLD) {
    patient01.heartRate = 0;
    patient01.spo2 = 0;
    patient01.signalQuality = "MISSING";
    return;
  }

  patient01.signalQuality = "GOOD";

  if (checkForBeat(irValue)) {
    unsigned long delta = millis() - lastBeat;
    lastBeat = millis();

    beatsPerMinute = 60.0 / (delta / 1000.0);

    if (beatsPerMinute >= 35 && beatsPerMinute <= 210) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= HR_BUFFER_SIZE;

      beatAvg = 0;
      for (byte i = 0; i < HR_BUFFER_SIZE; i++) {
        beatAvg += rates[i];
      }
      beatAvg /= HR_BUFFER_SIZE;
    }
  }

  if (beatAvg >= 40 && beatAvg <= 200) {
    patient01.heartRate = (float)beatAvg;
  }

  long redValue = particleSensor.getRed();
  if (irValue > 0 && redValue > 0 && patient01.heartRate > 0) {
    float ratio = (float)redValue / (float)irValue;
    float spo2Est = 110.0 - 25.0 * ratio;
    spo2Est = constrain(spo2Est, 75.0, 100.0);
    patient01.spo2 = spo2Est;
  }

  patient01.lastVitalsTime = millis();
}

void readDS18B20() {
  yield();
  if (ds18b20Present) {
    tempSensor.requestTemperatures();
    float temp = tempSensor.getTempCByIndex(0);
    if (temp >= 20.0 && temp <= 45.0) {
      patient01.temperature = temp;
    }
  } else if (DEMO_FALLBACK_ENABLED && patient01.temperature == 0) {
    patient01.temperature = 36.6;
  }
}

void readHX711() {
  yield();
  float weight = 0;
  if (hx711Present && scale.is_ready()) {
    weight = scale.get_units(2);
    if (weight < 0) weight = 0;
  } else if (DEMO_FALLBACK_ENABLED) {
    weight = 485.0 - (simCounter * 0.4);
    if (weight < 0) weight = 0;
  } else {
    return;
  }

  unsigned long now = millis();
  if (lastIvWeight >= 0 && lastIvReadTime > 0) {
    float timeDeltaHr = (float)(now - lastIvReadTime) / 3600000.0;
    if (timeDeltaHr > 0.0001) {
      float weightDelta = lastIvWeight - weight;
      patient01.ivFlowMlHr = weightDelta / timeDeltaHr;
      if (patient01.ivFlowMlHr < 0) patient01.ivFlowMlHr = 0;
    }
  }

  lastIvWeight = weight;
  lastIvReadTime = now;
  patient01.ivWeightGrams = weight;

  float netFluid = weight - IV_BAG_TARE_WEIGHT_G;
  if (netFluid < 0) netFluid = 0;
  patient01.ivRemainingMl = netFluid;

  if (netFluid <= IV_THRESHOLD_EMPTY) {
    patient01.ivState = "STOPPED";
  } else if (netFluid <= IV_THRESHOLD_NEAR_EMPTY) {
    patient01.ivState = "NEAR_EMPTY";
  } else if (netFluid <= IV_THRESHOLD_LOW) {
    patient01.ivState = "LOW";
  } else {
    patient01.ivState = "NORMAL";
  }
}

void checkSOSButton() {
  bool reading = digitalRead(PIN_SOS_BUTTON);
  unsigned long now = millis();

  if (reading != lastSosButtonState && (now - lastSosDebounceTime) > SOS_DEBOUNCE_MS) {
    lastSosDebounceTime = now;
    lastSosButtonState = reading;

    if (reading == LOW) {
      patient01.sosActive = true;
      Serial.println(F("[SOS] Patient 01 SOS BUTTON PRESSED!"));
      beepBuzzer(3);
      publishPatient01(); // Immediate broadcast
    } else {
      patient01.sosActive = false;
    }
  }
}


// ============================================================================
//  RECEIVE PATIENT 02 DATA FROM ARDUINO UNO VIA SOFTWARE SERIAL
// ============================================================================

void receiveUnoUART() {
  yield();
  while (unoSerial.available()) {
    char c = unoSerial.read();
    if (c == '\n') {
      unoSerialBuffer.trim();
      if (unoSerialBuffer.length() > 5) {
        parseAndForwardP02(unoSerialBuffer);
      }
      unoSerialBuffer = "";
    } else if (c != '\r') {
      unoSerialBuffer += c;
      if (unoSerialBuffer.length() > 300) {
        unoSerialBuffer = "";
      }
    }
  }
}

void parseAndForwardP02(String &jsonStr) {
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, jsonStr);

  if (err) {
    Serial.print(F("[Uno-UART] JSON parse error: "));
    Serial.println(err.f_str());
    return;
  }

  float hr   = doc["hr"]   | 0.0f;
  float spo2 = doc["spo2"] | 0.0f;
  float temp = doc["temp"] | 0.0f;
  float iv   = doc["iv"]   | 0.0f;
  bool  sos  = doc["sos"]  | false;
  const char* sq = doc["sq"] | "GOOD";

  Serial.printf("[Uno-UART] P02: HR=%.0f SpO2=%.0f T=%.1f IV=%.0fg SOS=%d SQ=%s\n",
                hr, spo2, temp, iv, sos, sq);

  float remaining = iv - IV_BAG_TARE_WEIGHT_G;
  if (remaining < 0) remaining = 0;
  String ivState = "NORMAL";
  if (remaining <= IV_THRESHOLD_EMPTY) ivState = "STOPPED";
  else if (remaining <= IV_THRESHOLD_NEAR_EMPTY) ivState = "NEAR_EMPTY";
  else if (remaining <= IV_THRESHOLD_LOW) ivState = "LOW";

  // 1. Forward to MQTT if connected
  if (mqttClient.connected()) {
    StaticJsonDocument<200> vDoc;
    vDoc["heart_rate"] = hr;
    vDoc["spo2"] = spo2;
    vDoc["temperature"] = temp;
    vDoc["signal_quality"] = sq;
    char buf[200];
    serializeJson(vDoc, buf, sizeof(buf));
    mqttClient.publish(TOPIC_P02_VITALS, buf);

    StaticJsonDocument<200> iDoc;
    iDoc["iv_weight_grams"] = iv;
    iDoc["iv_remaining_ml"] = remaining;
    iDoc["iv_state"] = ivState;
    serializeJson(iDoc, buf, sizeof(buf));
    mqttClient.publish(TOPIC_P02_IV, buf);

    StaticJsonDocument<64> sDoc;
    sDoc["sos"] = sos;
    serializeJson(sDoc, buf, sizeof(buf));
    mqttClient.publish(TOPIC_P02_SOS, buf);
  }

  // 2. Direct HTTP Fallback to FastAPI
  if (HTTP_TELEMETRY_ENABLED && WiFi.status() == WL_CONNECTED) {
    sendHttpTelemetry("P02", hr, spo2, temp, iv, sos, sq, ivState, 0.0);
  }
}


// ============================================================================
//  TELEMETRY DISPATCH (MQTT + HTTP DUAL MODE)
// ============================================================================

void publishPatient01() {
  // 1. MQTT Publish (if broker reachable)
  if (mqttClient.connected()) {
    StaticJsonDocument<200> vDoc;
    vDoc["heart_rate"] = patient01.heartRate;
    vDoc["spo2"] = patient01.spo2;
    vDoc["temperature"] = patient01.temperature;
    vDoc["signal_quality"] = patient01.signalQuality;
    char buf[200];
    serializeJson(vDoc, buf, sizeof(buf));
    mqttClient.publish(TOPIC_P01_VITALS, buf);

    StaticJsonDocument<200> iDoc;
    iDoc["iv_weight_grams"] = patient01.ivWeightGrams;
    iDoc["iv_remaining_ml"] = patient01.ivRemainingMl;
    iDoc["iv_flow_ml_hr"] = patient01.ivFlowMlHr;
    iDoc["iv_state"] = patient01.ivState;
    serializeJson(iDoc, buf, sizeof(buf));
    mqttClient.publish(TOPIC_P01_IV, buf);

    StaticJsonDocument<64> sDoc;
    sDoc["sos"] = patient01.sosActive;
    serializeJson(sDoc, buf, sizeof(buf));
    mqttClient.publish(TOPIC_P01_SOS, buf);
  }

  // 2. Direct HTTP Telemetry to FastAPI backend
  if (HTTP_TELEMETRY_ENABLED && WiFi.status() == WL_CONNECTED) {
    sendHttpTelemetry("P01", patient01.heartRate, patient01.spo2,
                      patient01.temperature, patient01.ivWeightGrams,
                      patient01.sosActive, patient01.signalQuality,
                      patient01.ivState, patient01.ivFlowMlHr);
  }

  Serial.printf("[TELEMETRY] P01: HR=%.0f SpO2=%.0f T=%.1f IV=%.0fg SOS=%d SQ=%s\n",
                patient01.heartRate, patient01.spo2, patient01.temperature,
                patient01.ivWeightGrams, patient01.sosActive, patient01.signalQuality.c_str());
}

String getBackendHost() {
  // If connected to Hotspot, gateway IP is usually the host PC (192.168.137.1)
  IPAddress gw = WiFi.gatewayIP();
  if (gw != IPAddress(0, 0, 0, 0)) {
    return gw.toString();
  }
  return String(MQTT_BROKER);
}

void sendHttpTelemetry(const String& patientId, float hr, float spo2, float temp, float ivWeight, bool sos, const String& sq, const String& ivState, float ivFlow) {
  WiFiClient client;
  HTTPClient http;
  String host = getBackendHost();
  String url = String("http://") + host + ":" + String(BACKEND_HTTP_PORT) + BACKEND_HTTP_PATH;

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(1200); // 1.2s timeout so loop never hangs

  StaticJsonDocument<300> doc;
  doc["patient_id"] = patientId;
  doc["heart_rate"] = hr;
  doc["spo2"] = spo2;
  doc["temperature"] = temp;
  doc["iv_weight"] = ivWeight;
  doc["iv_remaining_ml"] = max(0.0f, ivWeight - IV_BAG_TARE_WEIGHT_G);
  doc["iv_state"] = ivState;
  doc["iv_flow"] = ivFlow;
  doc["sos"] = sos;
  doc["signal_quality"] = sq;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    // Ingested successfully into FastAPI backend
  }
  http.end();
}

void publishDeviceStatus() {
  if (!mqttClient.connected()) return;

  unsigned long uptimeSec = (millis() - bootTime) / 1000;
  StaticJsonDocument<200> doc;
  doc["device_id"] = DEVICE_01_ID;
  doc["rssi"] = WiFi.RSSI();
  doc["uptime_sec"] = uptimeSec;
  doc["ip"] = WiFi.localIP().toString();

  char buf[200];
  serializeJson(doc, buf, sizeof(buf));
  mqttClient.publish(TOPIC_P01_STATUS, buf);
}


// ============================================================================
//  WIFI & MQTT CONNECTION
// ============================================================================

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < WIFI_MAX_RETRIES) {
    delay(WIFI_RETRY_DELAY);
    Serial.print(".");
    retries++;
    yield();
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F(" CONNECTED!"));
    Serial.printf("[WiFi] IP: %s  RSSI: %ddBm  Gateway: %s\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI(),
                  WiFi.gatewayIP().toString().c_str());
    beepBuzzer(1);
  } else {
    Serial.println(F(" FAILED! Will retry in background..."));
  }
}

void connectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;

  String broker = getBackendHost();
  Serial.printf("[MQTT] Connecting to %s:%d... ", broker.c_str(), MQTT_PORT);
  mqttClient.setServer(broker.c_str(), MQTT_PORT);

  bool connected = false;
  if (strlen(MQTT_USER) > 0) {
    connected = mqttClient.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS);
  } else {
    connected = mqttClient.connect(MQTT_CLIENT_ID);
  }

  if (connected) {
    Serial.println(F("CONNECTED!"));
    beepBuzzer(2);
  } else {
    Serial.printf("FAILED (rc=%d). Direct HTTP REST telemetry active.\n", mqttClient.state());
  }
}


// ============================================================================
//  BUZZER (COMPATIBLE WITH ACTIVE AND PASSIVE PIEZO BUZZERS)
// ============================================================================

void beepBuzzer(int count) {
  for (int i = 0; i < count; i++) {
    tone(PIN_BUZZER, 2400, BUZZER_DURATION_MS);
    delay(BUZZER_DURATION_MS);
    noTone(PIN_BUZZER);
    if (i < count - 1) delay(100);
    yield();
  }
}
