<div align="center">
  <img src="docs/images/logo.png" alt="TriagePulse Logo" width="220" style="border-radius: 50%; box-shadow: 0 0 30px rgba(6, 182, 212, 0.4);" />
  
  # 🩺 TriagePulse — Trajectory-Aware Smart Hospital Monitoring & Multi-Role Triage
  
  <p>
    <strong>Official Hackathon Repository for Project: <code>HTH196IT21</code></strong><br />
    <em>“Trajectory-aware patient monitoring, IV oversight and capacity-aware nurse triage”</em>
  </p>

  <p>
    <a href="#-quick-start-guide"><strong>Explore Quickstart »</strong></a> •
    <a href="#-the-4-distinct-role-based-portals"><strong>Role Portals</strong></a> •
    <a href="#-system-architecture"><strong>Architecture</strong></a> •
    <a href="#-3-minute-live-hackathon-demo-walkthrough"><strong>3-Min Demo Script</strong></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Backend-FastAPI_0.115+-009688.svg?logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Frontend-React_18_+_Vite-61DAFB.svg?logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/Language-TypeScript_5.0-3178C6.svg?logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB.svg?logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC.svg?logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/IoT-MQTT_Ready-660066.svg?logo=mqtt&logoColor=white" alt="MQTT" />
    <img src="https://img.shields.io/badge/Tests-8%2F8_Passing_(100%25)-brightgreen.svg?logo=pytest&logoColor=white" alt="Tests" />
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License" />
  </p>
</div>

---

## ⚠️ Important Educational / Research Disclaimer
> **SIMULATED / EDUCATIONAL PROTOTYPE ONLY — NOT FOR CLINICAL USE.**  
> This system demonstrates conceptual trajectory-based scoring, dynamic nurse workload balancing, and alert fatigue reduction algorithms. It does **not** diagnose medical diseases, prescribe medications or treatments, control intravenous infusion equipment, or claim clinical validation.

---

## 🌟 Executive Summary & Hackathon Innovations

Traditional hospital patient telemetry monitors suffer from severe **alarm fatigue** caused by static threshold crossings (`SpO2 < 90% -> Alarm`) and uncoordinated nurse dispatch, leading to nurse burnout, missed clinical deterioration, and patient distress.

**TriagePulse** replaces static thresholds with an end-to-end intelligent IoT triage platform featuring:

1. **Multi-Vital Trajectory Scoring $D(t)$**: Evaluates rate-of-change, baseline departure, persistence, and multi-vital concordance rather than isolated threshold blips.
2. **Strict Separation of Physiology and IV Urgency**: Patient vital deterioration $D(t)$ is mathematically separated from IV infusion depletion/occlusion $U(t)$.
3. **Alert Episode Compression**: Folds dozens of continuous abnormal readings into a single evolving alert episode, achieving **>94% alarm fatigue reduction**.
4. **Capacity-Aware Dynamic Nurse Allocation**: Automatically triages patients based on clinical priority, specialized nurse capability, ward location, and a hard workload ceiling (default 5 beds/nurse) with explainable reasoning.
5. **Multi-Role Hospital Ecosystem**:
   - 🩺 **Nurse Portal**: Real-time ward command grid, dynamic patient priority queue, ward room map, personal shift view with 1-click IV bag replacements and bedside request acknowledgments.
   - 👨‍⚕️ **Doctor Portal**: Multi-vital deterioration forensics, MEWS2 trend radar, structured SBAR clinical reviews, and active physician escalation queue with 1-click clinical protocol orders.
   - 🛌 **Patient & Family Bedside Kiosk**: Calming, non-threatening room companion tablet displaying reassuring status, friendly IV progress tracker, 1-tap comfort requests (Water, Pain, Restroom, Nurse Visit), and large Emergency SOS panic button.
   - 🏢 **Operations & Management**: Ward bed capacity heatmap (20 beds), nurse burnout variance index, alarm fatigue reduction audit (94.3% false alarm suppression), and 3-hour pharmacy IV depletion forecast.
