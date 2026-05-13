# =============================================================================
# BACKEND: main.py
# Stack: FastAPI + SQLite (via SQLAlchemy) + WebSockets
# Python 3.11+
#
# Responsibilities:
#   1. SQLite database schema (users, rooms, messages)
#   2. Pydantic schemas (request/response validation)
#   3. WebSocket connection manager (real-time messaging)
#   4. REST endpoints (register, login, rooms, message history)
#   5. WebSocket endpoint (live chat)
# =============================================================================

import os

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
import json
import hashlib

# =============================================================================
# SECTION 1: DATABASE SETUP
# SQLite stores everything in chat.db — a single file on disk.
# SQLAlchemy is the ORM: it translates Python classes into SQL tables.
# =============================================================================

DATABASE_URL = "sqlite:///./chat.db"

# create_engine opens the connection to the .db file.
# check_same_thread=False is required for SQLite + FastAPI (multi-threaded).
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# SessionLocal is a factory. Each HTTP request gets its own DB session.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All models inherit from Base so SQLAlchemy knows about them.
Base = declarative_base()


# =============================================================================
# SECTION 2: DATABASE MODELS (SQLite tables)
# Each class = one table. Each Column = one column in that table.
# =============================================================================

class User(Base):
    """
    The 'users' table.
    Stores every registered user. Passwords are SHA-256 hashed.
    """
    __tablename__ = "users"

    id           = Column(Integer, primary_key=True, index=True)
    username     = Column(String(50), unique=True, nullable=False, index=True)
    password     = Column(String(64), nullable=False)       # SHA-256 hex digest
    avatar_color = Column(String(20), default="indigo")     # UI color for avatar
    created_at   = Column(DateTime, default=datetime.utcnow)

    # ORM relationship: user.messages gives all messages by this user
    messages     = relationship("Message", back_populates="user")


class Room(Base):
    """
    The 'rooms' table.
    A room is a named channel. Users join rooms and exchange messages there.
    """
    __tablename__ = "rooms"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), default="")
    created_at  = Column(DateTime, default=datetime.utcnow)

    messages    = relationship("Message", back_populates="room")


class Message(Base):
    """
    The 'messages' table.
    Every chat message. Foreign keys link it to a user and a room.
    """
    __tablename__ = "messages"

    id         = Column(Integer, primary_key=True, index=True)
    content    = Column(Text, nullable=False)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    room_id    = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user       = relationship("User", back_populates="messages")
    room       = relationship("Room", back_populates="messages")


# Create all tables if they don't exist (runs once on startup)
Base.metadata.create_all(bind=engine)


# =============================================================================
# SECTION 3: PYDANTIC SCHEMAS
# FastAPI uses Pydantic to validate incoming JSON and serialize outgoing JSON.
# These are DIFFERENT from SQLAlchemy models:
#   - SQLAlchemy models = database layer
#   - Pydantic schemas = HTTP layer (what goes in/out of the API)
# =============================================================================

class UserRegister(BaseModel):
    username:     str
    password:     str
    avatar_color: Optional[str] = "indigo"

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id:           int
    username:     str
    avatar_color: str

    class Config:
        from_attributes = True  # lets Pydantic read SQLAlchemy model objects

class RoomCreate(BaseModel):
    name:        str
    description: Optional[str] = ""

class RoomOut(BaseModel):
    id:          int
    name:        str
    description: str

    class Config:
        from_attributes = True

class MessageOut(BaseModel):
    id:         int
    content:    str
    created_at: datetime
    user:       UserOut
    room_id:    int

    class Config:
        from_attributes = True


# =============================================================================
# SECTION 4: WEBSOCKET CONNECTION MANAGER
#
# This is the heart of real-time chat.
#
# How WebSockets differ from HTTP:
#   HTTP:      Client sends request → Server responds → connection closes
#   WebSocket: Client connects once → both sides send/receive freely → stays open
#
# We maintain a dict:  { room_id: [WebSocket, WebSocket, ...] }
# When any message arrives, we broadcast it to ALL sockets in that room.
# That's how every user sees new messages instantly without polling.
# =============================================================================

class ConnectionManager:
    def __init__(self):
        # rooms: { room_id (int) : [ active WebSocket connections ] }
        self.rooms: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: int):
        """Accept and register a new WebSocket connection for a room."""
        await websocket.accept()
        if room_id not in self.rooms:
            self.rooms[room_id] = []
        self.rooms[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: int):
        """Remove a WebSocket when the client disconnects."""
        if room_id in self.rooms:
            try:
                self.rooms[room_id].remove(websocket)
            except ValueError:
                pass

    async def broadcast(self, message: dict, room_id: int):
        """Send a JSON payload to every connected client in a room."""
        if room_id not in self.rooms:
            return
        dead = []
        for ws in self.rooms[room_id]:
            try:
                await ws.send_text(json.dumps(message, default=str))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.rooms[room_id].remove(ws)


manager = ConnectionManager()


# =============================================================================
# SECTION 5: FASTAPI APP + CORS MIDDLEWARE
# =============================================================================

app = FastAPI(title="RealChat API", version="1.0")

