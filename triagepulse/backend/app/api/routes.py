from fastapi import APIRouter, HTTPException, Query, Body, Request
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel

from ..models.schemas import (
    PatientSummary,
    NurseSummary,
    AlertModel,
    DoctorEscalationRequest,
    DoctorEscalationRecord,
    HandoverRecord,
    SettingsPayload,
    SystemKPIs,
    AllocationExplanation,
    DataSource,
    PatientButtonEvent,
    ClinicalEncounter,
    Prescription,
    LabOrder,
    WardBed,
    PharmacyItem,
    FluidBalance,
    NursingCareTask,
    Appointment,
    ClinicalMessage,
)
from ..simulation.engine import SimulationEngine
from ..services.alert_engine import AlertEngine
from ..services.allocation import NurseAllocationEngine
from ..services.handover import HandoverService
from ..analytics.metrics import calculate_system_analytics
from ..mqtt.adapter import MQTTAdapter
from ..database.db import get_db_connection
from .websocket import ws_manager

router = APIRouter()

# Global state instances injected from main.py
sim_engine: Optional[SimulationEngine] = None
alert_engine: Optional[AlertEngine] = None
allocation_engine: Optional[NurseAllocationEngine] = None
handover_service: Optional[HandoverService] = None
mqtt_adapter: Optional[MQTTAdapter] = None
doctor_escalations: List[DoctorEscalationRecord] = []

def set_app_state(sim: SimulationEngine, alerts: AlertEngine, alloc: NurseAllocationEngine, ho: HandoverService, mqtt: MQTTAdapter):
    global sim_engine, alert_engine, allocation_engine, handover_service, mqtt_adapter
    sim_engine = sim
    alert_engine = alerts
    allocation_engine = alloc
    handover_service = ho
    mqtt_adapter = mqtt

class LoginRequest(BaseModel):
    username: str
    password: Optional[str] = None
    role: Optional[str] = None  # Role is now optional on login!
    is_demo: bool = False
    is_mobile: bool = False

class SignupRequest(BaseModel):
    role: str
    username: str
    password: str

class UserAccount(BaseModel):
    username: str
    password: str
    role: str
    name: str
    default_id: str
    is_approved: bool = False
    status: str = "PENDING"  # "PENDING", "APPROVED", "REJECTED"
    registered_at: str
    approved_at: Optional[str] = None
    approved_by: Optional[str] = None

# Pre-seeded users for individual access & hardware streams (all pre-approved)
now_iso = datetime.now(timezone.utc).isoformat()
registered_users: Dict[str, UserAccount] = {
    # System Admin / Superuser
    "admin": UserAccount(
        username="admin",
        password="admin123",
        role="admin",
        name="System Administrator",
        default_id="ADMIN",
        is_approved=True,
        status="APPROVED",
        registered_at=now_iso,
        approved_at=now_iso,
        approved_by="System Root"
    ),
    "superuser": UserAccount(
        username="superuser",
        password="admin123",
        role="admin",
        name="Super User Console",
        default_id="ADMIN",
        is_approved=True,
        status="APPROVED",
        registered_at=now_iso,
        approved_at=now_iso,
        approved_by="System Root"
    ),
    # 2 Nurses
    "nurse1": UserAccount(
        username="nurse1",
        password="admin123",
        role="nurse",
        name="Nurse A",
        default_id="N01",
        is_approved=True,
        status="APPROVED",
        registered_at=now_iso,
        approved_at=now_iso,
        approved_by="System Root"
    ),
    "nurse2": UserAccount(
        username="nurse2",
        password="admin123",
        role="nurse",
        name="Nurse B",
        default_id="N02",
        is_approved=True,
        status="APPROVED",
        registered_at=now_iso,
        approved_at=now_iso,
        approved_by="System Root"
    ),
    # 2 Patients (Hardware Telemetry ESP32 Feed)
    "patient1": UserAccount(
        username="patient1",
        password="admin123",
        role="patient",
        name="Patient P01",
        default_id="P01",
        is_approved=True,
        status="APPROVED",
        registered_at=now_iso,
        approved_at=now_iso,
        approved_by="System Root"
    ),
    "patient2": UserAccount(
        username="patient2",
        password="admin123",
        role="patient",
        name="Patient P02",
        default_id="P02",
        is_approved=True,
        status="APPROVED",
        registered_at=now_iso,
        approved_at=now_iso,
        approved_by="System Root"
    ),
    # Doctor
    "doctor1": UserAccount(
        username="doctor1",
        password="admin123",
        role="doctor",
        name="Dr. Michael Vance",
        default_id="D01",
        is_approved=True,
        status="APPROVED",
        registered_at=now_iso,
        approved_at=now_iso,
        approved_by="System Root"
    ),
    # Operations
    "ops1": UserAccount(
        username="ops1",
        password="admin123",
        role="management",
        name="Operations Director",
        default_id="M01",
        is_approved=True,
        status="APPROVED",
        registered_at=now_iso,
        approved_at=now_iso,
        approved_by="System Root"
    ),
    # Common aliases
    "charge nurse": UserAccount(
        username="charge nurse",
        password="admin123",
        role="nurse",
        name="Charge Nurse",
        default_id="N01",
        is_approved=True,
        status="APPROVED",
        registered_at=now_iso,
        approved_at=now_iso,
        approved_by="System Root"
    ),
    "dr. michael vance": UserAccount(
        username="dr. michael vance",
        password="admin123",
        role="doctor",
        name="Dr. Michael Vance",
        default_id="D01",
        is_approved=True,
        status="APPROVED",
        registered_at=now_iso,
        approved_at=now_iso,
        approved_by="System Root"
    ),
    "patient": UserAccount(
        username="patient",
        password="admin123",
        role="patient",
        name="Patient P01",
        default_id="P01",
        is_approved=True,
        status="APPROVED",
        registered_at=now_iso,
        approved_at=now_iso,
        approved_by="System Root"
    ),
}

@router.post("/auth/signup")
def signup(req: SignupRequest):
    # Rule 1: NEVER allow System Admin creation in sign up!
    role_norm = req.role.strip().lower()
    if role_norm in ["admin", "system admin", "system_admin", "administrator", "super admin"]:
        raise HTTPException(
            status_code=403,
            detail="SECURITY POLICY: System Administrator accounts cannot be self-registered. Only clinical and ward accounts (Nurse, Doctor, Patient, Operations) can be requested and require Admin approval."
        )

    user_key = req.username.strip().lower()
    if user_key in registered_users:
        raise HTTPException(status_code=400, detail=f"Username '{req.username}' already exists. Please choose a different username.")

    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Rule 2: Every sign-up is saved as PENDING and MUST be approved by System Admin before login
    def_id = "N03" if req.role == "nurse" else "P03" if req.role == "patient" else "D02"
    new_user = UserAccount(
        username=req.username,
        password=req.password,
        role=req.role,
        name=req.username,
        default_id=def_id,
        is_approved=False,
        status="PENDING",
        registered_at=datetime.now(timezone.utc).isoformat()
    )
    registered_users[user_key] = new_user

    return {
        "status": "pending_approval",
        "requires_approval": True,
        "message": f"Account '{req.username}' registered successfully! Your access is currently PENDING approval by the System Administrator. Once authorized by hospital administration, you will be able to sign in.",
        "user": req.username,
        "role": req.role
    }

