from sqlalchemy.orm import Session
from database import Ticket, Message

VALID_STATUSES = {"open", "pending", "resolved", "escalated"}


def create_or_update_ticket(db: Session, conversation_id: str, classification: dict):
    """Creates a new ticket for this conversation, or updates the existing one."""
    existing = db.query(Ticket).filter(Ticket.conversation_id == conversation_id).first()

    if existing:
        existing.intent = classification["intent"]
        existing.category = classification["category"]
        existing.urgency = classification["urgency"]
        existing.sentiment = classification["sentiment"]
        existing.escalate = True
        db.commit()
        return existing.id

    new_ticket = Ticket(
        conversation_id=conversation_id,
        intent=classification["intent"],
        category=classification["category"],
        urgency=classification["urgency"],
        sentiment=classification["sentiment"],
        escalate=True,
        status="escalated",
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    return new_ticket.id


def list_tickets(db: Session):
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


def get_ticket_detail(db: Session, ticket_id: str):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        return None

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


def update_status(db: Session, ticket_id: str, status: str):
    status = status.strip().lower()
    if status not in VALID_STATUSES:
        return None, f"status must be one of {sorted(VALID_STATUSES)}"

    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        return None, "Ticket not found"

    ticket.status = status
    db.commit()
    db.refresh(ticket)
    return ticket, None
