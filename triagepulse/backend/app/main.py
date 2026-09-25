import os
import asyncio
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse

from .database.db import init_db
from .services.alert_engine import AlertEngine
from .services.allocation import NurseAllocationEngine
from .services.handover import HandoverService
from .simulation.engine import SimulationEngine
from .analytics.metrics import calculate_system_analytics
from .mqtt.adapter import MQTTAdapter
from .api.routes import router as api_router, set_app_state
from .api.websocket import ws_manager

# Singletons
alert_engine = AlertEngine()
allocation_engine = NurseAllocationEngine(max_capacity_default=5)
handover_service = HandoverService()
mqtt_adapter = MQTTAdapter()
sim_engine = SimulationEngine(alert_engine=alert_engine, allocation_engine=allocation_engine)

# Connect MQTT adapter callback to simulation engine
mqtt_adapter.on_patient_data = lambda pid, vitals: sim_engine.ingest_hardware_vitals(pid, vitals)

# Wire dependencies into routes
set_app_state(sim_engine, alert_engine, allocation_engine, handover_service, mqtt_adapter)

async def periodic_broadcast():
    """
    Broadcasts real-time patient updates, trajectory scores, alert episodes,
    and nurse allocations to all connected WebSocket clients.
    """
    while True:
        try:
            if ws_manager.active_connections:
                patients = list(sim_engine.patients.values())
                patients.sort(key=lambda p: p.trajectory.attention_priority, reverse=True)
                analytics = calculate_system_analytics(patients, alert_engine, allocation_engine)
                payload = {
                    "type": "TICK_UPDATE",
                    "patients": [p.model_dump() for p in patients],
                    "nurses": [n.model_dump() for n in allocation_engine.get_nurses_summary()],
                    "alerts": [a.model_dump() for a in alert_engine.get_all_active_alerts()],
                    "kpis": analytics["kpis"],
                    "explanations": [exp.model_dump() for exp in allocation_engine.explanations.values()],
                    "simulation_status": {
                        "is_running": sim_engine.is_running,
                        "speed": sim_engine.speed_multiplier,
                        "demo_mode": sim_engine.demo_mode_active,
                        "demo_step": sim_engine.demo_script_step,
                        "live_mode": sim_engine.live_mode
                    }
                }
                await ws_manager.broadcast(payload)
        except Exception as e:
            print(f"Error in broadcast loop: {e}")
        await asyncio.sleep(1.0)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    sim_task = asyncio.create_task(sim_engine.run_loop())
    broadcast_task = asyncio.create_task(periodic_broadcast())
    yield
    # Shutdown
    sim_task.cancel()
    broadcast_task.cancel()

app = FastAPI(
    title="TriagePulse API",
    description="Trajectory-aware patient monitoring, IV oversight and capacity-aware nurse triage (Educational / Research Prototype)",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial immediate snapshot
        patients = list(sim_engine.patients.values())
        patients.sort(key=lambda p: p.trajectory.attention_priority, reverse=True)
        analytics = calculate_system_analytics(patients, alert_engine, allocation_engine)
        initial_msg = {
            "type": "INITIAL_STATE",
            "patients": [p.model_dump() for p in patients],
            "nurses": [n.model_dump() for n in allocation_engine.get_nurses_summary()],
            "alerts": [a.model_dump() for a in alert_engine.get_all_active_alerts()],
            "kpis": analytics["kpis"],
            "explanations": [exp.model_dump() for exp in allocation_engine.explanations.values()],
            "simulation_status": {
                "is_running": sim_engine.is_running,
                "speed": sim_engine.speed_multiplier,
                "demo_mode": sim_engine.demo_mode_active,
                "live_mode": sim_engine.live_mode,
            }
        }
        await websocket.send_json(initial_msg)

        while True:
            # Keep connection alive & handle incoming client messages (e.g. ping)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

# Static files / Frontend serving if built
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
