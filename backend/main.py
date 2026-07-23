from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import time
import traceback

from database import get_db, init_db, Conversation, Message, User
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


class LoginRequest(BaseModel):
    email: str
    password: str


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

    user = User(email=email, hashed_password=hash_password(payload.password))
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

        # Get or create conversation
        conv = None
        if payload.conversation_id:
            conv = db.query(Conversation).filter(Conversation.id == payload.conversation_id).first()
        if conv is None:
            conv = Conversation()
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
            ticket_id = ticket_service.create_or_update_ticket(db, conv.id, result)

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
        return ticket_service.list_tickets(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    detail = ticket_service.get_ticket_detail(db, ticket_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return detail


@app.patch("/tickets/{ticket_id}/status")
def patch_ticket_status(ticket_id: str, payload: StatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ticket, error = ticket_service.update_status(db, ticket_id, payload.status)
    if error == "Ticket not found":
        raise HTTPException(status_code=404, detail=error)
    if error:
        raise HTTPException(status_code=422, detail=error)
    return {"id": ticket.id, "status": ticket.status}


# ---------- /analytics/summary ----------

@app.get("/analytics/summary")
def get_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return analytics_service.get_summary(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
def root():
    return {"status": "API is online", "docs": "/docs"}
