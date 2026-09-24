/*
 * ============================================================================
 *  TRIAGEPULSE — ESP32 GATEWAY FIRMWARE
 *  Patient 01 Direct Monitoring + Patient 02 Arduino UNO UART Gateway
 * ============================================================================
 *
 *  HARDWARE:
 *    Patient 01 (direct sensors on this ESP32):
 *      - MAX30102 (I2C: SDA=GPIO21, SCL=GPIO22) → Heart Rate + SpO2
 *      - DS18B20  (OneWire: GPIO4, 4.7kΩ pull-up) → Temperature
 *      - HX711   (DOUT=GPIO18, SCK=GPIO19) → IV Bag Weight
 *      - SOS Button (GPIO27, INPUT_PULLUP, active LOW)
 *      - Buzzer  (GPIO15)
 *
 *    Patient 02 (via UART from Arduino UNO):
 *      - ESP32 GPIO16 (RX) receives JSON from Arduino UNO TX
 *      - Arduino TX → 10kΩ+20kΩ voltage divider → ESP32 GPIO16
 *      - Arduino GND → ESP32 GND
 *
 *  COMMUNICATION:
 *    ESP32 → WiFi → Mosquitto MQTT Broker → FastAPI Backend
 *
 *  MQTT TOPICS (published):
 *    triagepulse/patient/P01/vitals   → {heart_rate, spo2, temperature}
 *    triagepulse/patient/P01/iv       → {iv_weight_grams, iv_state}
 *    triagepulse/patient/P01/sos      → {sos: true/false}
 *    triagepulse/patient/P01/status   → {device_id, rssi, uptime_sec}
 *    triagepulse/patient/P02/vitals   → (forwarded from Arduino UNO)
 *    triagepulse/patient/P02/iv       → (forwarded from Arduino UNO)
 *    triagepulse/patient/P02/sos      → (forwarded from Arduino UNO)
 *    triagepulse/patient/P02/status   → (forwarded from Arduino UNO)
 *
 *  REQUIRED LIBRARIES (install via Arduino Library Manager):
 *    1. WiFi              (built-in ESP32)
 *    2. PubSubClient      by Nick O'Leary (MQTT)
 *    3. Wire              (built-in, I2C)
 *    4. MAX30105          by SparkFun (MAX30102 sensor)
 *    5. OneWire           by Paul Stoffregen
 *    6. DallasTemperature by Miles Burton
 *    7. HX711             by Bogdan Necula / Rob Tillaart
 *    8. ArduinoJson       by Benoit Blanchon (v6+)
 *
 *  BOARD:
 *    Select "ESP32 Dev Module" in Arduino IDE
 *    Upload Speed: 115200
 *
 * ============================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <OneWire.h>
#include <DallasTemperature.h>
#include "HX711.h"
#include <ArduinoJson.h>

#include "config.h"

// ======================== GLOBAL OBJECTS ========================
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

MAX30105 particleSensor;             // MAX30102 sensor object
OneWire oneWire(PIN_DS18B20);        // OneWire bus on GPIO4
DallasTemperature tempSensor(&oneWire);
HX711 scale;                         // HX711 load cell

// ======================== PATIENT 01 STATE ========================
struct PatientData {
  float heartRate;
  float spo2;
  float temperature;
  float ivWeightGrams;
  float ivFlowMlHr;
  float ivRemainingMl;
  bool  sosActive;
  String signalQuality;
  String ivState;
  unsigned long lastVitalsTime;
  unsigned long lastIvTime;
};

PatientData patient01 = {0, 0, 0, 0, 0, 0, false, "GOOD", "NORMAL", 0, 0};

// ======================== HR/SpO2 CALCULATION ========================
// Rolling buffer for heart rate calculation
#define HR_BUFFER_SIZE   4
long irBuffer[HR_BUFFER_SIZE];
int  hrBufferIdx = 0;
long lastBeat = 0;
float beatsPerMinute = 0;
int beatAvg = 0;
byte rates[HR_BUFFER_SIZE];
byte rateSpot = 0;

// ======================== IV FLOW TRACKING ========================
float lastIvWeight = -1.0;
unsigned long lastIvReadTime = 0;

// ======================== TIMING ========================
unsigned long lastSensorReadTime = 0;
unsigned long lastMqttPublishTime = 0;
unsigned long lastStatusPublishTime = 0;
unsigned long lastSosDebounceTime = 0;
unsigned long bootTime = 0;
bool lastSosState = HIGH;

// ======================== PATIENT 02 UART BUFFER ========================
String uart2Buffer = "";
bool p02DataReady = false;


// ============================================================================
//  SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println(F("\n===================================="));
  Serial.println(F("  TRIAGEPULSE ESP32 GATEWAY v1.0"));
  Serial.println(F("  Patient 01 + Patient 02 Gateway"));
  Serial.println(F("====================================\n"));

  bootTime = millis();

  // ----- Pin Modes -----
  pinMode(PIN_SOS_BUTTON, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  // ----- I2C for MAX30102 -----
  Wire.begin(PIN_MAX30102_SDA, PIN_MAX30102_SCL);

  // ----- Initialize MAX30102 -----
  Serial.print(F("[MAX30102] Initializing... "));
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println(F("FAILED! Check wiring."));
    // Continue without MAX30102 — will report MISSING signal quality
  } else {
    Serial.println(F("OK"));
    particleSensor.setup(
      MAX30102_LED_BRIGHTNESS,
      MAX30102_SAMPLE_AVERAGE,
      MAX30102_LED_MODE,
      MAX30102_SAMPLE_RATE,
      MAX30102_PULSE_WIDTH,
      MAX30102_ADC_RANGE
    );
    particleSensor.setPulseAmplitudeRed(0x0A);   // Turn Red LED low for indicator
    particleSensor.setPulseAmplitudeGreen(0);     // Turn off Green LED
  }

  // ----- Initialize DS18B20 -----
  Serial.print(F("[DS18B20] Initializing... "));
  tempSensor.begin();
  int sensorCount = tempSensor.getDeviceCount();
  if (sensorCount > 0) {
    Serial.print(F("OK ("));
    Serial.print(sensorCount);
    Serial.println(F(" device(s))"));
    tempSensor.setResolution(12);    // 12-bit resolution (0.0625°C)
    tempSensor.setWaitForConversion(false);  // Non-blocking
  } else {
    Serial.println(F("No devices found! Check wiring."));
  }

  // ----- Initialize HX711 -----
  Serial.print(F("[HX711] Initializing... "));
  scale.begin(PIN_HX711_DOUT, PIN_HX711_SCK);
  if (scale.is_ready()) {
    Serial.println(F("OK"));
    scale.set_scale(HX711_CALIBRATION_FACTOR);
    scale.tare();  // Reset to zero
    Serial.println(F("[HX711] Tared. Place IV bag now."));
  } else {
    Serial.println(F("NOT READY! Check wiring."));
  }

  // ----- Initialize UART2 for Arduino UNO (Patient 02) -----
  Serial2.begin(UART2_BAUD, SERIAL_8N1, PIN_UART2_RX, PIN_UART2_TX);
  Serial.println(F("[UART2] Listening for Patient 02 on GPIO16 at 9600 baud"));

  // ----- Connect WiFi -----
  connectWiFi();

  // ----- Setup MQTT -----
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setBufferSize(512);  // Increase buffer for JSON payloads
  connectMQTT();

  // ----- Startup beep -----
  beepBuzzer(2);
  Serial.println(F("\n[READY] TriagePulse ESP32 Gateway operational.\n"));
}


// ============================================================================
//  MAIN LOOP
// ============================================================================
void loop() {
  // Maintain WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // Maintain MQTT connection
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();

  unsigned long now = millis();

  // ----- Read Patient 01 sensors -----
  if (now - lastSensorReadTime >= SENSOR_READ_INTERVAL_MS) {
    lastSensorReadTime = now;
    readMAX30102();
    readDS18B20();
    readHX711();
  }

  // ----- Check SOS Button -----
  checkSOSButton();

  // ----- Receive Patient 02 data via UART -----
  receiveUART2();

  // ----- Publish to MQTT -----
  if (now - lastMqttPublishTime >= MQTT_PUBLISH_INTERVAL_MS) {
    lastMqttPublishTime = now;
    publishPatient01();
  }

  // ----- Publish device status heartbeat -----
  if (now - lastStatusPublishTime >= STATUS_PUBLISH_INTERVAL_MS) {
    lastStatusPublishTime = now;
    publishDeviceStatus();
  }
}


// ============================================================================
//  SENSOR READING FUNCTIONS
// ============================================================================

void readMAX30102() {
  long irValue = particleSensor.getIR();

  // Check if finger is on sensor
  if (irValue < FINGER_DETECT_THRESHOLD) {
    patient01.heartRate = 0;
    patient01.spo2 = 0;
    patient01.signalQuality = "MISSING";
    return;
  }

  // Detect heartbeat
  if (checkForBeat(irValue)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();

    beatsPerMinute = 60.0 / (delta / 1000.0);

    // Sanity check: valid HR range 30-220 bpm
    if (beatsPerMinute > 20 && beatsPerMinute < 255) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= HR_BUFFER_SIZE;

      // Calculate rolling average
      beatAvg = 0;
      for (byte i = 0; i < HR_BUFFER_SIZE; i++) {
        beatAvg += rates[i];
      }
      beatAvg /= HR_BUFFER_SIZE;
    }
  }

  // Update patient data
  if (beatAvg > 0 && beatAvg < 220) {
    patient01.heartRate = (float)beatAvg;
    patient01.signalQuality = "GOOD";
  }

  // SpO2 estimation (simplified — for accurate SpO2, use SparkFun's algorithm)
  // The MAX30102 provides Red and IR LEDs for ratio-based SpO2 calculation
  long redValue = particleSensor.getRed();
  if (irValue > 0 && redValue > 0) {
    // Simplified R-ratio based SpO2 estimation
    // R = (AC_red / DC_red) / (AC_ir / DC_ir)
    // SpO2 ≈ 110 - 25 * R (linear approximation)
    // For production, use the SparkFun spo2 algorithm library
    float ratio = (float)redValue / (float)irValue;
    float spo2Est = 110.0 - 25.0 * ratio;
    spo2Est = constrain(spo2Est, 70.0, 100.0);

    if (patient01.heartRate > 0) {
      patient01.spo2 = spo2Est;
    }
  }

  patient01.lastVitalsTime = millis();
}

void readDS18B20() {
  tempSensor.requestTemperatures();
  // Since we set non-blocking, the result from the previous request is ready
  float temp = tempSensor.getTempCByIndex(0);

  // Validate: DS18B20 returns -127 on error, valid body temp range 30-45°C
  if (temp > 20.0 && temp < 50.0) {
    patient01.temperature = temp;
  } else if (temp == DEVICE_DISCONNECTED_C) {
    // Sensor disconnected — keep last valid reading
    Serial.println(F("[DS18B20] Sensor disconnected!"));
  }
}

void readHX711() {
  if (!scale.is_ready()) return;

  // Get weight reading (average of 3 samples for stability)
  float weight = scale.get_units(3);
  if (weight < 0) weight = 0;  // Negative weight = tare drift

  // Track IV flow rate
  unsigned long now = millis();
  if (lastIvWeight >= 0 && lastIvReadTime > 0) {
    float timeDeltaHr = (float)(now - lastIvReadTime) / 3600000.0;
    if (timeDeltaHr > 0.0001) {
      float weightDelta = lastIvWeight - weight;  // grams consumed
      // Flow rate in mL/hr (1g water ≈ 1mL)
      patient01.ivFlowMlHr = weightDelta / timeDeltaHr;
      if (patient01.ivFlowMlHr < 0) patient01.ivFlowMlHr = 0;
    }
  }

  lastIvWeight = weight;
  lastIvReadTime = now;

  patient01.ivWeightGrams = weight;

  // Calculate remaining fluid (subtract bag tare weight)
  float netFluid = weight - IV_BAG_TARE_WEIGHT_G;
  if (netFluid < 0) netFluid = 0;
  patient01.ivRemainingMl = netFluid;

  // Determine IV state
  if (netFluid <= IV_THRESHOLD_EMPTY) {
    patient01.ivState = "STOPPED";
  } else if (netFluid <= IV_THRESHOLD_NEAR_EMPTY) {
    patient01.ivState = "NEAR_EMPTY";
  } else if (netFluid <= IV_THRESHOLD_LOW) {
    patient01.ivState = "LOW";
  } else if (patient01.ivFlowMlHr < 1.0 && netFluid > IV_THRESHOLD_LOW) {
    patient01.ivState = "NO_FLOW";
  } else {
    patient01.ivState = "NORMAL";
  }

  patient01.lastIvTime = now;
}


// ============================================================================
//  SOS BUTTON
// ============================================================================

void checkSOSButton() {
  bool currentState = digitalRead(PIN_SOS_BUTTON);
  unsigned long now = millis();

  // Debounce
  if (currentState != lastSosState && (now - lastSosDebounceTime) > SOS_DEBOUNCE_MS) {
    lastSosDebounceTime = now;
    lastSosState = currentState;

    if (currentState == LOW) {
      // Button PRESSED — trigger SOS
      patient01.sosActive = true;
      Serial.println(F("[SOS] *** PATIENT 01 EMERGENCY SOS ACTIVATED ***"));
      beepBuzzer(5);  // 5 rapid beeps for SOS

      // Immediately publish SOS event
      publishSOS(TOPIC_P01_SOS, true);
    } else {
      // Button RELEASED — clear SOS
      patient01.sosActive = false;
      Serial.println(F("[SOS] Patient 01 SOS cleared."));
      publishSOS(TOPIC_P01_SOS, false);
    }
  }
}


// ============================================================================
//  UART2 — RECEIVE PATIENT 02 DATA FROM ARDUINO UNO
// ============================================================================

void receiveUART2() {
  while (Serial2.available()) {
    char c = Serial2.read();

    if (c == '\n') {
      // Complete line received — parse it
      uart2Buffer.trim();
      if (uart2Buffer.length() > 5) {
        parseAndForwardP02(uart2Buffer);
      }
      uart2Buffer = "";
    } else if (c != '\r') {
      uart2Buffer += c;
      // Safety limit to prevent buffer overflow
      if (uart2Buffer.length() > 300) {
        uart2Buffer = "";
      }
    }
  }
}

void parseAndForwardP02(String &jsonStr) {
  /*
   * Expected JSON from Arduino UNO:
   * {"hr":84,"spo2":97,"temp":36.8,"iv":420,"sos":0,"sq":"GOOD"}
   */
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, jsonStr);

  if (err) {
    Serial.print(F("[UART2] JSON parse error: "));
    Serial.println(err.f_str());
    return;
  }

  float hr   = doc["hr"]   | 0.0f;
  float spo2 = doc["spo2"] | 0.0f;
  float temp = doc["temp"] | 0.0f;
  float iv   = doc["iv"]   | 0.0f;
  bool  sos  = doc["sos"]  | false;
  const char* sq = doc["sq"] | "GOOD";

  Serial.printf("[UART2] P02: HR=%.0f SpO2=%.0f T=%.1f IV=%.0fg SOS=%d\n",
                hr, spo2, temp, iv, sos);

  // Forward vitals to MQTT
  {
    StaticJsonDocument<200> vitalsDoc;
    vitalsDoc["heart_rate"] = hr;
    vitalsDoc["spo2"] = spo2;
    vitalsDoc["temperature"] = temp;
    vitalsDoc["signal_quality"] = sq;

    char buf[200];
    serializeJson(vitalsDoc, buf, sizeof(buf));
    mqttClient.publish(TOPIC_P02_VITALS, buf);
  }

  // Forward IV data to MQTT
  {
    float remaining = iv - IV_BAG_TARE_WEIGHT_G;
    if (remaining < 0) remaining = 0;

    String ivState = "NORMAL";
    if (remaining <= IV_THRESHOLD_EMPTY) ivState = "STOPPED";
    else if (remaining <= IV_THRESHOLD_NEAR_EMPTY) ivState = "NEAR_EMPTY";
    else if (remaining <= IV_THRESHOLD_LOW) ivState = "LOW";

    StaticJsonDocument<200> ivDoc;
    ivDoc["iv_weight_grams"] = iv;
    ivDoc["iv_remaining_ml"] = remaining;
    ivDoc["iv_state"] = ivState;

    char buf[200];
    serializeJson(ivDoc, buf, sizeof(buf));
    mqttClient.publish(TOPIC_P02_IV, buf);
  }

  // Forward SOS to MQTT
  {
    StaticJsonDocument<64> sosDoc;
    sosDoc["sos"] = sos;

    char buf[64];
    serializeJson(sosDoc, buf, sizeof(buf));
    mqttClient.publish(TOPIC_P02_SOS, buf);
  }
}


