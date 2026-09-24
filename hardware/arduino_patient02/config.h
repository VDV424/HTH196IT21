/*
 * ============================================================================
 *  TRIAGEPULSE — ARDUINO UNO PATIENT 02 CONFIG
 *  Pin assignments, timing, and calibration constants
 * ============================================================================
 */

#ifndef CONFIG_H
#define CONFIG_H

// ======================== PATIENT ID ========================
#define PATIENT_ID         "P02"
#define DEVICE_ID          "UNO-P02"

// ======================== PIN ASSIGNMENTS ========================
// MAX30102 Pulse Oximeter (I2C — fixed pins on UNO)
// SDA = A4 (hardwired on UNO)
// SCL = A5 (hardwired on UNO)

// DS18B20 Temperature Sensor (OneWire)
#define PIN_DS18B20        4     // Arduino D4 (4.7kΩ pull-up to VCC)

// HX711 Load Cell Amplifier (IV Weight)
#define PIN_HX711_DOUT     2     // Arduino D2
#define PIN_HX711_SCK      3     // Arduino D3

// SOS Push Button
#define PIN_SOS_BUTTON     7     // Arduino D7 (INPUT_PULLUP, active LOW)

// Buzzer
#define PIN_BUZZER         8     // Arduino D8

// ======================== UART TO ESP32 ========================
// Arduino Hardware Serial (D0=RX, D1=TX)
// TX (D1) connects to ESP32 GPIO16 via voltage divider:
//   Arduino D1/TX → 10kΩ → ESP32 GPIO16 → 20kΩ → GND
// Arduino GND → ESP32 GND
#define UART_BAUD          9600

// ======================== HX711 CALIBRATION ========================
// IMPORTANT: Calibrate with your specific load cell!
// Place a known weight and adjust until the reading matches.
#define HX711_CALIBRATION_FACTOR  -420.0f
#define IV_BAG_TARE_WEIGHT_G      25.0f

// ======================== MAX30102 CONFIG ========================
#define MAX30102_LED_BRIGHTNESS   60
#define MAX30102_SAMPLE_AVERAGE   4
#define MAX30102_LED_MODE         2    // 2 = Red + IR (SpO2 mode)
#define MAX30102_SAMPLE_RATE      100
#define MAX30102_PULSE_WIDTH      411
#define MAX30102_ADC_RANGE        4096

// Finger detection threshold
#define FINGER_DETECT_THRESHOLD   50000

// ======================== TIMING ========================
#define SENSOR_READ_INTERVAL_MS   2000   // Read sensors every 2 seconds
#define UART_SEND_INTERVAL_MS     3000   // Send data to ESP32 every 3 seconds
#define SOS_DEBOUNCE_MS           300    // SOS button debounce
#define BUZZER_DURATION_MS        200    // Buzzer beep duration

// ======================== HR AVERAGING ========================
#define HR_BUFFER_SIZE     4     // Number of beats to average

#endif // CONFIG_H