# CORS (Cross-Origin Resource Sharing):
# React dev server runs on :5173, API on :8000.
# Browsers block cross-origin requests by default.
# This middleware adds headers so the browser permits the requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","https://chat-app-sigma-ten-81.vercel.app", os.getenv("FRONTEND_URL", ""),],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# SECTION 6: DEPENDENCY — DATABASE SESSION
# Declares a reusable way to get a DB session per request.
# FastAPI closes the session automatically after each request.
# =============================================================================

def get_db():
    db = SessionLocal()
    try:
        yield db          # 'yield' turns this into a context manager
    finally:
        db.close()        # always runs, even if an exception was raised


def hash_pw(password: str) -> str:
    """SHA-256 hash. Use bcrypt in production."""
    return hashlib.sha256(password.encode()).hexdigest()


# =============================================================================
# SECTION 7: REST ENDPOINTS
# These are standard HTTP endpoints (not real-time).
# Used for: auth, fetching room list, loading message history.
# =============================================================================

@app.get("/")
def root():
    return {"status": "RealChat API is running"}


# ---- Auth ----

@app.post("/register", response_model=UserOut)
def register(data: UserRegister, db: Session = Depends(get_db)):
    """
    POST /register  { username, password, avatar_color }
    Creates a new user account. Returns the user (no password).
    """
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    user = User(
        username=data.username,
        password=hash_pw(data.password),
        avatar_color=data.avatar_color,
    )
    db.add(user)
    db.commit()
    db.refresh(user)   # reload from DB to get the auto-generated id
    return user


@app.post("/login", response_model=UserOut)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """
    POST /login  { username, password }
    Returns user if credentials match.
    NOTE: In production, return a signed JWT token here instead.
    """
    user = db.query(User).filter(User.username == data.username).first()
    if not user or user.password != hash_pw(data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user


# ---- Rooms ----

@app.get("/rooms", response_model=List[RoomOut])
def list_rooms(db: Session = Depends(get_db)):
    """GET /rooms — returns all chat rooms"""
    return db.query(Room).all()


@app.post("/rooms", response_model=RoomOut)
def create_room(data: RoomCreate, db: Session = Depends(get_db)):
    """POST /rooms  { name, description }  — creates a new room"""
    if db.query(Room).filter(Room.name == data.name).first():
        raise HTTPException(status_code=400, detail="Room name already exists")
    room = Room(name=data.name, description=data.description)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


# ---- Messages ----

@app.get("/rooms/{room_id}/messages", response_model=List[MessageOut])
def get_messages(room_id: int, limit: int = 50, db: Session = Depends(get_db)):
    """
    GET /rooms/{room_id}/messages?limit=50
    Returns message history for a room (newest last).
    React calls this when you switch rooms so you see past messages.
    """
    msgs = (
        db.query(Message)
        .filter(Message.room_id == room_id)
        .order_by(Message.created_at.asc())
        .limit(limit)
        .all()
    )
    return msgs


# =============================================================================
# SECTION 8: WEBSOCKET ENDPOINT — real-time message engine
#
# URL pattern:  ws://localhost:8000/ws/{room_id}/{user_id}
#
# Lifecycle:
#   1. Client opens WebSocket to this URL (one per room the user is in)
#   2. manager.connect() accepts and registers it
#   3. A "joined" system message is broadcast to all room members
#   4. Infinite loop: await message from THIS client
#   5. On message: save to SQLite → broadcast JSON to ALL clients in room
#   6. On disconnect: remove socket → broadcast "left" system message
# =============================================================================

@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: int, user_id: int):
    await manager.connect(websocket, room_id)
    db = SessionLocal()

    try:
        user = db.query(User).filter(User.id == user_id).first()
        room = db.query(Room).filter(Room.id == room_id).first()

        if not user or not room:
            await websocket.close(code=4004)
            return

        # Announce arrival
        await manager.broadcast({
            "type":      "system",
            "text":      f"{user.username} joined #{room.name}",
            "timestamp": datetime.utcnow().isoformat(),
        }, room_id)

        # ---- Message loop: runs forever until client disconnects ----
        while True:
            raw  = await websocket.receive_text()   # blocks until message arrives
            data = json.loads(raw)

            # Persist to SQLite
            msg = Message(content=data["content"], user_id=user_id, room_id=room_id)
            db.add(msg)
            db.commit()
            db.refresh(msg)

            # Broadcast to everyone in the room (including the sender)
            await manager.broadcast({
                "type":       "message",
                "id":         msg.id,
                "content":    msg.content,
                "created_at": msg.created_at.isoformat(),
                "room_id":    room_id,
                "user": {
                    "id":           user.id,
                    "username":     user.username,
                    "avatar_color": user.avatar_color,
                },
            }, room_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        if user:
            await manager.broadcast({
                "type":      "system",
                "text":      f"{user.username} left the room",
                "timestamp": datetime.utcnow().isoformat(),
            }, room_id)
    finally:
        db.close()


# =============================================================================
# SECTION 9: STARTUP — seed default rooms
# =============================================================================

@app.on_event("startup")
def seed():
    db = SessionLocal()
    for name, desc in [
        ("general", "General discussion for everyone"),
        ("tech",    "Engineering, code, and all things tech"),
        ("random",  "Memes, off-topic, anything goes"),
    ]:
        if not db.query(Room).filter(Room.name == name).first():
            db.add(Room(name=name, description=desc))
    db.commit()
    db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)