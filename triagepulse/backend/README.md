# TriagePulse — Backend Engine

> **Trajectory-aware patient monitoring, IV oversight and capacity-aware nurse triage**  
> *Educational & Research Prototype Only — Not for clinical diagnosis, treatment prescription, or equipment control.*

---

## 🚀 Quick Start

### 1. Requirements
- Python 3.10+
- Dependencies listed in `requirements.txt`

### 2. Installation
```bash
pip install -r requirements.txt
```

### 3. Run FastAPI Server
```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The interactive OpenAPI documentation will be accessible at:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Real-Time WebSocket**: `ws://localhost:8000/ws`

---

## 🧪 Automated Tests
```bash
python -m pytest tests
```
Tests cover:
- Baseline deviation and trend slope calculation
- Multi-vital concordant deterioration detection
- Non-pathological sensor fault handling (missing/noisy sensor does NOT equal deterioration)
- Independent IV urgency scoring
- Alert episode compression and alarm fatigue reduction
- Nurse capacity enforcement and dynamic capability matching
- Full alert lifecycle (Open -> Acknowledged -> Under Review -> Escalated -> Resolved)
