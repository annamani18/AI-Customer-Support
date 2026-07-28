from datetime import datetime

from sqlalchemy.orm import Session
from database import Conversation, Ticket


def get_summary(db: Session) -> dict:
    total_conversations = db.query(Conversation).count()
    total_tickets = db.query(Ticket).count()
    active_tickets = db.query(Ticket).filter(Ticket.status == "open").count()
    resolved_tickets = db.query(Ticket).filter(Ticket.status == "resolved").count()
    escalated_tickets = db.query(Ticket).filter(Ticket.status == "escalated").count()

    today_start = datetime.combine(datetime.utcnow().date(), datetime.min.time())
    tickets_today = db.query(Ticket).filter(Ticket.created_at >= today_start).count()

    resolution_rate = round((resolved_tickets / total_tickets) * 100, 1) if total_tickets else 0

    tickets = db.query(Ticket).all()
    category_distribution = {}
    sentiment_distribution = {"positive": 0, "neutral": 0, "negative": 0}

    for t in tickets:
        category_distribution[t.category] = category_distribution.get(t.category, 0) + 1
        if t.sentiment in sentiment_distribution:
            sentiment_distribution[t.sentiment] += 1

    return {
        "total_conversations": total_conversations,
        "total_tickets": total_tickets,
        "active_tickets": active_tickets,
        "resolved_tickets": resolved_tickets,
        "escalated_tickets": escalated_tickets,
        "tickets_today": tickets_today,
        "resolution_rate": resolution_rate,
        "category_distribution": category_distribution,
        "sentiment_distribution": sentiment_distribution,
    }
