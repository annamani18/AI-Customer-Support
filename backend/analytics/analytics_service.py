from sqlalchemy.orm import Session
from database import Conversation, Ticket


def get_summary(db: Session) -> dict:
    total_conversations = db.query(Conversation).count()
    total_tickets = db.query(Ticket).count()
    active_tickets = db.query(Ticket).filter(Ticket.status == "open").count()
    resolved_tickets = db.query(Ticket).filter(Ticket.status == "resolved").count()

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
        "category_distribution": category_distribution,
        "sentiment_distribution": sentiment_distribution,
    }