6. **Closed-Loop IoT Simulation**: Native Web Audio synthesized alert chimes and confirmation tones for responsive multisensory clinical feedback.
7. **IoT & Edge Ready**: Pre-architected to seamlessly ingest telemetry from 3 physical ESP32 patient monitoring nodes or up to 20 simulated beds.

---

## 📸 Interactive System Dashboards

### 1. 🩺 Nurse Command Grid & Priority Queue
Real-time triage queue continuously sorted by Attention Priority $P(t)$, complete with 2D room map, signal quality confidence, and dynamic nurse dispatch.
<p align="center">
  <img src="docs/images/nurse_command_grid.png" alt="Nurse Command Grid" width="95%" style="border-radius: 12px; border: 1px solid #1e293b;" />
</p>

### 2. 👨‍⚕️ Doctor Clinical Portal & Protocol Ordering
Deterioration trend forensics, MEWS2 trajectory radar, structured SBAR handovers, and 1-click clinical order placement.
<p align="center">
  <img src="docs/images/doctor_portal.png" alt="Doctor Clinical Portal" width="95%" style="border-radius: 12px; border: 1px solid #1e293b;" />
</p>

### 3. 🛌 Patient & Family Bedside Companion Tablet
Reassuring wellness monitor for hospital rooms, intuitive liquid IV progress ring, 1-tap comfort requests, and tactile Emergency SOS panic button.
<p align="center">
  <img src="docs/images/patient_kiosk.png" alt="Patient Bedside Kiosk" width="95%" style="border-radius: 12px; border: 1px solid #1e293b;" />
</p>

### 4. 🏢 Hospital Operations & Ward Capacity Heatmap
20-bed occupancy & acuity heatmap, nurse burnout risk index, alarm fatigue suppression audit (94.3% false alarms cut), and 3-hour pharmacy IV depletion timeline.
<p align="center">
  <img src="docs/images/operations_portal.png" alt="Hospital Operations Dashboard" width="95%" style="border-radius: 12px; border: 1px solid #1e293b;" />
</p>

### 5. 🔬 Bedside Telemetry & Trajectory Decomposition Modal
Real-time streaming ECG and vital charts with additive point decomposition of clinical factors.
<p align="center">
  <img src="docs/images/patient_modal.png" alt="Bedside Detail Modal" width="95%" style="border-radius: 12px; border: 1px solid #1e293b;" />
</p>

---

## 🏛️ System Architecture

```
                               ┌────────────────────────────────────────────────────────┐
                               │                    TRIAGEPULSE                         │
                               └────────────────────────────────────────────────────────┘
                                                            │
                     ┌──────────────────────────────────────┴──────────────────────────────────────┐
                     ▼                                                                             ▼
       ┌───────────────────────────┐                                                 ┌───────────────────────────┐
       │   3 Physical ESP32 Nodes  │                                                 │  10–17 Simulated Patients │
       │ (MAX30102, DS18B20, Load) │                                                 │    (Continuous Engine)    │
       └───────────────────────────┘                                                 └───────────────────────────┘
                     │                                                                             │
                     └──────────────────────────────┬──────────────────────────────────────────────┘
                                                    │ Telemetry (MQTT / JSON / REST)
                                                    ▼
                                     ┌─────────────────────────────┐
                                     │    FastAPI Ingestion Core   │
                                     │  (WebSockets Broadcast /ws) │
                                     └─────────────────────────────┘
                                                    │
                 ┌──────────────────────────────────┴──────────────────────────────────┐
                 ▼                                                                     ▼
  ┌─────────────────────────────┐                                       ┌─────────────────────────────┐
  │   Signal Quality Engine     │                                       │   Multi-Vital Trajectory    │
  │ (Noise/Artifact Suppression)│                                       │    Scoring Engine D(t)      │
  └─────────────────────────────┘                                       └─────────────────────────────┘
                 │                                                                     │
                 └──────────────────────────────────┬──────────────────────────────────┘
                                                    │
                                                    ▼
                                     ┌─────────────────────────────┐
                                     │   Alert Episode Engine      │
                                     │  (94.3% Alarm Compression)  │
                                     └─────────────────────────────┘
                                                    │
                                                    ▼
                                     ┌─────────────────────────────┐
                                     │   Capacity-Aware Nurse      │
                                     │   Allocation Engine         │
                                     └─────────────────────────────┘
                                                    │
      ┌─────────────────────┬───────────────────────┴───────────────────────┬─────────────────────┐
      ▼                     ▼                                               ▼                     ▼
┌───────────┐         ┌───────────┐                                   ┌───────────┐         ┌───────────┐
│   NURSE   │         │  DOCTOR   │                                   │  PATIENT  │         │OPERATIONS │
│  Command  │         │  SBAR &   │                                   │  Bedside  │         │ Capacity  │
│  & Shift  │         │ Protocols │                                   │   Kiosk   │         │  & Heatmap│
└───────────┘         └───────────┘                                   └───────────┘         └───────────┘
```

