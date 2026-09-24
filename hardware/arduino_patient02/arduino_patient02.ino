/*
 * ============================================================================
 *  TRIAGEPULSE — ARDUINO UNO PATIENT 02 FIRMWARE
 *  Reads sensors and transmits JSON via UART to ESP32 Gateway
 * ============================================================================
 *
 *  HARDWARE:
 *    - MAX30102 (I2C: SDA=A4, SCL=A5) → Heart Rate + SpO2
 *    - DS18B20  (OneWire: D4, 4.7kΩ pull-up to VCC) → Temperature
 *    - HX711   (DOUT=D2, SCK=D3) → IV Bag Weight
 *    - SOS Button (D7, INPUT_PULLUP, active LOW)
 *    - Buzzer  (D8)
 *
 *  COMMUNICATION:
 *    Arduino UNO TX (D1) → 10kΩ+20kΩ voltage divider → ESP32 GPIO16 (RX)
 *    Arduino GND → ESP32 GND
 *
 *    UART sends compact JSON every 3 seconds:
 *    {"hr":84,"spo2":97,"temp":36.8,"iv":420,"sos":0,"sq":"GOOD"}
 *
 *  IMPORTANT:
 *    - Arduino UNO has only 2KB RAM. Code uses F() strings to save RAM.
 *    - JSON is manually formatted (no ArduinoJson) to save flash/RAM.
 *    - Serial (D0/D1) is shared between USB debugging and ESP32 UART.
 *      During normal operation, disconnect USB to avoid data corruption.
 *      For debugging, temporarily disconnect ESP32 UART wire.
 *
 *  REQUIRED LIBRARIES (install via Arduino Library Manager):
 *    1. Wire              (built-in, I2C)
 *    2. MAX30105          by SparkFun (works with MAX30102)
 *    3. OneWire           by Paul Stoffregen
 *    4. DallasTemperature by Miles Burton
 *    5. HX711             by Bogdan Necula / Rob Tillaart
 *
 *  BOARD:
 *    Select "Arduino Uno" in Arduino IDE
 *    Processor: ATmega328P
 *
 * ============================================================================
 */

#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <OneWire.h>
#include <DallasTemperature.h>
#include "HX711.h"

#include "config.h"

// ======================== GLOBAL OBJECTS ========================
MAX30105 particleSensor;
OneWire oneWire(PIN_DS18B20);
DallasTemperature tempSensor(&oneWire);
HX711 scale;

// ======================== SENSOR DATA ========================
float currentHR = 0;
float currentSpO2 = 0;
float currentTemp = 0;
float currentIvWeight = 0;
bool  currentSOS = false;
char  signalQuality[8] = "GOOD";

