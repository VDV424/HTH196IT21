import json
import asyncio
from typing import Set
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    def count(self) -> int:
        return len(self.active_connections)

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
        message_str = json.dumps(message)
        
        async def send(conn: WebSocket):
            try:
                await conn.send_text(message_str)
                return None
            except Exception:
                return conn

        # Parallel broadcast across all connected clients to prevent lag/stalling on slow mobile connections
        conns = list(self.active_connections)
        results = await asyncio.gather(*(send(c) for c in conns), return_exceptions=True)
        for res in results:
            if isinstance(res, WebSocket):
                self.disconnect(res)

ws_manager = ConnectionManager()
