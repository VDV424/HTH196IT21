# TriagePulse Architecture & Mathematical Formulations

> **IMPORTANT DISCLAIMER**:  
> TriagePulse is an **Educational and Research Prototype Only**.  
> It does **NOT** diagnose medical conditions, prescribe pharmaceutical or surgical treatments, control IV pumps, or claim clinical validation.

---

## 1. System Overview

TriagePulse replaces static alert thresholds with continuous **trajectory-aware physiological observation**, **care-task / IV oversight**, and **capacity-aware nurse triage**.

```
[ ESP32 IoT Nodes (P01..P03) ]     [ Simulation Engine (P04..P20) ]
              │                                      │
              ▼                                      ▼
    ┌────────────────────────────────────────────────────────┐
    │              FastAPI Unified Telemetry Layer           │
    │         (MQTT Adapter & REST Telemetry Endpoint)       │
    └──────────────────────────┬─────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌─────────────────────────┐           ┌────────────────────────┐
│  Physiological Engine   │           │    IV Oversight Engine │
│  Deterioration D(t)     │           │    Urgency U(t)        │
└───────────┬─────────────┘           └───────────┬────────────┘
            │                                     │
            └──────────────────┬──────────────────┘
                               ▼
        ┌──────────────────────────────────────────────┐
        │  Attention Priority Formulation P(t)         │
        │  Explainable Additive Decomposition Panel    │
        └──────────────────────┬───────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌──────────────────────────────┐       ┌────────────────────────┐
│  Alert Episode Compression   │       │ Dynamic Nurse Triage   │
│  (Anti-Alarm Fatigue Engine) │       │ (Capacity-Aware Engine)│
└──────────────┬───────────────┘       └──────────┬─────────────┘
               │                                  │
               └──────────────────┬───────────────┘
                                  ▼
      ┌────────────────────────────────────────────────────────┐
      │          WebSockets Real-Time Broadcaster (/ws)        │
      │       Hospital Command Center & Nurse PWA Client       │
      └────────────────────────────────────────────────────────┘
```

---

## 2. Mathematical Formulations

### A. Physiological Deterioration $D(t) \in [0, 100]$
Calculated from multi-vital deviations, velocity, persistence, and multi-vital concordance:

$$D(t) = \min\left(100, \max\left(0, \left( \sum_{k} w_k \cdot F_k(t) \right) \cdot C_{signal} \right)\right)$$

Where:
- $F_{trend}$: Short-term slope ($\Delta V / \Delta t$) across the last 5 samples.
- $F_{roc}$: Rate of change between consecutive ticks.
- $F_{persistence}$: Duration in consecutive ticks that abnormal departure persists ($16 \times \text{ticks}$).
- $F_{multi\_vital}$: Multi-vital agreement factor ($90$ if 3 vitals concordant, $60$ if 2 concordant, $0$ if isolated).
- $F_{baseline}$: Absolute deviation from personal baseline $|HR - HR_0|, |SpO2_0 - SpO2|, |Temp - Temp_0|$.
- $C_{signal}$: Signal confidence modifier:
  * $\text{GOOD} = 1.0$
  * $\text{NOISY} = 0.55$
  * $\text{MOTION\_ARTIFACT} = 0.40$
  * $\text{MISSING} = 0.05$ (suppresses physiological alert; triggers sensor technical review)

### B. Care-Task / IV Urgency $U(t) \in [0, 100]$
Separated strictly from physiology:

$$U(t) = \begin{cases}
95 & \text{if Remaining Volume} \le 40\text{ mL} \\
86 & \text{if Flow stopped / Occlusion detected} \\
75 & \text{if Remaining Volume} \le 90\text{ mL (Near Empty)} \\
45 & \text{if Remaining Volume} \le 180\text{ mL (Watch)} \\
10 & \text{Normal Infusion}
\end{cases}$$

### C. Overall Attention Priority $P(t) \in [0, 100]$
A weighted combination ensuring both physiological distress and critical care tasks receive timely nurse attention:

$$P(t) = \min(100, w_{det} \cdot D(t) + w_{iv} \cdot U(t) + \text{Context})$$

---

## 3. Dynamic Capacity-Aware Nurse Allocation

- Each nurse has an operational capacity limit $C_{max}$ (default: 5 patients).
- Allocation evaluates:
  1. Priority level $P(t)$
  2. Clinical capability matching (e.g. Critical Observation, IV Therapy, Telemetry)
  3. Current nurse workload ($n / C_{max}$)
  4. Physical ward proximity (Ward East, Ward Central, Ward West)
- If all nurses reach maximum capacity, patients enter the **Capacity Overflow Triage Queue** with explicit warnings.
