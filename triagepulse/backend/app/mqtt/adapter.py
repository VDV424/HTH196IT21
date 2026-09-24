import json
from typing import Dict, Any, Optional, Callable

class MQTTAdapter:
    """
    MQTT adapter interface for IoT integration.
    Listens to or parses ESP32 device topics:
      - triagepulse/patient/{id}/vitals
      - triagepulse/patient/{id}/motion
      - triagepulse/patient/{id}/iv
      - triagepulse/patient/{id}/quality
      - triagepulse/patient/{id}/status
    """
    def __init__(self, on_patient_data: Optional[Callable[[str, Dict[str, Any]], None]] = None):
        self.on_patient_data = on_patient_data
        self.is_connected = False
        self.broker_host = "localhost"
        self.broker_port = 1883
        self.connected_devices = ["ESP32_P01", "ESP32_P02", "ESP32_P03"]

    def parse_topic(self, topic: str) -> Optional[Dict[str, str]]:
        # Format: triagepulse/patient/{id}/{subtopic}
        parts = topic.strip("/").split("/")
        if len(parts) >= 4 and parts[0] == "triagepulse" and parts[1] == "patient":
            return {
                "patient_id": parts[2],
                "subtopic": parts[3]
            }
        return None

    def handle_incoming_message(self, topic: str, payload_str: str) -> bool:
        meta = self.parse_topic(topic)
        if not meta:
            return False

        patient_id = meta["patient_id"]
        subtopic = meta["subtopic"]

        try:
            data = json.loads(payload_str)
        except Exception:
            return False

        if self.on_patient_data:
            # Normalize payload
            unified_payload = {}
            if subtopic == "vitals":
                unified_payload["heart_rate"] = data.get("heart_rate")
                unified_payload["spo2"] = data.get("spo2")
                unified_payload["temperature"] = data.get("temperature")
            elif subtopic == "motion":
                unified_payload["motion"] = data.get("motion")
            elif subtopic == "quality":
                unified_payload["signal_quality"] = data.get("signal_quality")
            elif subtopic == "iv":
                unified_payload["iv_weight"] = data.get("iv_weight")
                unified_payload["iv_flow"] = data.get("iv_flow")

            if "device_id" in data:
                unified_payload["device_id"] = data["device_id"]

            self.on_patient_data(patient_id, unified_payload)
            return True
        return False

    def get_status(self) -> Dict[str, Any]:
        return {
            "mqtt_enabled": True,
            "connected": self.is_connected,
            "broker": f"{self.broker_host}:{self.broker_port}",
            "connected_devices": self.connected_devices,
            "supported_topics": [
                "triagepulse/patient/+/vitals",
                "triagepulse/patient/+/motion",
                "triagepulse/patient/+/iv",
                "triagepulse/patient/+/quality",
                "triagepulse/patient/+/status",
            ]
        }
