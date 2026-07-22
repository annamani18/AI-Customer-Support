from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import traceback

import database
from database import get_db, init_db, Conversation, Message, Ticket
from classifier import classify, retrieve_answer
from gemini_client import GeminiClient

init_db()

app = FastAPI(title="AI Customer Support Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

gemini = GeminiClient()

VALID_STATUSES = {"open", "pending", "resolved", "escalated"}


# ---------- Schemas ----------

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str


# ---------- /chat ----------

@app.post("/chat")
async def handle_chat(payload: ChatRequest, db: Session = Depends(get_db)):
    try:
        # 1. Get or create conversation
        conv = None
        if payload.conversation_id:
            conv = db.query(Conversation).filter(Conversation.id == payload.conversation_id).first()
        if conv is None:
            conv = Conversation()
            db.add(conv)
            db.commit()
            db.refresh(conv)

        # 2. History for context
        history = [{"role": m.role, "content": m.text} for m in conv.messages[-5:]]

        # 3. Classify (fast, deterministic — always runs)
        result = classify(payload.message)

        # 4. Build a reply: try Gemini first, fall back to KB/canned response
        kb_answer, kb_source = retrieve_answer(payload.message)
        context = kb_answer or "No specific knowledge base match found. Use general support knowledge."

        reply_text = await gemini.generate_reply(payload.message, context, history)
        sources = []
        if not reply_text:
            if kb_answer:
                reply_text = kb_answer
                sources = [kb_source]
            else:
                reply_text = (
                    "I'm not fully certain on that one — I've noted the details and, "
                    "if needed, a support ticket will be created for a human follow-up."
                )

        # 5. Save messages
        db.add(Message(conversation_id=conv.id, role="customer", text=payload.message))
        db.add(Message(conversation_id=conv.id, role="ai", text=reply_text))
        db.commit()

        # 6. Escalation -> create or update ticket for this conversation
        ticket_id = None
        if result["escalate"]:
            existing_ticket = db.query(Ticket).filter(Ticket.conversation_id == conv.id).first()
            if existing_ticket:
                existing_ticket.intent = result["intent"]
                existing_ticket.category = result["category"]
                existing_ticket.urgency = result["urgency"]
                existing_ticket.sentiment = result["sentiment"]
                existing_ticket.escalate = True
                ticket_id = existing_ticket.id
            else:
                new_ticket = Ticket(
                    conversation_id=conv.id,
                    intent=result["intent"],
                    category=result["category"],
                    urgency=result["urgency"],
                    sentiment=result["sentiment"],
                    escalate=True,
                    status="escalated",
                )
                db.add(new_ticket)
                db.commit()
                db.refresh(new_ticket)
                ticket_id = new_ticket.id
            db.commit()

        return {
            "conversation_id": conv.id,
            "reply": reply_text,
            "sources": sources,
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


# ---------- /tickets ----------

@app.get("/tickets")
def list_tickets(db: Session = Depends(get_db)):
    try:
        tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).all()
        return [
            {
                "id": t.id,
                "intent": t.intent,
                "category": t.category,
                "urgency": t.urgency,
                "sentiment": t.sentiment,
                "escalate": t.escalate,
                "status": t.status,
                "created_at": t.created_at.isoformat(),
            }
            for t in tickets
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == ticket.conversation_id)
        .order_by(Message.timestamp.asc())
        .all()
    )

    return {
        "id": ticket.id,
        "status": ticket.status,
        "category": ticket.category,
        "urgency": ticket.urgency,
        "intent": ticket.intent,
        "sentiment": ticket.sentiment,
        "messages": [{"role": m.role, "text": m.text} for m in messages],
    }


@app.patch("/tickets/{ticket_id}/status")
def update_ticket_status(ticket_id: str, payload: StatusUpdate, db: Session = Depends(get_db)):
    status = payload.status.strip().lower()
    if status not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail=f"status must be one of {sorted(VALID_STATUSES)}")

    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.status = status
    db.commit()
    db.refresh(ticket)

    return {"id": ticket.id, "status": ticket.status}


@app.get("/")
def root():
    return {"status": "API is online", "docs": "/docs"}
