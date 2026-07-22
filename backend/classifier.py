"""
Lightweight keyword-based classifier. Used as the primary classifier (fast,
free, deterministic) and as the fallback if Gemini is unavailable/quota'd out.
Mirrors the keyword lists already used in intent.js and sentiment.js so
behavior between the demo pages and the live chat feels consistent.
"""

INTENTS = [
    {
        "keywords": ["refund", "return", "money"],
        "intent": "Refund Request",
        "category": "Billing",
    },
    {
        "keywords": ["password", "login", "reset"],
        "intent": "Password Reset",
        "category": "Technical",
    },
    {
        "keywords": ["delivery", "shipping", "track", "order"],
        "intent": "Order Tracking",
        "category": "General",
    },
    {
        "keywords": ["payment", "failed", "transaction", "charge", "billing"],
        "intent": "Payment Issue",
        "category": "Billing",
    },
]

NEGATIVE_WORDS = ["angry", "disappointed", "late", "damaged", "worst", "terrible",
                  "broken", "refund", "frustrated", "awful", "horrible", "manager"]
POSITIVE_WORDS = ["thank", "great", "awesome", "excellent", "love", "perfect", "happy"]

ESCALATION_TRIGGERS = ["human", "manager", "angry", "refund", "broken", "escalate", "supervisor"]

KNOWLEDGE_BASE = [
    {
        "keywords": ["refund", "return", "damaged"],
        "answer": "Your product is eligible for return within 30 days. Please upload product images and your order ID.",
        "source": "Return Policy",
    },
    {
        "keywords": ["password", "login"],
        "answer": "You can reset your password using the Forgot Password option on the login page.",
        "source": "Account Help",
    },
    {
        "keywords": ["shipping", "delivery", "track"],
        "answer": "You can track your order using the tracking number sent to your email.",
        "source": "Shipping Policy",
    },
    {
        "keywords": ["payment", "failed"],
        "answer": "It looks like your payment failed. Please verify your card details or try another payment method.",
        "source": "Billing FAQ",
    },
]

DEFAULT_ANSWER = "I'm here to help. Could you tell me a bit more about the issue you're facing?"


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


def retrieve_answer(message: str):
    """Returns (answer_text, source_name) from the static KB, or (None, None) if no match."""
    text = message.lower()
    for item in KNOWLEDGE_BASE:
        if any(k in text for k in item["keywords"]):
            return item["answer"], item["source"]
    return None, None