// ======================== HR CALCULATION ========================
byte rates[HR_BUFFER_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute = 0;
int beatAvg = 0;

// ======================== TIMING ========================
unsigned long lastSensorRead = 0;
unsigned long lastUartSend = 0;
unsigned long lastSosDebounce = 0;
bool lastSosState = HIGH;
bool max30102Found = false;


// ============================================================================
//  SETUP
// ============================================================================
void setup() {
  Serial.begin(UART_BAUD);
  delay(500);

  // ----- Pin Modes -----
  pinMode(PIN_SOS_BUTTON, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  // ----- Initialize MAX30102 -----
  Wire.begin();  // A4=SDA, A5=SCL on UNO
  if (particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    max30102Found = true;
    particleSensor.setup(
      MAX30102_LED_BRIGHTNESS,
      MAX30102_SAMPLE_AVERAGE,
      MAX30102_LED_MODE,
      MAX30102_SAMPLE_RATE,
      MAX30102_PULSE_WIDTH,
      MAX30102_ADC_RANGE
    );
    particleSensor.setPulseAmplitudeRed(0x0A);
    particleSensor.setPulseAmplitudeGreen(0);
  }

  // ----- Initialize DS18B20 -----
  tempSensor.begin();
  if (tempSensor.getDeviceCount() > 0) {
    tempSensor.setResolution(12);
    tempSensor.setWaitForConversion(false);
  }

  // ----- Initialize HX711 -----
  scale.begin(PIN_HX711_DOUT, PIN_HX711_SCK);
  if (scale.is_ready()) {
    scale.set_scale(HX711_CALIBRATION_FACTOR);
    scale.tare();
  }

  // ----- Startup beep -----
  beepBuzzer(2);
}


// ============================================================================
//  MAIN LOOP
// ============================================================================
void loop() {
  unsigned long now = millis();

  // ----- Read sensors periodically -----
  if (now - lastSensorRead >= SENSOR_READ_INTERVAL_MS) {
    lastSensorRead = now;
    readAllSensors();
  }

  // ----- Continuously sample MAX30102 for beat detection -----
  if (max30102Found) {
    sampleHeartbeat();
  }

  // ----- Check SOS button -----
  checkSOS();

  // ----- Send data to ESP32 via UART -----
  if (now - lastUartSend >= UART_SEND_INTERVAL_MS) {
    lastUartSend = now;
    sendDataToESP32();
  }
}


// ============================================================================
//  SENSOR READING
// ============================================================================

void readAllSensors() {
  readTemperature();
  readIVWeight();
}

void sampleHeartbeat() {
  if (!max30102Found) return;

  long irValue = particleSensor.getIR();

  // Check if finger is placed on sensor
  if (irValue < FINGER_DETECT_THRESHOLD) {
    currentHR = 0;
    currentSpO2 = 0;
    strcpy(signalQuality, "MISSING");
    return;
  }

  strcpy(signalQuality, "GOOD");

  // Detect heartbeat
  if (checkForBeat(irValue)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();

    beatsPerMinute = 60.0 / (delta / 1000.0);

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

  if (beatAvg > 0 && beatAvg < 220) {
    currentHR = (float)beatAvg;
  }

  // Simplified SpO2 estimation
  long redValue = particleSensor.getRed();
  if (irValue > 0 && redValue > 0 && currentHR > 0) {
    float ratio = (float)redValue / (float)irValue;
    float spo2Est = 110.0 - 25.0 * ratio;
    if (spo2Est < 70.0) spo2Est = 70.0;
    if (spo2Est > 100.0) spo2Est = 100.0;
    currentSpO2 = spo2Est;
  }
}

void readTemperature() {
  tempSensor.requestTemperatures();
  float temp = tempSensor.getTempCByIndex(0);

  // Validate: DS18B20 returns -127.0 on error
  if (temp > 20.0 && temp < 50.0) {
    currentTemp = temp;
  }
}

void readIVWeight() {
  if (!scale.is_ready()) return;

  float weight = scale.get_units(3);  // Average of 3 readings
  if (weight < 0) weight = 0;

  currentIvWeight = weight;
}


// ============================================================================
//  SOS BUTTON
// ============================================================================

void checkSOS() {
  bool state = digitalRead(PIN_SOS_BUTTON);
  unsigned long now = millis();

  if (state != lastSosState && (now - lastSosDebounce) > SOS_DEBOUNCE_MS) {
    lastSosDebounce = now;
    lastSosState = state;

    if (state == LOW) {
      // Button pressed — SOS activated
      currentSOS = true;
      beepBuzzer(5);  // 5 rapid beeps

      // Send SOS immediately (don't wait for next interval)
      sendDataToESP32();
    } else {
      // Button released — SOS cleared
      currentSOS = false;
    }
  }
}


// ============================================================================
//  UART OUTPUT — SEND JSON TO ESP32 GATEWAY
// ============================================================================

void sendDataToESP32() {
  /*
   * Output format (compact JSON to save bandwidth & memory):
   * {"hr":84,"spo2":97,"temp":36.8,"iv":420,"sos":0,"sq":"GOOD"}
   *
   * The ESP32 gateway receives this on Serial2 (GPIO16) and
   * forwards it to the MQTT broker.
   *
   * NOTE: We build JSON manually (not ArduinoJson) to save
   * precious RAM on the ATmega328P (only 2KB total).
   */

  Serial.print(F("{\"hr\":"));
  Serial.print(currentHR, 0);        // No decimal for HR (saves bytes)
  Serial.print(F(",\"spo2\":"));
  Serial.print(currentSpO2, 0);      // No decimal for SpO2
  Serial.print(F(",\"temp\":"));
  Serial.print(currentTemp, 1);      // 1 decimal for temperature
  Serial.print(F(",\"iv\":"));
  Serial.print(currentIvWeight, 0);  // No decimal for IV weight
  Serial.print(F(",\"sos\":"));
  Serial.print(currentSOS ? 1 : 0);
  Serial.print(F(",\"sq\":\""));
  Serial.print(signalQuality);
  Serial.println(F("\"}"));

  // Serial.println adds \n which the ESP32 uses as line delimiter
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
