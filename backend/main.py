# =============================================================================
# BACKEND: main.py  (v2 — Private DMs + Friend Requests)
# Stack: FastAPI + SQLite + WebSockets
#
# New features vs v1:
#   - FriendRequest table: pending / accepted / rejected states
#   - DirectMessage table: private messages between exactly 2 users
#   - No more public rooms — everything is private DM only
#   - WebSocket per USER (not per room) — server routes to recipient
#   - Real-time notifications: friend requests + accepts pushed via WS
# =============================================================================

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
import json, hashlib, os

DATABASE_URL = "sqlite:///./chat.db"
engine       = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base         = declarative_base()

# =============================================================================
# MODELS
# =============================================================================

class User(Base):
    __tablename__ = "users"
    id           = Column(Integer, primary_key=True, index=True)
    username     = Column(String(50), unique=True, nullable=False, index=True)
    password     = Column(String(64), nullable=False)
    avatar_color = Column(String(20), default="indigo")
    created_at   = Column(DateTime, default=datetime.utcnow)

    sent_requests     = relationship("FriendRequest", foreign_keys="FriendRequest.sender_id",   back_populates="sender")
    received_requests = relationship("FriendRequest", foreign_keys="FriendRequest.receiver_id", back_populates="receiver")
    sent_messages     = relationship("DirectMessage", foreign_keys="DirectMessage.sender_id",   back_populates="sender")
    received_messages = relationship("DirectMessage", foreign_keys="DirectMessage.receiver_id", back_populates="receiver")


class FriendRequest(Base):
    """
    Tracks friend requests between users.
    status: "pending" → user hasn't responded yet
            "accepted" → both users can now DM each other
            "rejected" → receiver declined
    """
    __tablename__ = "friend_requests"
    id          = Column(Integer, primary_key=True, index=True)
    sender_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status      = Column(String(20), default="pending")
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow)

    sender   = relationship("User", foreign_keys=[sender_id],   back_populates="sent_requests")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_requests")


class DirectMessage(Base):
    """
    A private message between exactly two users.
    Only created after their friend request is accepted.
    """
    __tablename__ = "direct_messages"
    id          = Column(Integer, primary_key=True, index=True)
    sender_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content     = Column(Text, nullable=False)
    created_at  = Column(DateTime, default=datetime.utcnow)

    sender   = relationship("User", foreign_keys=[sender_id],   back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")


Base.metadata.create_all(bind=engine)

# =============================================================================
# SCHEMAS
# =============================================================================

class UserRegister(BaseModel):
    username: str
    password: str
    avatar_color: Optional[str] = "indigo"

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    avatar_color: str
    class Config:
        from_attributes = True

class FriendRequestOut(BaseModel):
    id: int
    sender: UserOut
    receiver: UserOut
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class DirectMessageOut(BaseModel):
    id: int
    sender: UserOut
    receiver_id: int
    content: str
    created_at: datetime
    class Config:
        from_attributes = True

class SendRequestBody(BaseModel):
    username: str

class SendMessageBody(BaseModel):
    receiver_id: int
    content: str

# =============================================================================
# WEBSOCKET MANAGER — keyed by user_id (not room)
# Each logged-in user maintains ONE persistent WS connection.
# Server pushes DMs, friend requests, and accept notifications directly.
# =============================================================================

class ConnectionManager:
    def __init__(self):
        self.connections: dict[int, WebSocket] = {}

    async def connect(self, ws: WebSocket, user_id: int):
        await ws.accept()
        self.connections[user_id] = ws

    def disconnect(self, user_id: int):
        self.connections.pop(user_id, None)

    async def send_to(self, user_id: int, payload: dict):
        ws = self.connections.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(payload, default=str))
            except Exception:
                self.disconnect(user_id)

manager = ConnectionManager()

# =============================================================================
# APP
# =============================================================================

app = FastAPI(title="RealChat DM API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        os.getenv("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_pw(p: str) -> str:
    return hashlib.sha256(p.encode()).hexdigest()

def are_friends(a: int, b: int, db: Session) -> bool:
    return db.query(FriendRequest).filter(
        FriendRequest.status == "accepted",
        ((FriendRequest.sender_id == a) & (FriendRequest.receiver_id == b)) |
        ((FriendRequest.sender_id == b) & (FriendRequest.receiver_id == a))
    ).first() is not None

# =============================================================================
# AUTH
# =============================================================================

@app.get("/")
def root():
    return {"status": "RealChat DM API v2"}

@app.post("/register", response_model=UserOut)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "Username already taken")
    u = User(username=data.username, password=hash_pw(data.password), avatar_color=data.avatar_color)
    db.add(u); db.commit(); db.refresh(u)
    return u

@app.post("/login", response_model=UserOut)
def login(data: UserLogin, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.username == data.username).first()
    if not u or u.password != hash_pw(data.password):
        raise HTTPException(401, "Invalid credentials")
    return u

# =============================================================================
# USER SEARCH
# =============================================================================

@app.get("/users/search", response_model=List[UserOut])
def search_users(q: str, me: int, db: Session = Depends(get_db)):
    """Search users by username (excluding yourself)"""
    return db.query(User).filter(User.username.ilike(f"%{q}%"), User.id != me).limit(10).all()

# =============================================================================
# FRIEND REQUESTS
# =============================================================================