---

## 💻 The 4 Distinct Role-Based Portals

| Portal | Intended User | Key Features |
| :--- | :--- | :--- |
| **🩺 Nurse Portal** | Bedside & Charge Nurses | Dynamic patient priority queue, ward room map, shift task checklist, 1-click **"Hang 500ml Bag"** IV refill, and bedside request acknowledgments. |
| **👨‍⚕️ Doctor Portal** | Attending Physicians & Hospitalists | Deterioration forensics, MEWS2 trend radar, structured **SBAR** clinical handovers, and **1-Click Clinical Protocol Orders** (*Start O₂, Push Saline, Stat ABG, ECG, ICU Step-Up*). |
| **🛌 Patient Bedside Kiosk** | Patient & Family Members | Soothing, non-intimidating tablet kiosk, reassuring wellness indicator, friendly liquid IV progress bar, **1-Tap Comfort Requests** (*Water, Pain Check, Restroom, Nurse Visit*), and tactile **Emergency SOS Panic Button**. |
| **🏢 Operations & Management** | Ward Supervisors & Hospital Admins | 20-bed occupancy & acuity heatmap, nurse burnout variance index, alarm fatigue reduction audit (**94.3% noise suppression**), and **3-Hour Pharmacy IV Depletion Timeline**. |

---

## ⚡ Quick Start Guide

### Option 1: One-Click Startup (Recommended for Windows)
Simply double click or execute:
```cmd
start.bat
```
This automatically verifies dependencies, starts the FastAPI backend daemon on `http://127.0.0.1:8000`, and opens the live interface in your browser.

---

### Option 2: Manual Terminal Startup

#### 1. Backend (FastAPI + WebSockets)
```bash
cd triagepulse/backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
- Interactive Swagger API: [http://localhost:8000/docs](http://localhost:8000/docs)
- Live WebSocket Telemetry: `ws://localhost:8000/ws`

#### 2. Frontend (React + Vite)
```bash
cd triagepulse/frontend
npm install
npm run build
```
*(The production build is automatically served by FastAPI at `http://127.0.0.1:8000/`)*

---

## 🎬 3-Minute Live Hackathon Demo Walkthrough

Click the glowing **`RUN 3-MIN DEMO`** button in the dashboard or execute via REST:
```bash
curl -X POST http://127.0.0.1:8000/api/demo/start
```

- **0:00 - Baseline Ward Stability**: All 12 beds start stable at their personal calibrated baselines.
- **0:30 - Slow Deterioration (P04)**: Heart rate gently climbs, SpO₂ drifts downward; patient trajectory transitions from Stable to Watch.
- **1:00 - Acute Deterioration (P05)**: Rapid concordant decline; Attention Priority surges ($P(t) > 85$); patient moves to top of queue; alert episode opens; dynamic allocation assigns Nurse B with explainable reasoning.
- **1:15 - Independent IV Urgency (P03)**: IV bag volume drops to near-empty ($< 40$ mL); physiological score remains Low while IV Urgency spikes to High, demonstrating independent care-task prioritization.
- **1:40 - Sensor Fault Handling (P06)**: Erratic readings without true physiological collapse; system marks Signal Quality as `NOISY` with Moderate Confidence rather than incorrectly flagging physiological deterioration.
- **2:00 - Patient Recovery & Auto-Resolution (P08/P05)**: Vitals return to baseline; attention priority normalizes and alert episodes auto-resolve.

