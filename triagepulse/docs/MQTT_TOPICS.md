# TriagePulse — MQTT Topic Specification

TriagePulse supports standardized MQTT topics for ESP32 and edge gateway integration.

## Base Topic Hierarchy

```
triagepulse/patient/{PATIENT_ID}/{SUBTOPIC}
```

Where `{PATIENT_ID}` is `P01`, `P02`, or `P03` (and up to `P20`).

---

## Supported Topics

### 1. Vitals Telemetry
**Topic**: `triagepulse/patient/P01/vitals`  
**Payload** (JSON):
```json
{
  "device_id": "ESP32_P01",
  "heart_rate": 78.5,
  "spo2": 97.8,
  "temperature": 36.85,
  "timestamp": "2026-09-24T12:00:00Z"
}
```

### 2. Motion / Accelerometer
**Topic**: `triagepulse/patient/P01/motion`  
**Payload** (JSON):
```json
{
  "device_id": "ESP32_P01",
  "motion": 0.12,
  "activity_state": "RESTING"
}
```

### 3. IV Drip & Load-Cell Weight
**Topic**: `triagepulse/patient/P01/iv`  
**Payload** (JSON):
```json
{
  "device_id": "ESP32_P01",
  "iv_weight": 345.0,
  "iv_flow": 20.0,
  "iv_remaining_ml": 345.0
}
```

### 4. Sensor Signal Quality
**Topic**: `triagepulse/patient/P01/quality`  
**Payload** (JSON):
```json
{
  "device_id": "ESP32_P01",
  "signal_quality": "GOOD",
  "sqi_index": 0.94
}
```
*Valid `signal_quality` values:* `GOOD`, `NOISY`, `MISSING`, `STALE`, `MOTION_ARTIFACT`.

### 5. Device Status / Heartbeat
**Topic**: `triagepulse/patient/P01/status`  
**Payload** (JSON):
```json
{
  "device_id": "ESP32_P01",
  "battery_pct": 88,
  "rssi": -62,
  "uptime_sec": 3840
}
```