// ============================================================================
//  MQTT PUBLISHING — PATIENT 01
// ============================================================================

void publishPatient01() {
  if (!mqttClient.connected()) return;

  // --- Publish Vitals ---
  {
    StaticJsonDocument<200> doc;
    doc["heart_rate"] = patient01.heartRate;
    doc["spo2"] = patient01.spo2;
    doc["temperature"] = patient01.temperature;
    doc["signal_quality"] = patient01.signalQuality;

    char buf[200];
    serializeJson(doc, buf, sizeof(buf));
    mqttClient.publish(TOPIC_P01_VITALS, buf);

    Serial.printf("[MQTT] P01 Vitals: HR=%.0f SpO2=%.0f T=%.1f Q=%s\n",
                  patient01.heartRate, patient01.spo2,
                  patient01.temperature, patient01.signalQuality.c_str());
  }

  // --- Publish IV ---
  {
    StaticJsonDocument<200> doc;
    doc["iv_weight_grams"] = patient01.ivWeightGrams;
    doc["iv_remaining_ml"] = patient01.ivRemainingMl;
    doc["iv_flow_ml_hr"] = patient01.ivFlowMlHr;
    doc["iv_state"] = patient01.ivState;

    char buf[200];
    serializeJson(doc, buf, sizeof(buf));
    mqttClient.publish(TOPIC_P01_IV, buf);

    Serial.printf("[MQTT] P01 IV: W=%.0fg Rem=%.0fmL Flow=%.1fmL/hr St=%s\n",
                  patient01.ivWeightGrams, patient01.ivRemainingMl,
                  patient01.ivFlowMlHr, patient01.ivState.c_str());
  }

  // --- Publish SOS ---
  {
    StaticJsonDocument<64> doc;
    doc["sos"] = patient01.sosActive;

    char buf[64];
    serializeJson(doc, buf, sizeof(buf));
    mqttClient.publish(TOPIC_P01_SOS, buf);
  }
}

