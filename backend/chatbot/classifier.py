"""
Keyword-based intent/sentiment/urgency classifier. Runs on every chat turn
(fast, deterministic, free) and also backs the standalone /classify endpoint
used by the Intent Detection and Sentiment Analysis pages.
"""

import re

# Ordered most-specific -> most-general. First match wins.
INTENTS = [
    {"keywords": ["refund", "return", "money back", "damaged", "unwanted product"],
     "intent": "Refund Request", "category": "Billing"},
    {"keywords": ["password", "forgot my password", "reset password"],
     "intent": "Password Reset", "category": "Technical"},
    {"keywords": ["change my email", "change email", "update my email", "email address",
                  "account locked", "locked out", "log in", "login", "signed out", "sign in"],
     "intent": "Account Access", "category": "Technical"},
    {"keywords": ["delivery", "shipping", "track", "where is my order", "order status"],
     "intent": "Order Tracking", "category": "General"},
    {"keywords": ["payment", "failed", "transaction", "charge", "declined", "billing"],
     "intent": "Payment Issue", "category": "Billing"},
    {"keywords": ["crash", "crashes", "crashed", "bug", "error", "not working", "broken", "down", "glitch"],
     "intent": "Website Issue", "category": "Technical"},
    {"keywords": ["contacted support", "nobody helped", "no response", "still waiting",
                  "multiple times", "several times", "many times", "keep contacting"],
     "intent": "Unresolved Complaint", "category": "Support"},
    {"keywords": ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"],
     "intent": "Greeting", "category": "General"},
]

NEGATIVE_WORDS = ["angry", "disappointed", "late", "damaged", "worst", "terrible",
                   "broken", "refund", "frustrated", "awful", "horrible", "manager",
                   "nobody helped", "no response"]
POSITIVE_WORDS = ["thank", "great", "awesome", "excellent", "love", "perfect", "happy"]

ESCALATION_TRIGGERS = ["human", "manager", "angry", "refund", "broken", "escalate",
                        "supervisor", "nobody helped", "several times", "multiple times"]


def _contains(text: str, keyword: str) -> bool:
    """Whole-word/phrase match so short keywords (e.g. 'hi') don't false-positive
    inside unrelated words (e.g. 'this')."""
    pattern = r"\b" + re.escape(keyword) + r"\b"
    return re.search(pattern, text) is not None


def classify(message: str) -> dict:
    text = message.lower()

    matched_intent = None
    for item in INTENTS:
        if any(_contains(text, k) for k in item["keywords"]):
            matched_intent = item
            break

    intent = matched_intent["intent"] if matched_intent else "General Inquiry"
    category = matched_intent["category"] if matched_intent else "General"

    if any(_contains(text, w) for w in NEGATIVE_WORDS):
        sentiment = "negative"
        emotion = "Frustrated"
    elif any(_contains(text, w) for w in POSITIVE_WORDS):
        sentiment = "positive"
        emotion = "Happy"
    else:
        sentiment = "neutral"
        emotion = "Calm"

    escalate = any(_contains(text, w) for w in ESCALATION_TRIGGERS) or sentiment == "negative"
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