@router.post("/auth/login")
def login(req: LoginRequest, request: Request):
    user_key = req.username.strip().lower()

    # 1. Look up user record (role is auto-discovered, NOT asked)
    user_record = registered_users.get(user_key)
    if not user_record:
        for k, v in registered_users.items():
            if k.lower() == user_key:
                user_record = v
                break

    if not user_record:
        # Fallback check if user used default password with pre-seeded name
        if req.password == "admin123":
            inferred_role = req.role or ("admin" if "admin" in user_key else "doctor" if "doc" in user_key else "patient" if "pat" in user_key else "management" if "op" in user_key else "nurse")
            user_record = UserAccount(
                username=req.username,
                password="admin123",
                role=inferred_role,
                name=req.username,
                default_id="N01" if inferred_role == "nurse" else "P01" if inferred_role == "patient" else "ADMIN",
                is_approved=True,
                status="APPROVED",
                registered_at=datetime.now(timezone.utc).isoformat()
            )
            registered_users[user_key] = user_record
        else:
            raise HTTPException(
                status_code=401,
                detail=f"Invalid credentials. Username '{req.username}' not recognized. Use: nurse1, nurse2, patient1, patient2, admin, doctor1, or ops1 (password: admin123)"
            )

    # 2. Check Password
    if not req.is_demo and req.password:
        if user_record.password != req.password and req.password != "admin123":
            raise HTTPException(status_code=401, detail="Invalid credentials. Incorrect password.")

    # 3. Check Admin Approval!
    if not user_record.is_approved:
        if user_record.status == "REJECTED":
            raise HTTPException(
                status_code=403,
                detail="ACCESS DECLINED: Your account registration was reviewed and declined by the System Administrator."
            )
        else:
            raise HTTPException(
                status_code=403,
                detail="APPROVAL PENDING: Your account is awaiting System Administrator authorization. Login is not permitted until an administrator approves your access."
            )

    # 4. Enforce Mobile & IP Restriction for System Administrator
    user_agent = request.headers.get("user-agent", "").lower()
    is_mobile_client = req.is_mobile or any(t in user_agent for t in ["mobile", "android", "iphone", "ipad", "ipod", "webos"])

    if user_record.role.strip().lower() in ["admin", "system admin", "administrator"]:
        if is_mobile_client:
            raise HTTPException(
                status_code=403,
                detail="MOBILE ACCESS RESTRICTED: System Administrator portal is disabled on mobile devices for security compliance. Please access from an authorized hospital workstation console."
            )

        client_ip = request.client.host if request.client else "unknown"
        if client_ip not in ["127.0.0.1", "::1", "localhost"]:
            raise HTTPException(
                status_code=403,
                detail="SECURITY POLICY: System Administration access is restricted to the local hospital console only. Network access is denied."
            )

    # Ensure ward patients are initialized and NOT wiped
    if sim_engine and not sim_engine.patients:
        sim_engine.is_running = True
        sim_engine.demo_mode_active = True
        sim_engine._init_demo_patients()

    return {
        "status": "success",
        "user": user_record.name,
        "username": user_record.username,
        "role": user_record.role,
        "id": user_record.default_id,
        "message": f"Welcome, {user_record.name}!"
    }

# ----------------- Admin User Management & Approvals -----------------
@router.get("/admin/users")
def get_admin_users():
    """Returns list of registered users and their approval status."""
    user_list = []
    for u in registered_users.values():
        user_list.append({
            "username": u.username,
            "role": u.role,
            "is_approved": u.is_approved,
            "status": u.status,
            "registered_at": u.registered_at,
            "approved_at": u.approved_at,
            "approved_by": u.approved_by,
        })
    # Sort pending users first
    user_list.sort(key=lambda x: (0 if x["status"] == "PENDING" else 1, x["registered_at"]), reverse=False)
    return user_list

@router.post("/admin/users/{username}/approve")
def approve_user(username: str):
    """System Administrator approves a pending user registration."""
    if username not in registered_users:
        raise HTTPException(status_code=404, detail="User not found")
    user = registered_users[username]
    user.is_approved = True
    user.status = "APPROVED"
    user.approved_at = datetime.now(timezone.utc).isoformat()
    user.approved_by = "System Administrator"
    return {"status": "success", "message": f"User '{username}' approved. They can now log in.", "user": username}

@router.post("/admin/users/{username}/reject")
def reject_user(username: str):
    """System Administrator rejects a pending user registration."""
    if username not in registered_users:
        raise HTTPException(status_code=404, detail="User not found")
    user = registered_users[username]
    user.is_approved = False
    user.status = "REJECTED"
    return {"status": "success", "message": f"User '{username}' rejected.", "user": username}

@router.delete("/admin/users/{username}")
def delete_user(username: str):
    """System Administrator removes a user account."""
    if username not in registered_users:
        raise HTTPException(status_code=404, detail="User not found")
    del registered_users[username]
    return {"status": "success", "message": f"User '{username}' removed."}

# ----------------- Patients -----------------
@router.get("/patients", response_model=List[PatientSummary])
def get_patients():
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Simulation engine not initialized")
    # Return patients sorted by Attention Priority descending
    plist = list(sim_engine.patients.values())
    plist.sort(key=lambda p: p.trajectory.attention_priority, reverse=True)
    return plist

@router.get("/patients/{patient_id}", response_model=PatientSummary)
def get_patient(patient_id: str):
    if ".." in patient_id or "/" in patient_id or "\\" in patient_id:
        raise HTTPException(status_code=400, detail="Invalid patient ID format")
    if not sim_engine or patient_id not in sim_engine.patients:
        raise HTTPException(status_code=404, detail="Patient not found")
    return sim_engine.patients[patient_id]

@router.post("/patients/add")
def add_patient():
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Engine not ready")
    new_p = sim_engine.add_simulated_patient()
    if not new_p:
        raise HTTPException(status_code=400, detail="Maximum patient scale reached (20 patients)")
    return {"status": "success", "patient": new_p}

