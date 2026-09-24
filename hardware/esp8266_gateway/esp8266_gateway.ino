/*
 * ============================================================================
 *  TRIAGEPULSE — ESP8266 GATEWAY FIRMWARE (STANDALONE ARDUINO IDE SKETCH)
 *  Board  : NodeMCU 1.0 (ESP-12E Module)
 *  Port   : COM10 (Silicon Labs CP210x)
 *  Speed  : 115200 baud
 * ============================================================================
 *
 *  LIBRARIES REQUIRED IN ARDUINO IDE (Install via Library Manager):
 *    1. PubSubClient                                  (by Nick O'Leary)
 *    2. ArduinoJson                                   (by Benoit Blanchon)
 *    3. SparkFun MAX3010x Pulse and Proximity Sensor  (by SparkFun)
 *    4. DallasTemperature                            (by Miles Burton)
 *    5. OneWire                                       (by Paul Stoffregen)
 *    6. HX711                                         (by Bogdan Necula)
 *
 *  NODEMCU PIN ASSIGNMENTS (Patient 01):
 *    - MAX30102 (I2C)     : SDA = D2 (GPIO4), SCL = D1 (GPIO5)  [3.3V power!]
 *    - DS18B20 (Temp)     : DATA = D5 (GPIO14) with 4.7kΩ pull-up to 3.3V
 *    - HX711 (IV Bag)     : DOUT = D6 (GPIO12), SCK = D0 (GPIO16)
 *    - SOS Button         : D3 (GPIO0) — The on-board physical FLASH button!
 *    - Buzzer             : D8 (GPIO15)
 *    - Uno Serial (P02)   : RX = D7 (GPIO13) from Arduino Uno TX (Pin D1)
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

// ======================== CONFIGURATION CONSTANTS ========================
#define WIFI_SSID               "abcd"
#define WIFI_PASSWORD           "12345678"
#define WIFI_MAX_RETRIES        30

#define MQTT_BROKER_DEFAULT     "192.168.137.1"    // Laptop Hotspot host IP
#define MQTT_PORT               1883
#define MQTT_CLIENT_ID          "ESP8266_GATEWAY"
#define MQTT_USER               ""
#define MQTT_PASS               ""

#define HTTP_TELEMETRY_ENABLED  true
#define BACKEND_HTTP_PORT       8000
#define BACKEND_HTTP_PATH       "/api/hardware/telemetry"
#define DEMO_FALLBACK_ENABLED   true

// Patient IDs
#define PATIENT_01_ID           "P01"
#define PATIENT_02_ID           "P02"
#define DEVICE_01_ID            "ESP8266-P01"

// MQTT Topics
#define TOPIC_P01_VITALS        "triagepulse/patient/P01/vitals"
#define TOPIC_P01_IV            "triagepulse/patient/P01/iv"
#define TOPIC_P01_SOS           "triagepulse/patient/P01/sos"
#define TOPIC_P01_STATUS        "triagepulse/patient/P01/status"
#define TOPIC_P02_VITALS        "triagepulse/patient/P02/vitals"
#define TOPIC_P02_IV            "triagepulse/patient/P02/iv"
#define TOPIC_P02_SOS           "triagepulse/patient/P02/sos"

// Pin Assignments
#define PIN_MAX30102_SDA        4     // NodeMCU D2 (GPIO4)
#define PIN_MAX30102_SCL        5     // NodeMCU D1 (GPIO5)
#define PIN_DS18B20             14    // NodeMCU D5 (GPIO14)
#define PIN_HX711_DOUT          12    // NodeMCU D6 (GPIO12)
#define PIN_HX711_SCK           16    // NodeMCU D0 (GPIO16)
#define PIN_SOS_BUTTON          0     // NodeMCU D3 (GPIO0 / FLASH button)
#define PIN_BUZZER              15    // NodeMCU D8 (GPIO15)
#define PIN_SWSERIAL_RX         13    // NodeMCU D7 (GPIO13 — RX from Uno TX)
#define PIN_SWSERIAL_TX         2     // NodeMCU D4 (GPIO2 — unused TX)
#define SWSERIAL_BAUD           9600

// Calibration Constants
#define HX711_CALIBRATION_FACTOR -420.0f
#define IV_BAG_TARE_WEIGHT_G     25.0f
#define IV_THRESHOLD_LOW         100.0f
#define IV_THRESHOLD_NEAR_EMPTY  40.0f
#define IV_THRESHOLD_EMPTY       10.0f
#define FINGER_DETECT_THRESHOLD  30000

// Intervals
#define SENSOR_READ_INTERVAL_MS  2000
#define MQTT_PUBLISH_INTERVAL_MS 3000
#define STATUS_PUBLISH_INTERVAL_MS 30000
#define SOS_DEBOUNCE_MS          300
#define BUZZER_DURATION_MS       150

// ======================== GLOBAL OBJECTS ========================
MAX30105 particleSensor;
OneWire oneWire(PIN_DS18B20);
DallasTemperature tempSensor(&oneWire);
HX711 scale;
SoftwareSerial unoSerial(PIN_SWSERIAL_RX, PIN_SWSERIAL_TX);

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Hardware Detection Flags
bool max30102Present = false;
bool ds18b20Present = false;
bool hx711Present = false;

// Patient 01 State
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

PatientData patient01 = { 0, 0, 0, 0, 0, 0, "NORMAL", false, "MISSING", 0 };

#define HR_BUFFER_SIZE 4
byte rates[HR_BUFFER_SIZE];
byte rateSpot = 0;
unsigned long lastBeat = 0;
float beatsPerMinute = 0;
int beatAvg = 0;

float lastIvWeight = -1.0;
unsigned long lastIvReadTime = 0;
String unoSerialBuffer = "";

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

  pinMode(PIN_SOS_BUTTON, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  // Initialize SoftwareSerial for Arduino Uno (Patient 02)
  unoSerial.begin(SWSERIAL_BAUD);
  Serial.printf("[SoftwareSerial] Listening for Patient 02 on D7 (GPIO%d) at %d baud\n", PIN_SWSERIAL_RX, SWSERIAL_BAUD);

  // Initialize I2C for MAX30102 with safety check
  Wire.begin(PIN_MAX30102_SDA, PIN_MAX30102_SCL);
  Wire.setClock(100000);

  Serial.print(F("[MAX30102] Checking I2C address 0x57... "));
  Wire.beginTransmission(0x57);
  if (Wire.endTransmission() == 0) {
    if (particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
      max30102Present = true;
      Serial.println(F("OK"));
      particleSensor.setup(60, 4, 2, 100, 411, 4096);
      particleSensor.setPulseAmplitudeRed(0x1F);
      particleSensor.setPulseAmplitudeGreen(0);
    } else {
      Serial.println(F("Init Failed"));
    }
  } else {
    Serial.println(F("NOT DETECTED (Using Demo Fallback)"));
  }

  // Initialize DS18B20
  Serial.print(F("[DS18B20] Checking OneWire sensor... "));
  tempSensor.begin();
  if (tempSensor.getDeviceCount() > 0) {
    ds18b20Present = true;
    tempSensor.setResolution(10);
    tempSensor.setWaitForConversion(true);
    Serial.println(F("OK"));
  } else {
    Serial.println(F("NOT DETECTED (Using Demo Fallback)"));
  }

  // Initialize HX711
  Serial.print(F("[HX711] Checking Load Cell... "));
  scale.begin(PIN_HX711_DOUT, PIN_HX711_SCK);
  if (scale.is_ready()) {
    hx711Present = true;
    scale.set_scale(HX711_CALIBRATION_FACTOR);
    scale.tare();
    Serial.println(F("OK"));
  } else {
    Serial.println(F("NOT DETECTED (Using Demo Fallback)"));
  }

  // Connect WiFi
  connectWiFi();

  // Setup MQTT
  mqttClient.setServer(MQTT_BROKER_DEFAULT, MQTT_PORT);
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
  yield(); // Keep WiFi & ESP8266 Watchdog happy

  // Reconnect WiFi if dropped
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // Reconnect MQTT if needed
  if (WiFi.status() == WL_CONNECTED && !mqttClient.connected()) {
    connectMQTT();
  }
  if (mqttClient.connected()) {
    mqttClient.loop();
  }

  unsigned long now = millis();

  // Read local Patient 01 sensors
  if (now - lastSensorReadTime >= SENSOR_READ_INTERVAL_MS) {
    lastSensorReadTime = now;
    readMAX30102();
    readDS18B20();
    readHX711();
  }

  // Check physical SOS Button (FLASH button)
  checkSOSButton();

  // Read Patient 02 data streamed from Arduino Uno
  receiveUnoUART();

  // Transmit telemetry periodically
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
//  SENSOR READINGS
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
      for (byte i = 0; i < HR_BUFFER_SIZE; i++) beatAvg += rates[i];
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
    patient01.spo2 = constrain(spo2Est, 75.0, 100.0);
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
      patient01.ivFlowMlHr = max(0.0f, weightDelta / timeDeltaHr);
    }
  }

  lastIvWeight = weight;
  lastIvReadTime = now;
  patient01.ivWeightGrams = weight;

  float netFluid = max(0.0f, weight - IV_BAG_TARE_WEIGHT_G);
  patient01.ivRemainingMl = netFluid;

  if (netFluid <= IV_THRESHOLD_EMPTY) patient01.ivState = "STOPPED";
  else if (netFluid <= IV_THRESHOLD_NEAR_EMPTY) patient01.ivState = "NEAR_EMPTY";
  else if (netFluid <= IV_THRESHOLD_LOW) patient01.ivState = "LOW";
  else patient01.ivState = "NORMAL";
}

void checkSOSButton() {
  bool reading = digitalRead(PIN_SOS_BUTTON);
  unsigned long now = millis();

  if (reading != lastSosButtonState && (now - lastSosDebounceTime) > SOS_DEBOUNCE_MS) {
    lastSosDebounceTime = now;
    lastSosButtonState = reading;

    if (reading == LOW) {
      patient01.sosActive = true;
      Serial.println(F("[SOS] Patient 01 SOS BUTTON TRIGGERED!"));
      beepBuzzer(3);
      publishPatient01();
    } else {
      patient01.sosActive = false;
    }
  }
}


// ============================================================================
//  PATIENT 02 RECEIVER (FROM ARDUINO UNO VIA D7)
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
      if (unoSerialBuffer.length() > 300) unoSerialBuffer = "";
    }
  }
}

void parseAndForwardP02(String &jsonStr) {
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, jsonStr);
  if (err) return;

  float hr   = doc["hr"]   | 0.0f;
  float spo2 = doc["spo2"] | 0.0f;
  float temp = doc["temp"] | 0.0f;
  float iv   = doc["iv"]   | 0.0f;
  bool  sos  = doc["sos"]  | false;
  const char* sq = doc["sq"] | "GOOD";

  Serial.printf("[Uno-P02] HR=%.0f SpO2=%.0f T=%.1f IV=%.0fg SOS=%d SQ=%s\n",
                hr, spo2, temp, iv, sos, sq);

  float remaining = max(0.0f, iv - IV_BAG_TARE_WEIGHT_G);
  String ivState = "NORMAL";
  if (remaining <= IV_THRESHOLD_EMPTY) ivState = "STOPPED";
  else if (remaining <= IV_THRESHOLD_NEAR_EMPTY) ivState = "NEAR_EMPTY";
  else if (remaining <= IV_THRESHOLD_LOW) ivState = "LOW";

  // 1. MQTT Dispatch
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

  // 2. Direct FastAPI REST Telemetry
  if (HTTP_TELEMETRY_ENABLED && WiFi.status() == WL_CONNECTED) {
    sendHttpTelemetry("P02", hr, spo2, temp, iv, sos, sq, ivState, 0.0);
  }
}


// ============================================================================
//  TELEMETRY DISPATCH (MQTT + REST)
// ============================================================================

void publishPatient01() {
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

  if (HTTP_TELEMETRY_ENABLED && WiFi.status() == WL_CONNECTED) {
    sendHttpTelemetry("P01", patient01.heartRate, patient01.spo2,
                      patient01.temperature, patient01.ivWeightGrams,
                      patient01.sosActive, patient01.signalQuality,
                      patient01.ivState, patient01.ivFlowMlHr);
  }

  Serial.printf("[P01] HR=%.0f SpO2=%.0f T=%.1f IV=%.0fg SOS=%d SQ=%s\n",
                patient01.heartRate, patient01.spo2, patient01.temperature,
                patient01.ivWeightGrams, patient01.sosActive, patient01.signalQuality.c_str());
}

String getBackendHost() {
  IPAddress gw = WiFi.gatewayIP();
  if (gw != IPAddress(0, 0, 0, 0)) return gw.toString();
  return String(MQTT_BROKER_DEFAULT);
}

void sendHttpTelemetry(const String& patientId, float hr, float spo2, float temp, float ivWeight, bool sos, const String& sq, const String& ivState, float ivFlow) {
  WiFiClient client;
  HTTPClient http;
  String host = getBackendHost();
  String url = String("http://") + host + ":" + String(BACKEND_HTTP_PORT) + BACKEND_HTTP_PATH;

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(1200);

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
  http.POST(jsonPayload);
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
//  WIFI & MQTT
// ============================================================================

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < WIFI_MAX_RETRIES) {
    delay(500);
    Serial.print(".");
    retries++;
    yield();
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F(" CONNECTED!"));
    Serial.printf("[WiFi] IP: %s  Gateway: %s\n",
                  WiFi.localIP().toString().c_str(), WiFi.gatewayIP().toString().c_str());
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
  if (strlen(MQTT_USER) > 0) connected = mqttClient.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS);
  else connected = mqttClient.connect(MQTT_CLIENT_ID);

  if (connected) {
    Serial.println(F("CONNECTED!"));
    beepBuzzer(2);
  } else {
    Serial.printf("FAILED (rc=%d). Direct REST Telemetry Active.\n", mqttClient.state());
  }
}

void beepBuzzer(int count) {
  for (int i = 0; i < count; i++) {
    tone(PIN_BUZZER, 2400, BUZZER_DURATION_MS);
    delay(BUZZER_DURATION_MS);
    noTone(PIN_BUZZER);
    if (i < count - 1) delay(100);
    yield();
  }
}
