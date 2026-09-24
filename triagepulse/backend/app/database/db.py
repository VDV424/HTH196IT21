import sqlite3
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any

DB_PATH = Path(__file__).resolve().parent.parent.parent / "triagepulse.db"

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS patients (
        patient_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        room TEXT NOT NULL,
        scenario TEXT NOT NULL,
        data_source TEXT NOT NULL DEFAULT 'SIMULATION', -- 'SIMULATION' or 'PHYSICAL_DEVICE'
        device_id TEXT,
        baseline_hr REAL NOT NULL DEFAULT 75.0,
        baseline_spo2 REAL NOT NULL DEFAULT 98.0,
        baseline_temp REAL NOT NULL DEFAULT 36.8,
        baseline_motion REAL NOT NULL DEFAULT 0.1,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vital_observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        heart_rate REAL,
        spo2 REAL,
        temperature REAL,
        motion REAL,
        signal_quality TEXT NOT NULL DEFAULT 'GOOD',
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
    );

    CREATE TABLE IF NOT EXISTS iv_observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        iv_weight REAL,
        iv_flow REAL,
        iv_remaining_ml REAL,
        iv_state TEXT NOT NULL DEFAULT 'NORMAL',
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL, -- 'WATCH', 'REVIEW', 'HIGH_ATTENTION', 'IMMEDIATE_REVIEW'
        title TEXT NOT NULL,
        reason TEXT NOT NULL,
        assigned_nurse TEXT,
        status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED'
        raw_observations_count INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        acknowledged_at TEXT,
        reviewed_at TEXT,
        escalated_at TEXT,
        resolved_at TEXT,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
    );

    CREATE TABLE IF NOT EXISTS alert_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        details TEXT,
        FOREIGN KEY (alert_id) REFERENCES alerts(id)
    );

    CREATE TABLE IF NOT EXISTS nurses (
        nurse_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'Staff Nurse',
        ward TEXT NOT NULL,
        max_capacity INTEGER NOT NULL DEFAULT 5,
        capabilities TEXT NOT NULL, -- comma separated, e.g. 'Critical observation,Rapid response'
        is_online INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS nurse_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT NOT NULL,
        nurse_id TEXT NOT NULL,
        priority_at_assignment REAL NOT NULL,
        reason TEXT NOT NULL,
        assigned_at TEXT NOT NULL,
        unassigned_at TEXT,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
        FOREIGN KEY (nurse_id) REFERENCES nurses(nurse_id)
    );

    CREATE TABLE IF NOT EXISTS escalations (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        nurse_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending Review',
        created_at TEXT NOT NULL,
        resolved_at TEXT,
        doctor_notes TEXT,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
    );

    CREATE TABLE IF NOT EXISTS handover_records (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        nurse_id TEXT NOT NULL,
        summary_text TEXT NOT NULL,
        trajectory_snapshot TEXT NOT NULL,
        is_ready INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
    );

    CREATE TABLE IF NOT EXISTS system_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        details TEXT,
        timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    """)

    # Seed default nurses if not present
    cursor.execute("SELECT COUNT(*) FROM nurses")
    if cursor.fetchone()[0] == 0:
        cursor.executemany("""
        INSERT INTO nurses (nurse_id, name, role, ward, max_capacity, capabilities, is_online)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, [
            ("N01", "Nurse A", "Critical Care Specialist", "Ward East", 5, "Critical observation,Rapid response,Telemetry", 1),
            ("N02", "Nurse B", "Senior Triage Nurse", "Ward Central", 5, "Critical observation,Telemetry,IV Therapy", 1),
            ("N03", "Nurse C", "General Ward Care", "Ward West", 5, "General observation,IV Therapy,Post-op care", 1),
        ])

    # Seed default settings
    default_settings = {
        "max_nurse_capacity": "5",
        "simulation_speed": "1",
        "alert_persistence_ticks": "3",
        "weight_trend_severity": "0.30",
        "weight_rate_of_change": "0.20",
        "weight_persistence": "0.15",
        "weight_multi_vital": "0.15",
        "weight_baseline_deviation": "0.10",
        "weight_signal_confidence": "0.10",
        "weight_deterioration_overall": "0.65",
        "weight_iv_urgency_overall": "0.35"
    }
    for k, v in default_settings.items():
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, v))

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at", DB_PATH)
