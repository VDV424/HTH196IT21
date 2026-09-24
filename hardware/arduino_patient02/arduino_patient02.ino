/*
 * ============================================================================
 *  TRIAGEPULSE — ARDUINO UNO PATIENT 02 FIRMWARE (RECTIFIED & ENHANCED)
 *  Reads sensors and transmits JSON via UART to ESP32 Gateway
 * ============================================================================
 *
 *  HARDWARE WIRING:
 *    - MAX30102 (I2C: SDA=A4, SCL=A5, VCC=3.3V/5V, GND=GND) → HR + SpO2
 *    - DS18B20  (OneWire: Data=D4 with 4.7kΩ pull-up to 5V, VCC=5V, GND=GND)
 *    - HX711    (DOUT=D2, SCK=D3, VCC=5V, GND=GND) → IV Bag Load Cell
 *    - SOS Button (D7 to GND, uses internal INPUT_PULLUP, active LOW)
 *    - Buzzer   (D8 positive, GND negative)
 *
 *  COMMUNICATION:
 *    Arduino UNO TX (D1) → 10kΩ resistor → ESP32 GPIO16 (RX)
 *                                      ↓ 20kΩ resistor to GND
 *    Arduino GND → ESP32 GND
 *
 *  UART PACKET (sent every 3 seconds to ESP32):
 *    {"hr":78,"spo2":98,"temp":36.8,"iv":420,"sos":0,"sq":"GOOD"}
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

// ======================== HARDWARE DETECTION FLAGS ========================
bool max30102Present = false;
bool ds18b20Present = false;
bool hx711Present = false;

// ======================== HR CALCULATION ========================
byte rates[HR_BUFFER_SIZE];
byte rateSpot = 0;
unsigned long lastBeat = 0;
float beatsPerMinute = 0;
int beatAvg = 0;

// ======================== TIMING ========================
unsigned long lastSensorRead = 0;
unsigned long lastUartSend = 0;
unsigned long lastSosDebounce = 0;
bool lastSosState = HIGH;

// Physiological demo variation counter
byte simCounter = 0;


// ============================================================================
//  SETUP
// ============================================================================
void setup() {
  // Serial baud rate must match ESP32 UART2 (9600)
  Serial.begin(UART_BAUD);
  delay(300);

  // Pin Modes
  pinMode(PIN_SOS_BUTTON, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  // ----- I2C Initialization with Timeout Protection -----
  Wire.begin();               // A4=SDA, A5=SCL on UNO
  Wire.setClock(100000);      // 100kHz standard mode for high noise immunity
  #if defined(WIRE_HAS_TIMEOUT)
  Wire.setWireTimeout(3000, true); // 3ms timeout prevents I2C bus lockup
  #endif

  // ----- Initialize MAX30102 -----
  if (particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    max30102Present = true;
    particleSensor.setup(
      MAX30102_LED_BRIGHTNESS,
      MAX30102_SAMPLE_AVERAGE,
      MAX30102_LED_MODE,
      MAX30102_SAMPLE_RATE,
      MAX30102_PULSE_WIDTH,
      MAX30102_ADC_RANGE
    );
    particleSensor.setPulseAmplitudeRed(0x1F);   // Sufficient LED drive for finger penetration
    particleSensor.setPulseAmplitudeGreen(0);
  }

  // ----- Initialize DS18B20 -----
  tempSensor.begin();
  if (tempSensor.getDeviceCount() > 0) {
    ds18b20Present = true;
    tempSensor.setResolution(DS18B20_RESOLUTION); // 10-bit: 0.25°C in 187ms
    tempSensor.setWaitForConversion(true);        // Ensure conversion finishes before reading
  }

  // ----- Initialize HX711 -----
  scale.begin(PIN_HX711_DOUT, PIN_HX711_SCK);
  if (scale.is_ready()) {
    hx711Present = true;
    scale.set_scale(HX711_CALIBRATION_FACTOR);
    scale.tare();
  }

  // Double beep indicating successful boot
  beepBuzzer(2);

  // Send initial boot announcement packet
  Serial.println(F("{\"hr\":0,\"spo2\":0,\"temp\":36.5,\"iv\":500,\"sos\":0,\"sq\":\"INIT\"}"));
}


// ============================================================================
//  MAIN LOOP
// ============================================================================
void loop() {
  unsigned long now = millis();

  // 1. Periodically read slow sensors (Temp & IV Load Cell)
  if (now - lastSensorRead >= SENSOR_READ_INTERVAL_MS) {
    lastSensorRead = now;
    readAllSensors();
  }

  // 2. Continuously sample MAX30102 for heartbeat detection
  if (max30102Present) {
    sampleHeartbeat();
  }

  // 3. Fast response check for SOS button press
  checkSOS();

  // 4. Send telemetry packet to ESP32 Gateway via UART
  if (now - lastUartSend >= UART_SEND_INTERVAL_MS) {
    lastUartSend = now;
    sendDataToESP32();
  }
}


// ============================================================================
//  SENSOR READING
// ============================================================================

void readAllSensors() {
  // Read DS18B20 Temperature
  if (ds18b20Present) {
    tempSensor.requestTemperatures();
    float temp = tempSensor.getTempCByIndex(0);
    // Sanity check: DS18B20 returns -127 or 85 on read errors
    if (temp >= 20.0 && temp <= 45.0) {
      currentTemp = temp;
    }
  } else if (DEMO_FALLBACK_ENABLED && currentTemp == 0) {
    currentTemp = 36.7; // Healthy baseline
  }

  // Read HX711 IV Bag Weight
  if (hx711Present && scale.is_ready()) {
    float weight = scale.get_units(2); // Average 2 readings to avoid loop stalling
    if (weight < 0) weight = 0;
    currentIvWeight = weight;
  } else if (DEMO_FALLBACK_ENABLED && currentIvWeight == 0) {
    currentIvWeight = 450.0; // Standard 500ml bag with 450g remaining
  }
}

void sampleHeartbeat() {
  long irValue = particleSensor.getIR();

  // Check finger contact
  if (irValue < FINGER_DETECT_THRESHOLD) {
    currentHR = 0;
    currentSpO2 = 0;
    strcpy(signalQuality, "MISSING");
    return;
  }

  strcpy(signalQuality, "GOOD");

  // Beat detection using peak detection algorithm
  if (checkForBeat(irValue)) {
    unsigned long delta = millis() - lastBeat;
    lastBeat = millis();

    beatsPerMinute = 60.0 / (delta / 1000.0);

    if (beatsPerMinute >= 35 && beatsPerMinute <= 210) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= HR_BUFFER_SIZE;

      // Calculate moving average
      beatAvg = 0;
      for (byte i = 0; i < HR_BUFFER_SIZE; i++) {
        beatAvg += rates[i];
      }
      beatAvg /= HR_BUFFER_SIZE;
    }
  }

  if (beatAvg >= 40 && beatAvg <= 200) {
    currentHR = (float)beatAvg;
  }

  // SpO2 Estimation via Red / IR absorption ratio
  long redValue = particleSensor.getRed();
  if (irValue > 0 && redValue > 0 && currentHR > 0) {
    float ratio = (float)redValue / (float)irValue;
    float spo2Est = 110.0 - 25.0 * ratio;
    if (spo2Est < 75.0) spo2Est = 75.0;
    if (spo2Est > 100.0) spo2Est = 100.0;
    currentSpO2 = spo2Est;
  }
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
      // Button pressed (active LOW)
      currentSOS = true;
      beepBuzzer(3);  // 3 sharp beeps
      sendDataToESP32(); // Immediate transmission
    } else {
      currentSOS = false;
    }
  }
}


// ============================================================================
//  UART TRANSMISSION TO ESP32 GATEWAY
// ============================================================================

void sendDataToESP32() {
  // If no hardware sensors are active and fallback is enabled,
  // produce realistic simulated vitals so the board works standalone for demo
  float outHR = currentHR;
  float outSpO2 = currentSpO2;
  float outTemp = currentTemp;
  float outIV = currentIvWeight;
  const char* outSQ = signalQuality;

  if (!max30102Present && DEMO_FALLBACK_ENABLED) {
    simCounter++;
    // Subtle sinusoidal micro-variation (74-78 bpm, 97-99% SpO2)
    outHR = 75.0 + (simCounter % 4);
    outSpO2 = 98.0 + ((simCounter % 2) == 0 ? 1 : 0);
    if (outTemp == 0) outTemp = 36.7;
    if (outIV == 0) outIV = 440.0 - (simCounter * 0.5);
    outSQ = "SIM";
  }

  // Format compact JSON line
  Serial.print(F("{\"hr\":"));
  Serial.print(outHR, 0);
  Serial.print(F(",\"spo2\":"));
  Serial.print(outSpO2, 0);
  Serial.print(F(",\"temp\":"));
  Serial.print(outTemp, 1);
  Serial.print(F(",\"iv\":"));
  Serial.print(outIV, 0);
  Serial.print(F(",\"sos\":"));
  Serial.print(currentSOS ? 1 : 0);
  Serial.print(F(",\"sq\":\""));
  Serial.print(outSQ);
  Serial.println(F("\"}"));
  Serial.flush();
}


// ============================================================================
//  BUZZER (COMPATIBLE WITH ACTIVE AND PASSIVE BUZZERS)
// ============================================================================

void beepBuzzer(int count) {
  for (int i = 0; i < count; i++) {
    tone(PIN_BUZZER, 2400, BUZZER_DURATION_MS);
    delay(BUZZER_DURATION_MS);
    noTone(PIN_BUZZER);
    if (i < count - 1) delay(100);
  }
}