@app.post("/friend-requests", response_model=FriendRequestOut)
async def send_request(body: SendRequestBody, me: int, db: Session = Depends(get_db)):
    sender   = db.query(User).filter(User.id == me).first()
    receiver = db.query(User).filter(User.username == body.username).first()
    if not receiver:
        raise HTTPException(404, "User not found")
    if receiver.id == me:
        raise HTTPException(400, "Cannot add yourself")

    existing = db.query(FriendRequest).filter(
        ((FriendRequest.sender_id == me) & (FriendRequest.receiver_id == receiver.id)) |
        ((FriendRequest.sender_id == receiver.id) & (FriendRequest.receiver_id == me))
    ).first()

    if existing:
        if existing.status == "accepted":  raise HTTPException(400, "Already friends")
        if existing.status == "pending":   raise HTTPException(400, "Request already sent")
        existing.status = "pending"; existing.updated_at = datetime.utcnow()
        db.commit(); db.refresh(existing); fr = existing
    else:
        fr = FriendRequest(sender_id=me, receiver_id=receiver.id)
        db.add(fr); db.commit(); db.refresh(fr)

    fr = db.query(FriendRequest).filter(FriendRequest.id == fr.id).first()

    # Push notification to receiver in real-time
    await manager.send_to(receiver.id, {
        "type":       "friend_request",
        "request_id": fr.id,
        "from":       {"id": sender.id, "username": sender.username, "avatar_color": sender.avatar_color},
    })
    return fr

@app.get("/friend-requests/pending", response_model=List[FriendRequestOut])
def pending_requests(me: int, db: Session = Depends(get_db)):
    """All incoming pending requests for me"""
    return db.query(FriendRequest).filter(
        FriendRequest.receiver_id == me, FriendRequest.status == "pending"
    ).all()

@app.post("/friend-requests/{rid}/accept", response_model=FriendRequestOut)
async def accept(rid: int, me: int, db: Session = Depends(get_db)):
    fr = db.query(FriendRequest).filter(FriendRequest.id == rid).first()
    if not fr or fr.receiver_id != me: raise HTTPException(403, "Not your request")
    if fr.status != "pending":         raise HTTPException(400, f"Already {fr.status}")
    fr.status = "accepted"; fr.updated_at = datetime.utcnow()
    db.commit(); db.refresh(fr)
    fr = db.query(FriendRequest).filter(FriendRequest.id == rid).first()
    accepter = db.query(User).filter(User.id == me).first()
    await manager.send_to(fr.sender_id, {
        "type":   "request_accepted",
        "friend": {"id": accepter.id, "username": accepter.username, "avatar_color": accepter.avatar_color},
    })
    return fr

@app.post("/friend-requests/{rid}/reject", response_model=FriendRequestOut)
def reject(rid: int, me: int, db: Session = Depends(get_db)):
    fr = db.query(FriendRequest).filter(FriendRequest.id == rid).first()
    if not fr or fr.receiver_id != me: raise HTTPException(403, "Not your request")
    fr.status = "rejected"; fr.updated_at = datetime.utcnow()
    db.commit(); db.refresh(fr)
    return db.query(FriendRequest).filter(FriendRequest.id == rid).first()

@app.get("/friends", response_model=List[UserOut])
def get_friends(me: int, db: Session = Depends(get_db)):
    """All accepted friends — these are the users I can DM"""
    sent     = db.query(FriendRequest).filter(FriendRequest.sender_id   == me, FriendRequest.status == "accepted").all()
    received = db.query(FriendRequest).filter(FriendRequest.receiver_id == me, FriendRequest.status == "accepted").all()
    friends, seen = [], set()
    for fr in sent:
        if fr.receiver_id not in seen: friends.append(fr.receiver); seen.add(fr.receiver_id)
    for fr in received:
        if fr.sender_id not in seen: friends.append(fr.sender); seen.add(fr.sender_id)
    return friends

# =============================================================================
# DIRECT MESSAGES
# =============================================================================

@app.get("/dm/{other_id}", response_model=List[DirectMessageOut])
def get_history(other_id: int, me: int, db: Session = Depends(get_db)):
    """Load chat history between me and other_id. Blocked if not friends."""
    if not are_friends(me, other_id, db):
        raise HTTPException(403, "Not friends")
    return db.query(DirectMessage).filter(
        ((DirectMessage.sender_id == me)       & (DirectMessage.receiver_id == other_id)) |
        ((DirectMessage.sender_id == other_id) & (DirectMessage.receiver_id == me))
    ).order_by(DirectMessage.created_at.asc()).limit(50).all()

# =============================================================================
# WEBSOCKET — one connection per user
# =============================================================================

@app.websocket("/ws/{user_id}")
async def ws_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(websocket, user_id)
    db = SessionLocal()
    user = None
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.close(code=4004); return

        await websocket.send_text(json.dumps({"type": "connected"}))

        while True:
            data = json.loads(await websocket.receive_text())

            if data.get("type") == "dm":
                rid     = data["receiver_id"]
                content = data["content"]
                if not are_friends(user_id, rid, db):
                    await websocket.send_text(json.dumps({"type": "error", "text": "Not friends"}))
                    continue
                msg = DirectMessage(sender_id=user_id, receiver_id=rid, content=content)
                db.add(msg); db.commit(); db.refresh(msg)
                payload = {
                    "type": "dm", "id": msg.id, "content": msg.content,
                    "created_at": msg.created_at.isoformat(), "receiver_id": rid,
                    "sender": {"id": user.id, "username": user.username, "avatar_color": user.avatar_color},
                }
                await manager.send_to(rid, payload)                           # push to recipient
                await websocket.send_text(json.dumps(payload, default=str))   # echo to sender

            elif data.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        manager.disconnect(user_id)
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)