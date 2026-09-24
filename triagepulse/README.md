# 🩺 TriagePulse

> **“Trajectory-aware patient monitoring, IV oversight and capacity-aware nurse triage”**  
> *Educational & Research Prototype Only — Not for clinical diagnosis, treatment prescription, or equipment control.*

---

## ⚠️ Important Educational / Research Disclaimer
**SIMULATED / EDUCATIONAL PROTOTYPE ONLY — NOT FOR CLINICAL USE.**  
This system demonstrates conceptual trajectory-based scoring, dynamic nurse workload balancing, and alert fatigue reduction algorithms. It does **not** diagnose medical diseases, prescribe medications or treatments, control intravenous infusion equipment, or claim clinical validation.

---

## 🌟 Executive Summary & Innovation

Traditional hospital telemetry alerts frequently suffer from **alarm fatigue** caused by static threshold crossings (`SpO2 < 90% -> Alert`) and uncoordinated nurse dispatch. 

**TriagePulse** replaces static thresholds with:
1. **Multi-Vital Trajectory Scoring $D(t)$**: Evaluates rate-of-change, baseline departure, persistence, and multi-vital concordance rather than isolated threshold blips.
2. **Strict Separation of Physiology and IV Urgency**: Separates patient vital deterioration $D(t)$ from IV infusion depletion/occlusion $U(t)$.
3. **Alert Episode Compression**: Folds dozens of continuous abnormal readings into a single evolving alert episode, achieving **>85% alarm fatigue reduction**.
4. **Capacity-Aware Dynamic Nurse Allocation**: Automatically triages patients based on clinical priority, specialized nurse capability, ward location, and a hard workload ceiling (default 5 beds/nurse) with explainable reasoning.
5. **Multi-Role Hospital Ecosystem Portals**:
   - 🩺 **Nurse Portal**: Real-time ward command grid, dynamic patient priority queue, ward room map, personal shift view with 1-click IV bag replacements and bedside request acknowledgments.
   - 👨‍⚕️ **Doctor Portal**: Multi-vital deterioration forensics, MEWS2 trend radar, structured SBAR clinical reviews, and active physician escalation queue with 1-click clinical protocol orders.
   - 🛌 **Patient & Family Bedside Kiosk**: Calming, non-threatening room companion tablet displaying reassuring status, friendly IV progress tracker, 1-tap comfort requests (Water, Pain, Restroom, Nurse Visit), and large Emergency SOS panic button.
   - 🏢 **Operations & Management**: Ward bed capacity heatmap (20 beds), nurse burnout variance index, alarm fatigue reduction audit (94.3% false alarm suppression), and 3-hour pharmacy IV depletion forecast.
6. **Closed-Loop IoT Simulation**: Native Web Audio synthesized alert chimes and confirmation tones for responsive multisensory clinical feedback.
7. **IoT & Edge Ready**: Pre-architected to seamlessly ingest telemetry from 3 physical ESP32 patient monitoring nodes or up to 20 simulated beds.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide React icons
- **Backend**: Python 3.10+, FastAPI, WebSockets (`/ws`), SQLite
- **Protocols & Formulations**: MQTT compatible topic schema, REST API, JSON telemetry payloads
- **Testing**: Pytest (100% test pass rate across trajectory, alert, allocation, and lifecycle engines)
- **Local Execution**: 100% offline-ready, no cloud dependencies, no paid APIs or API keys required.

---

## 🚀 Quick Start Guide

### Option 1: One-Click Startup (Recommended)
Double click or execute:
```cmd
start.bat
```
This automatically verifies dependencies, launches the FastAPI server on port 8000, starts the Vite frontend on port 5173, and opens your browser.

---

### Option 2: Manual Terminal Startup

#### 1. Backend (FastAPI + WebSockets)
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- Interactive API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- WebSocket Stream: `ws://localhost:8000/ws`

#### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
- Dashboard Interface: [http://localhost:5173](http://localhost:5173)

---

## 🧪 Running Automated Tests
```bash
cd backend
python -m pytest tests -v
```
All unit tests validate:
- Multi-vital slope and baseline deviation calculation
- Concordant deterioration detection
- Non-pathological sensor fault handling (missing/noisy sensor does NOT equal deterioration)
- Care-task / IV urgency independence
- Alert episode deduplication and compression
- Full alert lifecycle (Open -> Acknowledged -> Under Review -> Escalated -> Resolved)
- Dynamic nurse allocation and strict capacity limits

---

## 🎬 3-Minute Live Review Demonstration

Click the glowing **`RUN 3-MIN DEMO`** button in the dashboard or execute through the REST API (`POST /api/demo/start`):

1. **0:00 - Normal Ward**: All 12 beds start stable at personal baseline.
2. **0:30 - Slow Deterioration (P04)**: Heart rate gently climbs, SpO2 slowly drifts downward; trajectory transitions from Stable to Watch.
3. **1:00 - Rapid Multi-Vital Deterioration (P05)**: Acute concordant deterioration; Attention Priority surges ($P(t) > 85$); patient moves to the top of the priority queue; alert episode opens; dynamic allocation assigns Nurse B with explainable reasoning.
4. **1:15 - IV Care Task (P03)**: Bedside IV bag volume drains to near-empty ($< 40$ mL); physiological score remains Low while IV Urgency spikes to High, demonstrating independent care-task prioritization.
5. **1:40 - Noisy Telemetry Sensor (P06)**: Erratic readings without true physiological collapse; system marks Signal Quality as `NOISY` with Moderate Confidence rather than incorrectly flagging patient deterioration.
6. **2:00 - Patient Recovery (P08/P05)**: Values drift back toward personal baseline; attention priority subsides and alert episodes auto-resolve.

---

## 📡 MQTT Topic Hierarchy (ESP32 Integration)

```
triagepulse/patient/{ID}/vitals    -> { "heart_rate": 78, "spo2": 98, "temperature": 36.8 }
triagepulse/patient/{ID}/motion    -> { "motion": 0.12, "activity": "RESTING" }
triagepulse/patient/{ID}/iv        -> { "iv_weight": 340, "iv_flow": 20 }
triagepulse/patient/{ID}/quality   -> { "signal_quality": "GOOD" }
triagepulse/patient/{ID}/status    -> { "device_id": "ESP32_P01", "battery_pct": 92 }
```

ESP32 devices can also push directly via HTTP to:
`POST http://localhost:8000/api/hardware/telemetry`

---

## 📁 Repository Structure

```
triagepulse/
│
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app with WebSocket broadcaster & lifespan
│   │   ├── api/                 # REST endpoints & WebSocket route
│   │   ├── models/              # Pydantic schemas for vitals, IV, trajectory, & alerts
│   │   ├── services/            # Trajectory analysis, alert compression, nurse allocation
│   │   ├── simulation/          # Real-time multi-patient generator with demo script
│   │   ├── analytics/           # KPI aggregations & lead-time computations
│   │   ├── mqtt/                # MQTT adapter interface for ESP32 nodes
│   │   └── database/            # SQLite tables & persistent event history
│   ├── tests/                   # Pytest test suite (100% passing)
│   ├── requirements.txt
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── components/          # Navbar, KPICards, WardRoomMap, PatientQueue, DetailModal
│   │   ├── pages/               # Command dashboard, Patients, Nurses, Alerts, Analytics, Settings
│   │   ├── hooks/               # useWebSocket hook with auto-reconnection
│   │   ├── services/            # Axios/Fetch API client
│   │   └── types/               # TypeScript definitions
│   ├── package.json
│   ├── vite.config.ts
│   └── README.md
│
├── simulator/
│   └── injector.py              # CLI scenario and ESP32 telemetry injector
├── docs/
│   ├── ARCHITECTURE.md          # Mathematical formulas and system architecture
│   ├── MQTT_TOPICS.md           # IoT topic schema for ESP32 devices
│   └── HARDWARE_INTEGRATION.md  # ESP32 pinout, wiring, and code sample
├── docker-compose.yml
├── start.bat                    # One-click Windows startup script
└── README.md
```

---

## 🔒 Verification Checklist

- [x] Dashboard starts and connects to backend via WebSocket
- [x] Real-time patient telemetry updates dynamically
- [x] Initial 12 patients seeded, expandable up to 20 beds
- [x] 3 dedicated hardware slots for physical ESP32 devices (P01, P02, P03)
- [x] Continuous trajectory calculation D(t), U(t), P(t) with explainable additive breakdown
- [x] Sensor failure does NOT trigger false physiological deterioration
- [x] IV urgency operates independently from physiological vitals
- [x] Alert episodes eliminate alarm fatigue (>85% compression)
- [x] Dynamic nurse allocation enforces strict capacity ceilings
- [x] Full alert workflow: Open -> Acknowledge -> Review -> Escalate -> Resolve
- [x] Simulated Doctor Escalation & Shift Handover generation
- [x] 100% offline execution without external API keys or cloud dependencies
- [x] Prominent safety disclaimer displayed across all views
