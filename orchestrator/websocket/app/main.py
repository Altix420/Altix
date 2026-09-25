from __future__ import annotations

import asyncio
import inspect
import json
import logging
import os
from contextlib import asynccontextmanager, suppress
from typing import Any

import redis.asyncio as redis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect


logger = logging.getLogger("altix.websocket")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())

SERVICE_NAME = "altix-websocket-gateway"
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
REDIS_URL = os.getenv("REDIS_URL")
REDIS_CHANNEL = os.getenv("REDIS_CHANNEL", "altix.events")
REDIS_RECONNECT_SECONDS = float(os.getenv("REDIS_RECONNECT_SECONDS", "3"))


def json_message(message_type: str, payload: dict[str, Any]) -> str:
    return json.dumps(
        {"type": message_type, "payload": payload},
        ensure_ascii=False,
        separators=(",", ":"),
    )


def build_redis_client() -> redis.Redis:
    if REDIS_URL:
        return redis.from_url(REDIS_URL, decode_responses=True)

    return redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        password=REDIS_PASSWORD,
        decode_responses=True,
        socket_keepalive=True,
        health_check_interval=30,
    )


async def close_resource(resource: Any) -> None:
    close = getattr(resource, "aclose", None) or getattr(resource, "close", None)
    if close is None:
        return

    result = close()
    if inspect.isawaitable(result):
        await result


class ConnectionManager:
    def __init__(self) -> None:
        self._clients: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._clients.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._clients.discard(websocket)

    async def count(self) -> int:
        async with self._lock:
            return len(self._clients)

    async def broadcast(self, message: str) -> None:
        async with self._lock:
            clients = tuple(self._clients)

        if not clients:
            return

        results = await asyncio.gather(
            *(self._send(client, message) for client in clients),
            return_exceptions=True,
        )

        stale_clients = [
            client
            for client, result in zip(clients, results)
            if isinstance(result, Exception)
        ]

        if stale_clients:
            async with self._lock:
                for client in stale_clients:
                    self._clients.discard(client)

    @staticmethod
    async def _send(client: WebSocket, message: str) -> None:
        await client.send_text(message)


manager = ConnectionManager()


async def redis_listener(app: FastAPI) -> None:
    while True:
        pubsub: redis.client.PubSub | None = None

        try:
            client: redis.Redis = app.state.redis
            pubsub = client.pubsub()
            await pubsub.subscribe(REDIS_CHANNEL)
            logger.info("Listening for Redis events on channel %s", REDIS_CHANNEL)

            async for message in pubsub.listen():
                if message.get("type") != "message":
                    continue

                data = message.get("data")
                if data is None:
                    continue

                await manager.broadcast(str(data))

        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception(
                "Redis listener failed; retrying in %.1f seconds",
                REDIS_RECONNECT_SECONDS,
            )
            await asyncio.sleep(REDIS_RECONNECT_SECONDS)
        finally:
            if pubsub is not None:
                with suppress(Exception):
                    await close_resource(pubsub)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = build_redis_client()
    app.state.redis_listener_task = asyncio.create_task(redis_listener(app))

    try:
        yield
    finally:
        app.state.redis_listener_task.cancel()
        with suppress(asyncio.CancelledError):
            await app.state.redis_listener_task
        await close_resource(app.state.redis)


app = FastAPI(title="ALTIX WebSocket Gateway", version="0.1", lifespan=lifespan)


@app.get("/health")
async def health():
    redis_status = "unknown"

    try:
        redis_status = "ok" if await app.state.redis.ping() else "unavailable"
    except Exception:
        redis_status = "unavailable"

    return {
        "status": "ok",
        "service": SERVICE_NAME,
        "redis": {
            "status": redis_status,
            "host": REDIS_HOST,
            "port": REDIS_PORT,
            "db": REDIS_DB,
            "channel": REDIS_CHANNEL,
        },
        "clients": await manager.count(),
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)

    try:
        await websocket.send_text(
            json_message(
                "client.connected",
                {"message": "Connected to ALTIX WebSocket Gateway"},
            )
        )

        while True:
            message = await websocket.receive_text()

            if message.strip().lower() == "ping":
                await websocket.send_text(json_message("pong", {}))

    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("WebSocket client error")
    finally:
        await manager.disconnect(websocket)
