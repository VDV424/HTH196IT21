import { useState, useEffect, useRef } from 'react';
import { Patient, Nurse, Alert, KPIs, AllocationExplanation } from '../types';

interface WSState {
  patients: Patient[];
  nurses: Nurse[];
  alerts: Alert[];
  kpis: KPIs | null;
  explanations: AllocationExplanation[];
  isConnected: boolean;
  simulationStatus: {
    is_running: boolean;
    speed: number;
    demo_mode: boolean;
    demo_step?: number;
  };
}

export function useWebSocket() {
  const [state, setState] = useState<WSState>({
    patients: [],
    nurses: [],
    alerts: [],
    kpis: null,
    explanations: [],
    isConnected: false,
    simulationStatus: { is_running: true, speed: 1, demo_mode: false }
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const connect = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setState(prev => ({ ...prev, isConnected: true }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'TICK_UPDATE' || data.type === 'INITIAL_STATE') {
            setState(prev => ({
              ...prev,
              patients: data.patients || prev.patients,
              nurses: data.nurses || prev.nurses,
              alerts: data.alerts || prev.alerts,
              kpis: data.kpis || prev.kpis,
              explanations: data.explanations || prev.explanations,
              simulationStatus: data.simulation_status || prev.simulationStatus
            }));
          }
        } catch (err) {
          console.error("WS Parse error:", err);
        }
      };

      ws.onclose = () => {
        setState(prev => ({ ...prev, isConnected: false }));
        // Try reconnecting in 2s
        reconnectTimeoutRef.current = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error("WebSocket init failed:", e);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  };

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  return state;
}
