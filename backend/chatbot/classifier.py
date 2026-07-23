"""
Keyword-based intent/sentiment/urgency classifier. Runs on every chat turn
(fast, deterministic, free) and also backs the standalone /classify endpoint
used by the Intent Detection and Sentiment Analysis pages.
"""

INTENTS = [
    {"keywords": ["refund", "return", "money"], "intent": "Refund Request", "category": "Billing"},
    {"keywords": ["password", "login", "reset"], "intent": "Password Reset", "category": "Technical"},
    {"keywords": ["delivery", "shipping", "track", "order"], "intent": "Order Tracking", "category": "General"},
    {"keywords": ["payment", "failed", "transaction", "charge", "billing"], "intent": "Payment Issue", "category": "Billing"},
]

NEGATIVE_WORDS = ["angry", "disappointed", "late", "damaged", "worst", "terrible",
                  "broken", "refund", "frustrated", "awful", "horrible", "manager"]
POSITIVE_WORDS = ["thank", "great", "awesome", "excellent", "love", "perfect", "happy"]

ESCALATION_TRIGGERS = ["human", "manager", "angry", "refund", "broken", "escalate", "supervisor"]


def classify(message: str) -> dict:
    text = message.lower()

    matched_intent = None
    for item in INTENTS:
        if any(k in text for k in item["keywords"]):
            matched_intent = item
            break

    intent = matched_intent["intent"] if matched_intent else "General Inquiry"
    category = matched_intent["category"] if matched_intent else "General"

    if any(w in text for w in NEGATIVE_WORDS):
        sentiment = "negative"
        emotion = "Frustrated"
    elif any(w in text for w in POSITIVE_WORDS):
        sentiment = "positive"
        emotion = "Happy"
    else:
        sentiment = "neutral"
        emotion = "Calm"

    escalate = any(w in text for w in ESCALATION_TRIGGERS) or sentiment == "negative"
    urgency = "high" if escalate else ("medium" if sentiment == "negative" else "low")

    escalation_reason = None
    if escalate:
        escalation_reason = "customer sentiment is negative or explicitly requested a human agent"

    return {
        "intent": intent,
        "category": category,
        "sentiment": sentiment,
        "sentiment_score": {"positive": 0.9, "neutral": 0.5, "negative": 0.1}[sentiment],
        "emotion": emotion,
        "urgency": urgency,
        "escalate": escalate,
        "escalation_reason": escalation_reason,
    }