void publishSOS(const char* topic, bool active) {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<64> doc;
  doc["sos"] = active;

  char buf[64];
  serializeJson(doc, buf, sizeof(buf));
  mqttClient.publish(topic, buf);
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

  Serial.printf("[STATUS] RSSI=%ddBm Uptime=%lus IP=%s\n",
                WiFi.RSSI(), uptimeSec, WiFi.localIP().toString().c_str());
}


// ============================================================================
//  WIFI & MQTT CONNECTION
// ============================================================================

void connectWiFi() {
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < WIFI_MAX_RETRIES) {
    delay(WIFI_RETRY_DELAY);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf(" CONNECTED!\n");
    Serial.printf("[WiFi] IP: %s  RSSI: %ddBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
    beepBuzzer(1);
  } else {
    Serial.println(F(" FAILED! Will retry..."));
  }
}

void connectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;

  Serial.printf("[MQTT] Connecting to %s:%d... ", MQTT_BROKER, MQTT_PORT);

  if (strlen(MQTT_USER) > 0) {
    mqttClient.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS);
  } else {
    mqttClient.connect(MQTT_CLIENT_ID);
  }

  if (mqttClient.connected()) {
    Serial.println(F("CONNECTED!"));
    beepBuzzer(2);
  } else {
    Serial.printf("FAILED (rc=%d). Will retry in %ds.\n",
                  mqttClient.state(), MQTT_RETRY_DELAY / 1000);
  }
}


// ============================================================================
//  BUZZER
// ============================================================================

void beepBuzzer(int count) {
  for (int i = 0; i < count; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(BUZZER_DURATION_MS);
    digitalWrite(PIN_BUZZER, LOW);
    if (i < count - 1) delay(BUZZER_DURATION_MS);
  }
}