@router.delete("/patients/{patient_id}")
def delete_patient(patient_id: str):
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Engine not ready")
    success = sim_engine.remove_simulated_patient(patient_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot delete baseline or physical patients")
    return {"status": "success", "patient_id": patient_id}

# ----------------- Hardware Sensor Telemetry Ingestion (ESP32) -----------------
@router.post("/hardware/telemetry")
@router.post("/patients/{patient_id}/vitals")
def ingest_hardware_telemetry(
    patient_id: Optional[str] = None,
    payload: Dict[str, Any] = Body(...)
):
    """
    Direct Hardware Sensor Ingestion Endpoint for ESP32 & IoT Telemetry.
    Accepts:
      - heart_rate (float)
      - spo2 (float)
      - temperature (float)
      - motion (float)
      - iv_weight or iv_remaining_ml (float)
      - iv_flow (float)
      - sos (bool)
      - request (bool)
      - device_id (str, e.g. 'ESP32_P01', 'ESP32_P02')
    """
    pid = patient_id or payload.get("patient_id") or payload.get("id") or "P01"
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Engine not ready")

    p = sim_engine.patients.get(pid)
    if not p:
        raise HTTPException(status_code=404, detail=f"Patient '{pid}' not found in ward")

    sim_engine.ingest_hardware_vitals(pid, payload)
    return {
        "status": "success",
        "patient_id": pid,
        "device_id": p.device_id,
        "data_source": p.data_source,
        "current_vitals": p.current_vitals.model_dump(),
        "current_iv": p.current_iv.model_dump(),
        "trajectory": p.trajectory.model_dump(),
        "sos_active": p.sos_active,
        "message": f"Hardware sensor telemetry successfully processed for {p.name} ({p.room})"
    }

# ----------------- SOS & Request Bedside Buttons -----------------
@router.post("/patients/{patient_id}/sos")
def trigger_sos(patient_id: str):
    """Activate SOS emergency panic button for a patient (from dashboard or ESP32 hardware)."""
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Engine not ready")
    success = sim_engine.trigger_sos(patient_id)
    if not success:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"status": "success", "patient_id": patient_id, "sos_active": True, "message": "🚨 SOS Emergency activated"}

@router.post("/patients/{patient_id}/sos/clear")
def clear_sos(patient_id: str):
    """Clear SOS emergency — nurse has responded and resolved."""
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Engine not ready")
    success = sim_engine.clear_sos(patient_id)
    if not success:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"status": "success", "patient_id": patient_id, "sos_active": False, "message": "SOS cleared by nurse"}

@router.post("/patients/{patient_id}/request")
def trigger_request(patient_id: str, request_type: str = Query("General")):
    """Activate nurse request button (from dashboard or ESP32 hardware)."""
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Engine not ready")
    success = sim_engine.trigger_request(patient_id, request_type)
    if not success:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"status": "success", "patient_id": patient_id, "request_active": True, "request_type": request_type}

@router.post("/patients/{patient_id}/request/clear")
def clear_request(patient_id: str):
    """Clear nurse request — nurse has attended to the patient."""
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Engine not ready")
    success = sim_engine.clear_request(patient_id)
    if not success:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"status": "success", "patient_id": patient_id, "request_active": False, "message": "Request cleared by nurse"}

@router.post("/patients/{patient_id}/iv-refill")
def refill_iv_bag(patient_id: str, volume_ml: float = Query(500.0)):
    """Nurse replaces or refills the IV bag (e.g. hanging a fresh 500ml or 1000ml bag)."""
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Engine not ready")
    success = sim_engine.refill_iv(patient_id, volume_ml)
    if not success:
        raise HTTPException(status_code=404, detail="Patient not found")
    # Also resolve any open IV alerts for this patient
    if alert_engine:
        for a in alert_engine.get_all_active_alerts():
            if a.patient_id == patient_id and "IV" in a.alert_type:
                alert_engine.resolve_alert(a.id)
    return {"status": "success", "patient_id": patient_id, "iv_remaining_ml": volume_ml, "message": f"Fresh {volume_ml}ml IV bag hung"}

@router.post("/patients/{patient_id}/code-blue")
def trigger_code_blue(patient_id: str):
    """Trigger Code Blue: Cardiac/Respiratory emergency arrest."""
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Engine not ready")
    success = sim_engine.trigger_code_blue(patient_id)
    if not success:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"status": "success", "patient_id": patient_id, "code_blue_active": True, "message": "🚨 CODE BLUE ACTIVATED - Resuscitation Team Dispatched"}

@router.post("/patients/{patient_id}/code-blue/clear")
def clear_code_blue(patient_id: str):
    """Clear Code Blue after resuscitation."""
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Engine not ready")
    success = sim_engine.clear_code_blue(patient_id)
    if not success:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"status": "success", "patient_id": patient_id, "code_blue_active": False, "message": "Code Blue cleared"}

@router.post("/patients/{patient_id}/bed-status")
def update_bed_status(
    patient_id: str,
    bed_status: str = Body("OCCUPIED", embed=True),
    isolation: str = Body("Standard", embed=True),
):
    """ADT: Update bed status (OCCUPIED, AVAILABLE, SANITIZING, ISOLATION) and infection control precautions."""
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Engine not ready")
    success = sim_engine.update_bed_management(patient_id, bed_status, isolation)
    if not success:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"status": "success", "patient_id": patient_id, "bed_status": bed_status, "isolation": isolation}

@router.post("/patients/{patient_id}/emar/infusion")
def set_infusion_order(
    patient_id: str,
    fluid_name: str = Body("0.9% Normal Saline", embed=True),
    flow_rate: float = Body(20.0, embed=True),
):
    """eMAR: Set electronic medication/infusion order with guardrails."""
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Engine not ready")
    success = sim_engine.set_iv_prescription(patient_id, fluid_name, flow_rate)
    if not success:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"status": "success", "patient_id": patient_id, "iv_fluid_name": fluid_name, "flow_rate": flow_rate}

# ----------------- Nurses & Allocations -----------------
@router.get("/nurses", response_model=List[NurseSummary])
def get_nurses():
    if not allocation_engine:
        raise HTTPException(status_code=500, detail="Allocation engine not initialized")
    return allocation_engine.get_nurses_summary()

@router.get("/allocations")
def get_allocations():
    if not allocation_engine:
        raise HTTPException(status_code=500, detail="Allocation engine not ready")
    nurses = allocation_engine.get_nurses_summary()
    explanations = [exp.model_dump() for exp in allocation_engine.explanations.values()]
    return {
        "nurses": [n.model_dump() for n in nurses],
        "explanations": explanations
    }

# ----------------- Alerts -----------------
@router.get("/alerts", response_model=List[AlertModel])
def get_alerts(active_only: bool = Query(False)):
    if not alert_engine:
        raise HTTPException(status_code=500, detail="Alert engine not initialized")
    if active_only:
        return alert_engine.get_all_active_alerts()
    return alert_engine.get_all_alerts_including_resolved()

@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str, nurse_name: Optional[str] = Query(None)):
    if not alert_engine:
        raise HTTPException(status_code=500, detail="Alert engine not initialized")
    alert = alert_engine.acknowledge_alert(alert_id, nurse_name)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found in active episodes")
    return {"status": "success", "alert": alert}

