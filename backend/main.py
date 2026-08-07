from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import re
import time
import traceback

from database import get_db, init_db, Conversation, Message, User, Ticket
from chatbot.engine import ChatbotEngine
from chatbot.classifier import classify
from retrieval.retriever import KnowledgeRetriever
from validators.input_validator import InputValidator
from tickets import ticket_service
from analytics import analytics_service
from auth import hash_password, verify_password, create_access_token, get_current_user

init_db()

app = FastAPI(title="AI Customer Support Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = ChatbotEngine()
retriever = KnowledgeRetriever()


# ---------- Schemas ----------

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class ClassifyRequest(BaseModel):
    message: str


class StatusUpdate(BaseModel):
    status: str


class SignupRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None


class EscalateRequest(BaseModel):
    conversation_id: str
    reason: Optional[str] = None


def _derive_display_name(email: str) -> str:
    """The User table only stores an email (no name field), so a real
    display name is derived from the email's local part instead of
    showing a hardcoded placeholder like 'Sarah Johnson'."""
    local_part = email.split("@")[0]
    words = [w for w in re.split(r"[._\-+0-9]+", local_part) if w]
    if not words:
        return local_part.capitalize()
    return " ".join(w.capitalize() for w in words)


def _derive_initials(name: str) -> str:
    words = name.split()
    if not words:
        return "U"
    if len(words) == 1:
        return words[0][:2].upper()
    return (words[0][0] + words[-1][0]).upper()


# ---------- /auth/signup ----------

@app.post("/auth/signup")
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()

    if "@" not in email or "." not in email:
        raise HTTPException(status_code=422, detail="Enter a valid email address.")

    if len(payload.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters.")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    is_first_user = db.query(User).count() == 0

    user = User(
        email=email,
        hashed_password=hash_password(payload.password),
        name=(payload.name.strip() if payload.name else None),
        role="Administrator" if is_first_user else "Support Agent",
        is_admin=is_first_user,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer", "email": user.email}


# ---------- /auth/login ----------

@app.post("/auth/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    token = create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer", "email": user.email}


# ---------- /auth/me ----------

@app.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    name = current_user.name or _derive_display_name(current_user.email)
    role = current_user.role or "Support Agent"
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": name,
        "role": role,
        "initials": _derive_initials(name),
        "is_admin": bool(current_user.is_admin),
    }


@app.put("/auth/me")
def update_me(payload: ProfileUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if payload.name is not None:
        cleaned = payload.name.strip()
        current_user.name = cleaned or None
    if payload.role is not None:
        cleaned_role = payload.role.strip()
        current_user.role = cleaned_role or "Support Agent"

    db.commit()
    db.refresh(current_user)

    name = current_user.name or _derive_display_name(current_user.email)
    role = current_user.role or "Support Agent"
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": name,
        "role": role,
        "initials": _derive_initials(name),
        "is_admin": bool(current_user.is_admin),
    }


# ---------- /admin/users ----------

@app.get("/admin/users")
def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")

    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "name": u.name or _derive_display_name(u.email),
            "role": u.role or "Support Agent",
            "is_admin": bool(u.is_admin),
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


# ---------- /chat ----------

@app.post("/chat")
async def handle_chat(payload: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        # Validator stage — reject bad input before it reaches the pipeline
        is_valid, error_msg = InputValidator.validate_text(payload.message)
        if not is_valid:
            return {
                "conversation_id": payload.conversation_id,
                "reply": error_msg,
                "sources": [],
                "intent": "Invalid",
                "category": "General",
                "urgency": "low",
                "sentiment": "neutral",
                "sentiment_score": 0.5,
                "emotion": "Calm",
                "escalate": False,
                "escalation_reason": None,
                "ticket_id": None,
            }

        # Get or create conversation — scoped to the logged-in user so one
        # account can never read or continue another account's conversation
        conv = None
        if payload.conversation_id:
            conv = (
                db.query(Conversation)
                .filter(Conversation.id == payload.conversation_id, Conversation.user_id == current_user.id)
                .first()
            )
        if conv is None:
            conv = Conversation(user_id=current_user.id)
            db.add(conv)
            db.commit()
            db.refresh(conv)

        history = [{"role": m.role, "content": m.text} for m in conv.messages[-5:]]

        # Full pipeline: Retrieval -> LLM -> Validator -> classification
        result = await engine.get_ai_reply(payload.message, history)

        # Save messages
        db.add(Message(conversation_id=conv.id, role="customer", text=payload.message))
        db.add(Message(conversation_id=conv.id, role="ai", text=result["reply"]))
        db.commit()

        # Ticket Database stage — create/update a ticket if escalation is needed
        ticket_id = None
        if result["escalate"]:
            ticket_id = ticket_service.create_or_update_ticket(db, conv.id, result, current_user.id)

        return {
            "conversation_id": conv.id,
            "reply": result["reply"],
            "sources": result["sources"],
            "intent": result["intent"],
            "category": result["category"],
            "urgency": result["urgency"],
            "sentiment": result["sentiment"],
            "sentiment_score": result["sentiment_score"],
            "emotion": result["emotion"],
            "escalate": result["escalate"],
            "escalation_reason": result["escalation_reason"],
            "ticket_id": ticket_id,
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ---------- /classify (Intent Detection + Sentiment Analysis pages) ----------

@app.post("/classify")
def classify_message(payload: ClassifyRequest, current_user: User = Depends(get_current_user)):
    result = classify(payload.message)
    return result


# ---------- /knowledge/search (Knowledge Retrieval page) ----------

@app.post("/knowledge/search")
def knowledge_search(payload: ClassifyRequest, current_user: User = Depends(get_current_user)):
    start = time.time()
    answer, source = retriever.search(payload.message)
    elapsed = round(time.time() - start, 2)

    if answer:
        return {
            "answer": answer,
            "source": source,
            "documents_found": 1,
            "confidence": "95%",
            "response_time": f"{elapsed}s",
        }
    return {
        "answer": "No specific match found in the knowledge base. Try rephrasing your query.",
        "source": None,
        "documents_found": 0,
        "confidence": "0%",
        "response_time": f"{elapsed}s",
    }


# ---------- /tickets ----------

@app.get("/tickets")
def get_tickets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return ticket_service.list_tickets(db, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    detail = ticket_service.get_ticket_detail(db, ticket_id, current_user.id)
    if not detail:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return detail


@app.patch("/tickets/{ticket_id}/status")
def patch_ticket_status(ticket_id: str, payload: StatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ticket, error = ticket_service.update_status(db, ticket_id, payload.status, current_user.id)
    if error == "Ticket not found":
        raise HTTPException(status_code=404, detail=error)
    if error:
        raise HTTPException(status_code=422, detail=error)
    return {"id": ticket.id, "status": ticket.status}


# ---------- /tickets/escalate (manual "Connect me to a human agent") ----------

@app.post("/tickets/escalate")
def escalate_conversation(payload: EscalateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == payload.conversation_id, Conversation.user_id == current_user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    classification = {
        "intent": "Human Agent Requested",
        "category": "General",
        "urgency": "high",
        "sentiment": "neutral",
    }
    ticket_id = ticket_service.create_or_update_ticket(db, conv.id, classification, current_user.id)
    ticket, error = ticket_service.update_status(db, ticket_id, "escalated", current_user.id)
    if error:
        raise HTTPException(status_code=500, detail=error)

    return {
        "ticket_id": ticket_id,
        "status": "escalated",
        "message": "A human agent has been requested for this conversation.",
    }


# ---------- /analytics/summary ----------

@app.get("/analytics/summary")
def get_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return analytics_service.get_summary(db, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
def root():
    return {"status": "API is online", "docs": "/docs"}


# ---------- Schemas (admin) ----------

class AdminLoginRequest(BaseModel):
    email: str
    password: str


class RoleUpdateRequest(BaseModel):
    is_admin: Optional[bool] = None
    role: Optional[str] = None


class CreateTicketRequest(BaseModel):
    subject: str
    description: Optional[str] = None
    priority: Optional[str] = "low"       # low | medium | high
    category: Optional[str] = "General"


# ---------- /auth/admin/login ----------
# Reuses the exact same User table, hashed passwords, and JWT helper as the
# regular /auth/login above. The only difference is it also checks is_admin.

@app.post("/auth/admin/login")
def admin_login(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    if not user.is_admin:
        raise HTTPException(status_code=403, detail="This account does not have admin access.")

    token = create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer", "email": user.email}


# ---------- /admin/users/{user_id}/role ----------

@app.patch("/admin/users/{user_id}/role")
def update_user_role(user_id: str, payload: RoleUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if payload.is_admin is not None:
        user.is_admin = payload.is_admin
    if payload.role is not None:
        user.role = payload.role.strip() or user.role

    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "role": user.role, "is_admin": user.is_admin}


# ---------- /admin/stats ----------

@app.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")

    return {
        "total_users": db.query(User).count(),
        "total_tickets": db.query(Ticket).count(),
        "open_tickets": db.query(Ticket).filter(Ticket.status == "open").count(),
        "closed_tickets": db.query(Ticket).filter(Ticket.status == "resolved").count(),
        "ai_conversations": db.query(Conversation).count(),
    }


# ---------- POST /tickets (manual "Create Ticket" button) ----------
# Existing tickets are created automatically by the chatbot on escalation
# (see ticket_service.create_or_update_ticket above). This adds the ability
# for a staff member to open a ticket by hand from the Tickets page, using
# the same Ticket table — conversation_id is simply left blank.

@app.post("/tickets")
def create_ticket_manually(payload: CreateTicketRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    priority = (payload.priority or "low").strip().lower()
    if priority not in {"low", "medium", "high"}:
        priority = "low"

    ticket = Ticket(
        conversation_id=None,
        user_id=current_user.id,
        intent=payload.subject.strip() or "General inquiry",
        category=(payload.category or "General").strip() or "General",
        urgency=priority,
        sentiment="neutral",
        escalate=False,
        status="open",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return {
        "id": ticket.id,
        "intent": ticket.intent,
        "category": ticket.category,
        "urgency": ticket.urgency,
        "status": ticket.status,
        "created_at": ticket.created_at.isoformat(),
    }