---

## 📡 MQTT Topic Hierarchy (ESP32 Nodes)

```
triagepulse/patient/{ID}/vitals    -> { "heart_rate": 78, "spo2": 98, "temperature": 36.8 }
triagepulse/patient/{ID}/motion    -> { "motion": 0.12, "activity": "RESTING" }
triagepulse/patient/{ID}/iv        -> { "iv_weight": 340, "iv_flow": 20 }
triagepulse/patient/{ID}/quality   -> { "signal_quality": "GOOD" }
triagepulse/patient/{ID}/button    -> { "event": "SOS" | "REQUEST", "type": "Water" }
triagepulse/patient/{ID}/status    -> { "device_id": "ESP32_P01", "battery_pct": 92 }
```

ESP32 nodes can also push directly via HTTP:
```bash
POST http://localhost:8000/api/hardware/telemetry
```

---

## 🧪 Automated Testing

All core mathematical formulations, alert suppression algorithms, and nurse capacity limits are validated by an automated test suite:
```bash
cd triagepulse/backend
python -m pytest tests -v
```
**Test Results: 8/8 Tests Passed (100% Pass Rate in 0.08s)**

---

## 📁 Repository Directory Structure

```
HTH196IT21/
├── .github/                     # Issue & PR templates for GitHub project management
├── .gitignore                   # Production git ignore (Node, Python, SQLite, envs)
├── docs/                        # Architecture guides & system visual assets
│   └── images/                  # Team logo & full dashboard portal screenshots
├── LICENSE                      # Open-source MIT License
├── README.md                    # Root project presentation & documentation
├── start.bat                    # One-click Windows launch script
└── triagepulse/
    ├── backend/
    │   ├── app/
    │   │   ├── main.py          # FastAPI application, WebSockets & lifespan
    │   │   ├── api/             # REST endpoints (patients, alerts, escalations, management)
    │   │   ├── models/          # Pydantic data schemas
    │   │   ├── services/        # Trajectory engine, alert compression, nurse allocation
    │   │   ├── simulation/      # Continuous 12-20 patient generator & scripted demo
    │   │   ├── analytics/       # System metrics & lead-time computations
    │   │   ├── mqtt/            # MQTT adapter for ESP32 hardware
    │   │   └── database/        # SQLite persistent storage
    │   ├── tests/               # Pytest suite
    │   └── requirements.txt
    ├── frontend/
    │   ├── src/
    │   │   ├── components/      # Navbar, KPICards, WardRoomMap, DetailModal
    │   │   ├── pages/           # Nurse, Doctor, Patient Bedside Kiosk, Management
    │   │   ├── services/        # REST API client
    │   │   ├── utils/           # Web Audio synthesized sound manager
    │   │   └── types/           # TypeScript interfaces
    │   ├── package.json
    │   └── vite.config.ts
    ├── simulator/               # CLI telemetry injector
    └── docs/                    # Mathematical formulation & hardware wiring diagrams
```

---

## 👥 Team HTH196IT21

| Team Role | Focus Area |
| :--- | :--- |
| **Lead IoT Systems Architect** | ESP32 telemetry ingestion, MQTT adapter, load-cell ADC calibration |
| **Full-Stack Clinical Software Engineer** | FastAPI async WebSocket pipeline, Trajectory $D(t)$ formulation, Pytest suite |
| **Clinical UI/UX Designer** | Multi-role portals (Nurse Command, Doctor SBAR, Patient Tablet Kiosk, Executive) |

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