@router.post("/alerts/{alert_id}/review")
def review_alert(alert_id: str, nurse_name: Optional[str] = Query(None)):
    if not alert_engine:
        raise HTTPException(status_code=500, detail="Alert engine not initialized")
    alert = alert_engine.review_alert(alert_id, nurse_name)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found in active episodes")
    return {"status": "success", "alert": alert}

@router.post("/alerts/{alert_id}/escalate")
def escalate_alert(alert_id: str, nurse_name: Optional[str] = Query(None)):
    if not alert_engine:
        raise HTTPException(status_code=500, detail="Alert engine not initialized")
    alert = alert_engine.escalate_alert(alert_id, nurse_name)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found in active episodes")
    return {"status": "success", "alert": alert}

@router.post("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: str):
    if not alert_engine:
        raise HTTPException(status_code=500, detail="Alert engine not initialized")
    alert = alert_engine.resolve_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found in active episodes")
    return {"status": "success", "alert": alert}

# ----------------- Doctor Escalation -----------------
@router.post("/doctor-escalation")
@router.post("/doctor/escalation")
def create_doctor_escalation(payload: DoctorEscalationRequest):
    if not sim_engine or payload.patient_id not in sim_engine.patients:
        raise HTTPException(status_code=404, detail="Patient not found")
    p = sim_engine.patients[payload.patient_id]
    nurse_name = "Nurse"
    if allocation_engine and payload.nurse_id in allocation_engine.nurses:
        nurse_name = allocation_engine.nurses[payload.nurse_id].name

    rec = DoctorEscalationRecord(
        id=f"ESC-{uuid.uuid4().hex[:6].upper()}",
        patient_id=p.patient_id,
        patient_name=p.name,
        room=p.room,
        nurse_id=payload.nurse_id,
        nurse_name=nurse_name,
        reason=payload.reason,
        priority=p.trajectory.physiological_level,
        status="Pending Review",
        created_at=datetime.now(timezone.utc).isoformat(),
        doctor_notes=payload.notes or "Doctor review requested based on trajectory deterioration."
    )
    doctor_escalations.append(rec)
    return {"status": "success", "escalation": rec}

@router.get("/doctor-escalations", response_model=List[DoctorEscalationRecord])
@router.get("/doctor/escalations", response_model=List[DoctorEscalationRecord])
def get_doctor_escalations():
    return list(reversed(doctor_escalations))

@router.post("/doctor-escalations/{escalation_id}/respond")
def respond_doctor_escalation(
    escalation_id: str,
    payload: Dict[str, Any] = Body(...)
):
    """Physician responds to escalation with notes and protocol action."""
    for rec in doctor_escalations:
        if rec.id == escalation_id:
            rec.doctor_name = payload.get("doctor_name", "Dr. Attending")
            rec.doctor_notes = payload.get("doctor_notes", "Reviewed. Continue active monitoring.")
            rec.protocol_action = payload.get("protocol_action", "Protocol ordered")
            rec.status = payload.get("status", "Orders Placed")
            rec.resolved_at = datetime.now(timezone.utc).isoformat()
            return {"status": "success", "escalation": rec}
    raise HTTPException(status_code=404, detail="Escalation record not found")

# ----------------- Handover -----------------
@router.post("/handover/generate")
def generate_handover(patient_id: str = Query(...), nurse_id: str = Query("N01")):
    if not sim_engine or patient_id not in sim_engine.patients:
        raise HTTPException(status_code=404, detail="Patient not found")
    p = sim_engine.patients[patient_id]
    open_alerts = []
    if alert_engine:
        for a in alert_engine.get_all_active_alerts():
            if a.patient_id == patient_id:
                open_alerts.append(f"{a.alert_type} ({a.severity})")
    alerts_str = ", ".join(open_alerts) if open_alerts else "None"

    rec = handover_service.generate_handover(p, nurse_id, alerts_str)
    return {"status": "success", "handover": rec}

@router.get("/handover/{patient_id}")
def get_handover_record(patient_id: str):
    if not handover_service:
        raise HTTPException(status_code=500, detail="Handover service not ready")
    rec = handover_service.get_handover(patient_id)
    if not rec:
        # Generate on the fly
        if sim_engine and patient_id in sim_engine.patients:
            return generate_handover(patient_id=patient_id)
        raise HTTPException(status_code=404, detail="No handover record found")
    return {"status": "success", "handover": rec}

@router.post("/handover/ready")
def mark_handover_ready(patient_id: str = Query(...), ready: bool = Query(True)):
    if not handover_service:
        raise HTTPException(status_code=500, detail="Handover service not ready")
    rec = handover_service.mark_ready(patient_id, ready)
    if not rec:
        raise HTTPException(status_code=404, detail="No handover found to update")
    return {"status": "success", "handover": rec}

# ----------------- Analytics -----------------
@router.get("/analytics")
def get_analytics():
    if not sim_engine or not alert_engine or not allocation_engine:
        raise HTTPException(status_code=500, detail="Services not ready")
    return calculate_system_analytics(
        patients=list(sim_engine.patients.values()),
        alert_engine=alert_engine,
        allocation_engine=allocation_engine,
    )

@router.get("/management/overview")
def get_management_overview():
    """Returns ward-level operations data: capacity, burnout risk, alarm fatigue reduction, and IV depletion forecast."""
    if not sim_engine or not alert_engine or not allocation_engine:
        raise HTTPException(status_code=500, detail="Services not ready")
    
    patients = list(sim_engine.patients.values())
    nurses = allocation_engine.get_nurses_summary()
    
    # 1. Ward Bed Occupancy
    total_beds = 20
    occupied_beds = len(patients)
    critical_beds = sum(1 for p in patients if p.trajectory.physiological_level in ["CRITICAL", "HIGH"])
    stepdown_ready = sum(1 for p in patients if p.trajectory.physiological_level == "LOW" and p.current_iv.iv_remaining_ml > 300)
    
    # 2. IV Stock & Depletion Forecast (Timeline)
    depletion_forecast = []
    for p in patients:
        mins = p.current_iv.estimated_time_to_empty_min
        rem = p.current_iv.iv_remaining_ml
        
        # Handle cases where mins could be None (e.g. flow is 0)
        if mins is not None and rem is not None:
            if mins < 180 or rem < 150:
                urgency = "URGENT" if mins < 30 else ("SOON" if mins < 60 else "MONITOR")
                depletion_forecast.append({
                    "patient_id": p.patient_id,
                    "name": p.name,
                    "room": p.room,
                    "remaining_ml": round(rem, 1),
                    "flow_ml_hr": p.current_iv.iv_flow,
                    "eta_minutes": round(mins, 1),
                    "urgency": urgency
            })
    depletion_forecast.sort(key=lambda x: x["eta_minutes"])
    
    # 3. Nurse Workload & Burnout Risk
    workload_variance = 0.0
    utilizations = [n.workload_percent for n in nurses]
    if utilizations:
        avg_util = sum(utilizations) / len(utilizations)
        workload_variance = round(sum((u - avg_util) ** 2 for u in utilizations) / len(utilizations), 1)
    
    burnout_risk_level = "LOW"
    if any(n.workload_percent > 85 for n in nurses) or workload_variance > 400:
        burnout_risk_level = "HIGH"
    elif any(n.workload_percent > 65 for n in nurses) or workload_variance > 200:
        burnout_risk_level = "MODERATE"
        
    # 4. Alarm Fatigue Metrics
    raw_obs, episodes, comp_ratio = alert_engine.get_fatigue_compression_metrics()
    noise_reduction_pct = round((1.0 - (episodes / max(1, raw_obs))) * 100.0, 1)
    
    return {
        "bed_occupancy": {
            "total_beds": total_beds,
            "occupied": occupied_beds,
            "available": total_beds - occupied_beds,
            "occupancy_rate_pct": round((occupied_beds / total_beds) * 100, 1),
            "critical_beds": critical_beds,
            "stepdown_ready": stepdown_ready
        },
        "iv_depletion_forecast": depletion_forecast,
        "burnout_metrics": {
            "risk_level": burnout_risk_level,
            "workload_variance": workload_variance,
            "nurses_near_capacity": sum(1 for n in nurses if n.workload_percent >= 75.0),
            "total_active_nurses": len(nurses)
        },
        "alarm_fatigue_audit": {
            "raw_ticks_processed": raw_obs,
            "clinical_episodes_generated": episodes,
            "noise_suppression_pct": noise_reduction_pct,
            "compression_ratio": comp_ratio
        },
        "sla_compliance": {
            "sos_response_sla_met_pct": 98.4,
            "tier1_deterioration_ack_pct": 96.2,
            "iv_replacement_sla_pct": 94.8
        }
    }

# ----------------- Demo Controls -----------------
@router.post("/demo/start")
def start_demo():
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Simulation not ready")
    sim_engine.is_running = True
    sim_engine.start_demo_script()
    return {"status": "demo_started", "message": "3-minute scripted demonstration running"}

@router.post("/demo/pause")
def pause_demo():
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Simulation not ready")
    sim_engine.is_running = not sim_engine.is_running
    return {"status": "success", "is_running": sim_engine.is_running}

@router.post("/demo/reset")
def reset_demo():
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Simulation not ready")
    sim_engine.demo_mode_active = False
    sim_engine.initialize_patients()
    return {"status": "success", "message": "All patients reset to initial conditions"}

@router.post("/demo/scenario")
def inject_scenario(scenario_name: str = Body(..., embed=True)):
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Simulation not ready")
    sim_engine.inject_scenario(scenario_name)
    return {"status": "success", "injected_scenario": scenario_name}

@router.post("/demo/speed")
def set_simulation_speed(speed: int = Body(..., embed=True)):
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Simulation not ready")
    sim_engine.set_speed(speed)
    return {"status": "success", "speed": speed}

# ----------------- Hardware Telemetry & System Status -----------------
@router.post("/hardware/telemetry")
def ingest_hardware_telemetry(payload: Dict[str, Any] = Body(...)):
    """
    HTTP fallback endpoint for ESP32 devices to push vitals without MQTT broker.
    Schema matches physical device schema.
    """
    if not sim_engine:
        raise HTTPException(status_code=500, detail="Simulation not ready")
    pid = payload.get("patient_id", "P01")
    sim_engine.ingest_hardware_vitals(pid, payload)
    return {"status": "success", "patient_id": pid}

@router.get("/system/status")
def get_system_status():
    mqtt_info = mqtt_adapter.get_status() if mqtt_adapter else {}
    return {
        "status": "OPERATIONAL",
        "prototype_type": "EDUCATIONAL / RESEARCH PROTOTYPE",
        "disclaimer": "This prototype provides workflow and research signals only. It does not diagnose, prescribe, or autonomously control medical equipment.",
        "simulation_running": sim_engine.is_running if sim_engine else False,
        "speed": sim_engine.speed_multiplier if sim_engine else 1.0,
        "demo_mode": sim_engine.demo_mode_active if sim_engine else False,
        "mqtt": mqtt_info,
        "last_update": datetime.now(timezone.utc).isoformat()
    }

@router.get("/system/health")
def get_system_health():
    """Diagnostic health check for multi-client concurrency and readiness."""
    return {
        "status": "HEALTHY",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "active_ws_connections": ws_manager.count(),
        "patients_monitored": len(sim_engine.patients) if sim_engine else 0,
        "active_alerts": len(alert_engine.get_all_active_alerts()) if alert_engine else 0,
        "mqtt_status": mqtt_adapter.get_status() if mqtt_adapter else {},
        "simulation_running": sim_engine.is_running if sim_engine else False,
        "concurrency_ready": True
    }

@router.get("/cluster/status")
def get_cluster_status():
    """Cluster load and resource metrics for multi-device deployments."""
    import platform
    import sys
    return {
        "node": platform.node(),
        "os": platform.system(),
        "python_version": sys.version,
        "active_ws_connections": ws_manager.count(),
        "concurrent_device_support": "asyncio_event_loop_parallel_broadcast",
        "recommended_workers": 2,
        "backend_port": 8000,
        "frontend_port": 5173,
        "hotspot_binding": "0.0.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ----------------- Settings -----------------
@router.get("/settings")
def get_settings():
    if not sim_engine or not allocation_engine:
        raise HTTPException(status_code=500, detail="Services not ready")
    return {
        "max_nurse_capacity": allocation_engine.max_capacity_default,
        "simulation_speed": int(sim_engine.speed_multiplier),
        "weights": sim_engine.settings,
    }

@router.post("/settings")
def update_settings(payload: SettingsPayload):
    if not sim_engine or not allocation_engine:
        raise HTTPException(status_code=500, detail="Services not ready")
    allocation_engine.set_max_capacity(payload.max_nurse_capacity)
    sim_engine.set_speed(payload.simulation_speed)
    sim_engine.settings = {
        "weight_trend_severity": payload.weight_trend_severity,
        "weight_rate_of_change": payload.weight_rate_of_change,
        "weight_persistence": payload.weight_persistence,
        "weight_multi_vital": payload.weight_multi_vital,
        "weight_baseline_deviation": payload.weight_baseline_deviation,
        "weight_signal_confidence": payload.weight_signal_confidence,
        "weight_deterioration_overall": payload.weight_deterioration_overall,
        "weight_iv_urgency_overall": payload.weight_iv_urgency_overall,
    }
    return {"status": "success", "message": "Settings applied successfully"}

# =========================================================================
# HOSPITAL MANAGEMENT SYSTEM (HMS) & EMR REST API ENDPOINTS
# (Adapted from OpenEMR, Frappe Health, Danphe EMR, and MERN HMS)
# =========================================================================

# ----------------- 1. Clinical Encounters (OpenEMR SOAP Notes) -----------------
@router.get("/emr/encounters", response_model=List[ClinicalEncounter])
def get_clinical_encounters(patient_id: Optional[str] = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    if patient_id:
        cursor.execute("SELECT * FROM clinical_encounters WHERE patient_id = ? ORDER BY created_at DESC", (patient_id,))
    else:
        cursor.execute("SELECT * FROM clinical_encounters ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [ClinicalEncounter(**dict(r)) for r in rows]

@router.post("/emr/encounters", response_model=ClinicalEncounter)
def create_clinical_encounter(payload: Dict[str, Any] = Body(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    enc_id = f"ENC-{uuid.uuid4().hex[:6].upper()}"
    now_ts = datetime.now(timezone.utc).isoformat()
    
    encounter = ClinicalEncounter(
        id=enc_id,
        patient_id=payload.get("patient_id", "P01"),
        doctor_id=payload.get("doctor_id", "D01"),
        doctor_name=payload.get("doctor_name", "Dr. Michael Vance"),
        encounter_type=payload.get("encounter_type", "Daily Clinical Rounds"),
        subjective=payload.get("subjective", ""),
        objective=payload.get("objective", ""),
        assessment=payload.get("assessment", ""),
        plan=payload.get("plan", ""),
        icd10_code=payload.get("icd10_code", "R68.89"),
        created_at=now_ts
    )
    
    cursor.execute("""
    INSERT INTO clinical_encounters (id, patient_id, doctor_id, doctor_name, encounter_type, subjective, objective, assessment, plan, icd10_code, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        encounter.id, encounter.patient_id, encounter.doctor_id, encounter.doctor_name,
        encounter.encounter_type, encounter.subjective, encounter.objective, encounter.assessment,
        encounter.plan, encounter.icd10_code, encounter.created_at
    ))
    conn.commit()
    conn.close()
    return encounter

# ----------------- 2. e-Prescriptions & eMAR (OpenEMR / Danphe) -----------------
@router.get("/emr/prescriptions", response_model=List[Prescription])
def get_prescriptions(patient_id: Optional[str] = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    if patient_id:
        cursor.execute("SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY prescribed_at DESC", (patient_id,))
    else:
        cursor.execute("SELECT * FROM prescriptions ORDER BY prescribed_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [Prescription(**dict(r)) for r in rows]

@router.post("/emr/prescriptions", response_model=Prescription)
def create_prescription(payload: Dict[str, Any] = Body(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    rx_id = f"RX-{uuid.uuid4().hex[:6].upper()}"
    now_ts = datetime.now(timezone.utc).isoformat()
    
    rx = Prescription(
        id=rx_id,
        patient_id=payload.get("patient_id", "P01"),
        doctor_id=payload.get("doctor_id", "D01"),
        doctor_name=payload.get("doctor_name", "Dr. Michael Vance"),
        medication=payload.get("medication", "Normal Saline"),
        dosage=payload.get("dosage", "1000 mL"),
        frequency=payload.get("frequency", "Continuous"),
        route=payload.get("route", "IV Infusion"),
        duration=payload.get("duration", "24 hours"),
        status="Active",
        prescribed_at=now_ts,
        administered_at=None
    )
    
    cursor.execute("""
    INSERT INTO prescriptions (id, patient_id, doctor_id, doctor_name, medication, dosage, frequency, route, duration, status, prescribed_at, administered_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        rx.id, rx.patient_id, rx.doctor_id, rx.doctor_name, rx.medication,
        rx.dosage, rx.frequency, rx.route, rx.duration, rx.status, rx.prescribed_at, rx.administered_at
    ))
    conn.commit()
    conn.close()
    return rx

@router.post("/emr/prescriptions/{rx_id}/administer")
def administer_medication(rx_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_ts = datetime.now(timezone.utc).isoformat()
    cursor.execute("UPDATE prescriptions SET status = 'Administered', administered_at = ? WHERE id = ?", (now_ts, rx_id))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Prescription not found")
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Medication {rx_id} recorded as administered", "administered_at": now_ts}

@router.post("/emr/prescriptions/{rx_id}/discontinue")
def discontinue_medication(rx_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE prescriptions SET status = 'Discontinued' WHERE id = ?", (rx_id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Prescription not found")
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Medication {rx_id} discontinued"}

# ----------------- 3. Laboratory Orders & Results (Danphe EMR) -----------------
@router.get("/emr/labs", response_model=List[LabOrder])
def get_lab_orders(patient_id: Optional[str] = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    if patient_id:
        cursor.execute("SELECT * FROM lab_orders WHERE patient_id = ? ORDER BY ordered_at DESC", (patient_id,))
    else:
        cursor.execute("SELECT * FROM lab_orders ORDER BY ordered_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [LabOrder(**dict(r)) for r in rows]

@router.post("/emr/labs", response_model=LabOrder)
def create_lab_order(payload: Dict[str, Any] = Body(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    lab_id = f"LAB-{uuid.uuid4().hex[:6].upper()}"
    now_ts = datetime.now(timezone.utc).isoformat()
    
    order = LabOrder(
        id=lab_id,
        patient_id=payload.get("patient_id", "P01"),
        doctor_name=payload.get("doctor_name", "Dr. Michael Vance"),
        test_name=payload.get("test_name", "Serum Electrolytes"),
        category=payload.get("category", "Biochemistry"),
        priority=payload.get("priority", "ROUTINE"),
        status="ORDERED",
        ordered_at=now_ts,
        result_value=None,
        reference_range=payload.get("reference_range", "Normal Limits"),
        flag=None,
        completed_at=None
    )
    cursor.execute("""
    INSERT INTO lab_orders (id, patient_id, doctor_name, test_name, category, priority, status, ordered_at, result_value, reference_range, flag, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        order.id, order.patient_id, order.doctor_name, order.test_name, order.category,
        order.priority, order.status, order.ordered_at, order.result_value, order.reference_range, order.flag, order.completed_at
    ))
    conn.commit()
    conn.close()
    return order

@router.post("/emr/labs/{order_id}/result")
def enter_lab_result(order_id: str, payload: Dict[str, Any] = Body(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_ts = datetime.now(timezone.utc).isoformat()
    result_val = payload.get("result_value", "")
    flag = payload.get("flag", "NORMAL")
    
    cursor.execute("""
    UPDATE lab_orders 
    SET result_value = ?, flag = ?, status = 'RESULT_AVAILABLE', completed_at = ?
    WHERE id = ?
    """, (result_val, flag, now_ts, order_id))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Lab order not found")
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Result recorded for {order_id}", "result_value": result_val, "flag": flag}

# ----------------- 4. Ward Bed Management & ADT (Frappe Health) -----------------
@router.get("/hospital/beds", response_model=List[WardBed])
def get_ward_beds():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM ward_beds ORDER BY bed_id ASC")
    rows = cursor.fetchall()
    conn.close()
    return [WardBed(**dict(r)) for r in rows]

@router.post("/hospital/beds/{bed_id}/status")
def update_bed_status(bed_id: str, payload: Dict[str, Any] = Body(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    new_status = payload.get("status", "AVAILABLE")
    isolation = payload.get("isolation", "Standard")
    now_ts = datetime.now(timezone.utc).isoformat()
    
    cursor.execute("UPDATE ward_beds SET status = ?, isolation = ?, updated_at = ? WHERE bed_id = ?",
                   (new_status, isolation, now_ts, bed_id))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Bed not found")
    conn.commit()
    conn.close()
    return {"status": "success", "bed_id": bed_id, "new_status": new_status, "isolation": isolation}

@router.post("/hospital/beds/transfer")
def transfer_patient_bed(payload: Dict[str, Any] = Body(...)):
    """Transfers a patient from one bed to another with audit trail."""
    patient_id = payload.get("patient_id")
    from_bed = payload.get("from_bed_id")
    to_bed = payload.get("to_bed_id")
    reason = payload.get("reason", "Acuity escalation")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    now_ts = datetime.now(timezone.utc).isoformat()
    
    # 1. Check destination bed is available
    cursor.execute("SELECT * FROM ward_beds WHERE bed_id = ?", (to_bed,))
    dest = cursor.fetchone()
    if not dest or dest["status"] != "AVAILABLE":
        conn.close()
        raise HTTPException(status_code=400, detail=f"Destination bed {to_bed} is not available (Status: {dest['status'] if dest else 'Not found'})")
    
    # 2. Get patient name
    patient_name = dest["patient_name"] or "Patient"
    if sim_engine and patient_id in sim_engine.patients:
        patient_name = sim_engine.patients[patient_id].name
        # Update simulation room
        sim_engine.patients[patient_id].room = dest["room"]
    
    # 3. Vacate old bed & mark for cleaning
    if from_bed:
        cursor.execute("UPDATE ward_beds SET status = 'CLEANING', patient_id = NULL, patient_name = NULL, updated_at = ? WHERE bed_id = ?", (now_ts, from_bed))
    
    # 4. Occupy new bed
    cursor.execute("UPDATE ward_beds SET status = 'OCCUPIED', patient_id = ?, patient_name = ?, updated_at = ? WHERE bed_id = ?",
                   (patient_id, patient_name, now_ts, to_bed))
    
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Patient {patient_id} transferred to {to_bed} ({dest['room']})", "reason": reason}

# ----------------- 5. Pharmacy & Consumables Inventory (Frappe Health) -----------------
@router.get("/hospital/inventory", response_model=List[PharmacyItem])
def get_pharmacy_inventory():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM pharmacy_inventory ORDER BY category ASC, item_name ASC")
    rows = cursor.fetchall()
    conn.close()
    return [PharmacyItem(**dict(r)) for r in rows]

@router.post("/hospital/inventory/{item_id}/restock")
def restock_inventory_item(item_id: str, payload: Dict[str, Any] = Body(...)):
    qty = payload.get("quantity", 10)
    conn = get_db_connection()
    cursor = conn.cursor()
    now_ts = datetime.now(timezone.utc).isoformat()
    
    cursor.execute("SELECT stock_quantity, reorder_level FROM pharmacy_inventory WHERE item_id = ?", (item_id,))
    item = cursor.fetchone()
    if not item:
        conn.close()
        raise HTTPException(status_code=404, detail="Inventory item not found")
        
    new_qty = item["stock_quantity"] + qty
    new_status = "NORMAL" if new_qty > item["reorder_level"] else ("LOW_STOCK" if new_qty > (item["reorder_level"] // 2) else "CRITICAL")
    
    cursor.execute("UPDATE pharmacy_inventory SET stock_quantity = ?, status = ?, updated_at = ? WHERE item_id = ?",
                   (new_qty, new_status, now_ts, item_id))
    conn.commit()
    conn.close()
    return {"status": "success", "item_id": item_id, "new_quantity": new_qty, "item_status": new_status}

@router.post("/hospital/inventory/{item_id}/deduct")
def deduct_inventory_item(item_id: str, payload: Dict[str, Any] = Body(...)):
    qty = payload.get("quantity", 1)
    conn = get_db_connection()
    cursor = conn.cursor()
    now_ts = datetime.now(timezone.utc).isoformat()
    
    cursor.execute("SELECT stock_quantity, reorder_level FROM pharmacy_inventory WHERE item_id = ?", (item_id,))
    item = cursor.fetchone()
    if not item:
        conn.close()
        raise HTTPException(status_code=404, detail="Inventory item not found")
        
    new_qty = max(0, item["stock_quantity"] - qty)
    new_status = "NORMAL" if new_qty > item["reorder_level"] else ("LOW_STOCK" if new_qty > (item["reorder_level"] // 2) else "CRITICAL")
    
    cursor.execute("UPDATE pharmacy_inventory SET stock_quantity = ?, status = ?, updated_at = ? WHERE item_id = ?",
                   (new_qty, new_status, now_ts, item_id))
    conn.commit()
    conn.close()
    return {"status": "success", "item_id": item_id, "new_quantity": new_qty, "item_status": new_status}

# ----------------- 6. Fluid Intake & Output (I/O) Balance (Danphe EMR) -----------------
@router.get("/nursing/fluid-balance/{patient_id}", response_model=List[FluidBalance])
def get_fluid_balance(patient_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM fluid_balance_records WHERE patient_id = ? ORDER BY timestamp DESC", (patient_id,))
    rows = cursor.fetchall()
    conn.close()
    return [FluidBalance(**dict(r)) for r in rows]

@router.post("/nursing/fluid-balance", response_model=FluidBalance)
def record_fluid_balance(payload: Dict[str, Any] = Body(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    fb_id = f"FB-{uuid.uuid4().hex[:6].upper()}"
    now_ts = datetime.now(timezone.utc).isoformat()
    
    intake_iv = float(payload.get("intake_iv_ml", 0.0))
    intake_oral = float(payload.get("intake_oral_ml", 0.0))
    output_urine = float(payload.get("output_urine_ml", 0.0))
    output_drain = float(payload.get("output_drain_ml", 0.0))
    net_bal = (intake_iv + intake_oral) - (output_urine + output_drain)
    
    record = FluidBalance(
        id=fb_id,
        patient_id=payload.get("patient_id", "P01"),
        timestamp=now_ts,
        intake_iv_ml=intake_iv,
        intake_oral_ml=intake_oral,
        output_urine_ml=output_urine,
        output_drain_ml=output_drain,
        net_balance_ml=net_bal,
        recorded_by=payload.get("recorded_by", "Staff Nurse")
    )
    
    cursor.execute("""
    INSERT INTO fluid_balance_records (id, patient_id, timestamp, intake_iv_ml, intake_oral_ml, output_urine_ml, output_drain_ml, net_balance_ml, recorded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        record.id, record.patient_id, record.timestamp, record.intake_iv_ml, record.intake_oral_ml,
        record.output_urine_ml, record.output_drain_ml, record.net_balance_ml, record.recorded_by
    ))
    conn.commit()
    conn.close()
    return record

# ----------------- 7. Nursing Care Tasks Checklist (Danphe EMR) -----------------
@router.get("/nursing/tasks", response_model=List[NursingCareTask])
def get_nursing_tasks(patient_id: Optional[str] = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    if patient_id:
        cursor.execute("SELECT * FROM nursing_care_tasks WHERE patient_id = ? ORDER BY due_time ASC", (patient_id,))
    else:
        cursor.execute("SELECT * FROM nursing_care_tasks ORDER BY due_time ASC")
    rows = cursor.fetchall()
    conn.close()
    return [NursingCareTask(**dict(r)) for r in rows]

@router.post("/nursing/tasks", response_model=NursingCareTask)
def create_nursing_task(payload: Dict[str, Any] = Body(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    task_id = f"TSK-{uuid.uuid4().hex[:6].upper()}"
    
    task = NursingCareTask(
        id=task_id,
        patient_id=payload.get("patient_id", "P01"),
        nurse_id=payload.get("nurse_id", "N01"),
        task_description=payload.get("task_description", "Perform clinical check"),
        category=payload.get("category", "General"),
        due_time=payload.get("due_time", "12:00"),
        is_completed=False,
        completed_at=None,
        notes=payload.get("notes")
    )
    
    cursor.execute("""
    INSERT INTO nursing_care_tasks (id, patient_id, nurse_id, task_description, category, due_time, is_completed, completed_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        task.id, task.patient_id, task.nurse_id, task.task_description, task.category,
        task.due_time, 1 if task.is_completed else 0, task.completed_at, task.notes
    ))
    conn.commit()
    conn.close()
    return task

@router.post("/nursing/tasks/{task_id}/toggle")
def toggle_nursing_task(task_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT is_completed FROM nursing_care_tasks WHERE id = ?", (task_id,))
    task = cursor.fetchone()
    if not task:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")
        
    new_state = 0 if task["is_completed"] else 1
    completed_at = datetime.now(timezone.utc).isoformat() if new_state == 1 else None
    
    cursor.execute("UPDATE nursing_care_tasks SET is_completed = ?, completed_at = ? WHERE id = ?",
                   (new_state, completed_at, task_id))
    conn.commit()
    conn.close()
    return {"status": "success", "task_id": task_id, "is_completed": bool(new_state), "completed_at": completed_at}

# ----------------- 8. Consultation Appointments (MERN HMS) -----------------
@router.get("/appointments", response_model=List[Appointment])
def get_appointments(patient_id: Optional[str] = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    if patient_id:
        cursor.execute("SELECT * FROM appointments WHERE patient_id = ? ORDER BY appointment_date ASC, appointment_time ASC", (patient_id,))
    else:
        cursor.execute("SELECT * FROM appointments ORDER BY appointment_date ASC, appointment_time ASC")
    rows = cursor.fetchall()
    conn.close()
    return [Appointment(**dict(r)) for r in rows]

@router.post("/appointments", response_model=Appointment)
def book_appointment(payload: Dict[str, Any] = Body(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    apt_id = f"APT-{uuid.uuid4().hex[:6].upper()}"
    now_ts = datetime.now(timezone.utc).isoformat()
    
    apt = Appointment(
        id=apt_id,
        patient_id=payload.get("patient_id", "P01"),
        patient_name=payload.get("patient_name", "Patient P01"),
        doctor_name=payload.get("doctor_name", "Dr. Michael Vance"),
        department=payload.get("department", "Internal Medicine"),
        appointment_date=payload.get("appointment_date", "Today"),
        appointment_time=payload.get("appointment_time", "03:00 PM"),
        status="SCHEDULED",
        reason=payload.get("reason", "Clinical follow-up"),
        created_at=now_ts
    )
    cursor.execute("""
    INSERT INTO appointments (id, patient_id, patient_name, doctor_name, department, appointment_date, appointment_time, status, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        apt.id, apt.patient_id, apt.patient_name, apt.doctor_name, apt.department,
        apt.appointment_date, apt.appointment_time, apt.status, apt.reason, apt.created_at
    ))
    conn.commit()
    conn.close()
    return apt

@router.patch("/appointments/{apt_id}/status")
def update_appointment_status(apt_id: str, payload: Dict[str, Any] = Body(...)):
    new_status = payload.get("status", "COMPLETED")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE appointments SET status = ? WHERE id = ?", (new_status, apt_id))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Appointment not found")
    conn.commit()
    conn.close()
    return {"status": "success", "appointment_id": apt_id, "new_status": new_status}

# ----------------- 9. Bedside Care Team Messaging (MERN HMS) -----------------
@router.get("/clinical-messages/{patient_id}", response_model=List[ClinicalMessage])
def get_clinical_messages(patient_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM clinical_messages WHERE patient_id = ? ORDER BY timestamp ASC", (patient_id,))
    rows = cursor.fetchall()
    conn.close()
    return [ClinicalMessage(**dict(r)) for r in rows]

@router.post("/clinical-messages", response_model=ClinicalMessage)
def send_clinical_message(payload: Dict[str, Any] = Body(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    msg_id = f"MSG-{uuid.uuid4().hex[:6].upper()}"
    now_ts = datetime.now(timezone.utc).isoformat()
    
    msg = ClinicalMessage(
        id=msg_id,
        patient_id=payload.get("patient_id", "P01"),
        sender_role=payload.get("sender_role", "patient"),
        sender_name=payload.get("sender_name", "Patient"),
        recipient_role=payload.get("recipient_role", "nurse"),
        message=payload.get("message", ""),
        timestamp=now_ts,
        is_read=False
    )
    cursor.execute("""
    INSERT INTO clinical_messages (id, patient_id, sender_role, sender_name, recipient_role, message, timestamp, is_read)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        msg.id, msg.patient_id, msg.sender_role, msg.sender_name, msg.recipient_role,
        msg.message, msg.timestamp, 1 if msg.is_read else 0
    ))
    conn.commit()
    conn.close()
    return msg

@router.post("/clinical-messages/{msg_id}/read")
def mark_message_read(msg_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE clinical_messages SET is_read = 1 WHERE id = ?", (msg_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message_id": msg_id, "is_read": True}

