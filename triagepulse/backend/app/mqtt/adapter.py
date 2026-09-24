import json
from typing import Dict, Any, Optional, Callable

class MQTTAdapter:
    """
    MQTT adapter interface for IoT integration.
    
    Hardware Architecture (from circuit diagram):
    ─────────────────────────────────────────────
    Patient 1 (ESP32 — Wireless, direct MQTT):
      - MAX30102 → Heart Rate + SpO2
      - DS18B20  → Temperature
      - SOS Button → GPIO 27
      - Status LED → GPIO 2 (optional)
      - Buzzer → GPIO 15 (optional)
      
    Patient 2 (Arduino UNO → Serial UART → ESP32 Gateway):
      - MAX30102 → Heart Rate + SpO2 (on UNO via A4/A5 I2C)
      - DS18B20  → Temperature (on UNO D4)
      - SOS Button → UNO D7
      - Arduino TX (D1) → 1kΩ+2kΩ voltage divider → ESP32 GPIO 16 (RX)
      - ESP32 gateway publishes P02 data via MQTT
      
    IV Monitor (Load Cell → HX711 → ESP32):
      - Load Cell (5kg) → HX711 amplifier
      - HX711 DT → ESP32 GPIO 18
      - HX711 SCK → ESP32 GPIO 19
      - Measures IV bag weight in grams
      - Software calculates: flow rate, remaining volume, ETA to empty
    
    MQTT Topics (published by ESP32 Gateway):
      - triagepulse/patient/{id}/vitals     → {heart_rate, spo2, temperature, signal_quality}
      - triagepulse/patient/{id}/sos        → {sos: true/false}
      - triagepulse/patient/{id}/iv         → {iv_weight_grams, iv_flow_ml_hr, iv_remaining_ml, iv_state}
      - triagepulse/patient/{id}/status     → {device_id, battery, rssi, uptime_sec}
      - triagepulse/iv/{id}/weight          → {weight_grams, flow_ml_hr, remaining_ml, state}
    """
    
    # IV bag constants (from HX711 load cell calibration)
    IV_BAG_TARE_WEIGHT_G = 25.0      # Empty IV bag weight in grams
    IV_BAG_FULL_VOLUME_ML = 500.0    # Standard IV bag volume
    IV_BAG_FULL_WEIGHT_G = 525.0     # Full bag + tare = 500ml + 25g bag
    
    def __init__(self, on_patient_data: Optional[Callable[[str, Dict[str, Any]], None]] = None):
        self.on_patient_data = on_patient_data
        self.is_connected = False
        self.broker_host = "localhost"
        self.broker_port = 1883
        self.connected_devices = ["ESP32_P01", "ESP32_GW"]  # P01 direct + ESP32 gateway (handles P02 + IV)
        
        # Track last IV weight for flow rate calculation
        self._last_iv_weight: Dict[str, float] = {}
        self._last_iv_timestamp: Dict[str, float] = {}

    def parse_topic(self, topic: str) -> Optional[Dict[str, str]]:
        """
        Parse MQTT topic into structured metadata.
        Supports:
          triagepulse/patient/{id}/vitals
          triagepulse/patient/{id}/sos
          triagepulse/patient/{id}/iv
          triagepulse/patient/{id}/status
          triagepulse/iv/{id}/weight
        """
        parts = topic.strip("/").split("/")
        if len(parts) < 4 or parts[0] != "triagepulse":
            return None
            
        if parts[1] == "patient" and len(parts) >= 4:
            return {
                "patient_id": parts[2].upper(),
                "subtopic": parts[3],
                "category": "patient"
            }
        elif parts[1] == "iv" and len(parts) >= 4:
            return {
                "patient_id": parts[2].upper(),
                "subtopic": parts[3],
                "category": "iv"
            }
        return None

    def handle_incoming_message(self, topic: str, payload_str: str) -> bool:
        """
        Process an incoming MQTT message from the ESP32 hardware.
        Normalizes the raw sensor data into the unified payload format
        expected by the simulation engine's ingest_hardware_vitals().
        """
        meta = self.parse_topic(topic)
        if not meta:
            return False

        patient_id = meta["patient_id"]
        subtopic = meta["subtopic"]
        category = meta["category"]

        try:
            data = json.loads(payload_str)
        except Exception:
            return False

        if not self.on_patient_data:
            return False

        unified_payload = {}

        if category == "patient":
            if subtopic == "vitals":
                # From MAX30102 + DS18B20 sensors
                # ESP32 publishes: {"heart_rate": 75, "spo2": 98, "temperature": 36.7}
                hr = data.get("heart_rate")
                spo2 = data.get("spo2")
                temp = data.get("temperature")
                
                # Validate sensor readings (MAX30102 can send 0 when finger not detected)
                if hr is not None and hr > 0:
                    unified_payload["heart_rate"] = float(hr)
                if spo2 is not None and spo2 > 0:
                    unified_payload["spo2"] = float(spo2)
                if temp is not None and temp > 20.0:  # DS18B20 sanity check
                    unified_payload["temperature"] = float(temp)
                
                # Signal quality inference from raw sensor values
                if hr == 0 or spo2 == 0:
                    unified_payload["signal_quality"] = "MISSING"
                elif data.get("signal_quality"):
                    unified_payload["signal_quality"] = data["signal_quality"]
                else:
                    unified_payload["signal_quality"] = "GOOD"
                    
            elif subtopic == "sos":
                # SOS button press from GPIO 27 (P01) or D7 (P02 via gateway)
                # ESP32 publishes: {"sos": true} or {"sos": false}
                unified_payload["sos"] = bool(data.get("sos", False))
                
            elif subtopic == "iv":
                # IV data from HX711 load cell
                # ESP32 publishes: {"iv_weight_grams": 450, "iv_flow_ml_hr": 20, ...}
                weight_g = data.get("iv_weight_grams", data.get("weight_grams", 0))
                remaining_ml = self._weight_to_volume(weight_g)
                
                unified_payload["iv_weight"] = float(weight_g)
                unified_payload["iv_remaining_ml"] = remaining_ml
                
                if "iv_flow_ml_hr" in data or "flow_ml_hr" in data:
                    unified_payload["iv_flow"] = float(data.get("iv_flow_ml_hr", data.get("flow_ml_hr", 0)))
                
                if "iv_state" in data or "state" in data:
                    unified_payload["iv_state"] = data.get("iv_state", data.get("state", "NORMAL"))
                    
            elif subtopic == "status":
                # Device heartbeat: {"device_id": "ESP32_P01", "battery": 95, "rssi": -45}
                if "device_id" in data:
                    unified_payload["device_id"] = data["device_id"]
                    
        elif category == "iv":
            # Dedicated IV monitor topic: triagepulse/iv/{patient_id}/weight
            if subtopic == "weight":
                weight_g = data.get("weight_grams", 0)
                remaining_ml = self._weight_to_volume(weight_g)
                flow_rate = data.get("flow_ml_hr", 0)
                
                unified_payload["iv_weight"] = float(weight_g)
                unified_payload["iv_remaining_ml"] = remaining_ml
                unified_payload["iv_flow"] = float(flow_rate)
                unified_payload["iv_state"] = data.get("state", "NORMAL")

        if unified_payload:
            self.on_patient_data(patient_id, unified_payload)
            return True
        return False
    
    def _weight_to_volume(self, weight_grams: float) -> float:
        """
        Convert HX711 load cell weight reading to IV fluid remaining volume.
        Assumes: 1 mL water ≈ 1 gram, subtract bag tare weight.
        """
        net_weight = max(0.0, weight_grams - self.IV_BAG_TARE_WEIGHT_G)
        return round(net_weight, 1)  # mL ≈ grams for water-based IV fluids

    def get_status(self) -> Dict[str, Any]:
        return {
            "mqtt_enabled": True,
            "connected": self.is_connected,
            "broker": f"{self.broker_host}:{self.broker_port}",
            "connected_devices": self.connected_devices,
            "hardware_architecture": {
                "patient_1": "ESP32 DevKit (direct WiFi/MQTT) — MAX30102 + DS18B20 + SOS GPIO27",
                "patient_2": "Arduino UNO → Serial UART → ESP32 Gateway — MAX30102 + DS18B20 + SOS D7",
                "iv_monitor": "HX711 Load Cell (5kg) → ESP32 — Weight tracking + flow calculation",
            },
            "supported_topics": [
                "triagepulse/patient/+/vitals",
                "triagepulse/patient/+/sos",
                "triagepulse/patient/+/iv",
                "triagepulse/patient/+/status",
                "triagepulse/iv/+/weight",
            ]
        }
