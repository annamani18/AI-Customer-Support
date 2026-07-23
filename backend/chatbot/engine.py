from chatbot.classifier import classify
from chatbot.gemini_client import GeminiClient
from retrieval.retriever import KnowledgeRetriever
from validators.input_validator import InputValidator


# Templates keyed by intent, used ONLY when Gemini is unavailable/failed AND
# no knowledge-base entry matched. These make the offline fallback path
# dynamic and context-aware instead of returning one identical sentence for
# every unmatched message.
_FALLBACK_TEMPLATES = {
    "Greeting": (
        "Hi there! I'm your AI support assistant. I can help with orders, billing, "
        "account access, and technical issues — what can I help you with today?"
    ),
    "Refund Request": (
        "I can help start that refund. Could you share your order ID and the reason "
        "for the return?{ticket_note}"
    ),
    "Password Reset": (
        "You can reset your password using the Forgot Password option on the login page. "
        "Let me know if you run into any issues with that.{ticket_note}"
    ),
    "Account Access": (
        "It sounds like this is about account access (login, locked account, or updating "
        "your email). You can usually manage this from Account Settings > Profile, "
        "but since it may need verification on our end,{ticket_note_lower}"
    ),
    "Order Tracking": (
        "I can help track that. Could you share your order ID or the tracking number "
        "from your confirmation email?{ticket_note}"
    ),
    "Payment Issue": (
        "Sorry about the payment trouble. Please double-check your card details and try "
        "again, or try a different payment method.{ticket_note}"
    ),
    "Website Issue": (
        "Thanks for flagging that. Site errors during login are often caused by a stale "
        "session or cache — try clearing your browser cache or using a private window. "
        "If it keeps happening,{ticket_note_lower}"
    ),
    "Unresolved Complaint": (
        "I'm sorry you've had to reach out more than once without a resolution — that's "
        "not the experience we want you to have.{ticket_note}"
    ),
    "General Inquiry": (
        "I don't have a specific answer for that in my knowledge base right now, "
        "so I've noted the details of your message.{ticket_note}"
    ),
}

_DEFAULT_FALLBACK = (
    "I'm not fully certain on that one — I've noted the details and, if needed, "
    "a support ticket will be created for a human follow-up."
)


def _build_dynamic_fallback(message: str, classification: dict) -> str:
    """Builds an intent/sentiment-aware fallback reply instead of a single
    static sentence, using only the deterministic classifier (no LLM needed)."""
    intent = classification.get("intent", "General Inquiry")
    escalate = classification.get("escalate", False)

    template = _FALLBACK_TEMPLATES.get(intent, _FALLBACK_TEMPLATES["General Inquiry"])

    if escalate:
        ticket_note = " I've flagged this so a human agent can follow up with you directly."
        ticket_note_lower = " I've flagged this so a human agent can follow up with you directly."
    else:
        ticket_note = " Let me know if you'd like more detail."
        ticket_note_lower = " let me know if you'd like more detail."

    return template.format(ticket_note=ticket_note, ticket_note_lower=ticket_note_lower)


class ChatbotEngine:
    """
    Orchestrates one full turn of the pipeline:
    message -> Retrieval Layer -> LLM -> Validator -> structured response.
    """

    def __init__(self):
        self.gemini = GeminiClient()
        self.retriever = KnowledgeRetriever()

    async def get_ai_reply(self, message: str, history: list = None) -> dict:
        history = history or []

        # 1. Classify (intent / sentiment / urgency / escalation)
        result = classify(message)

        # 2. Retrieval Layer — build context from the knowledge base
        context = self.retriever.build_context(message)
        kb_answer, kb_source = self.retriever.search(message)

        # 3. LLM — try Gemini first
        reply_text = await self.gemini.generate_reply(message, context, history)
        sources = []
        used_gemini = bool(reply_text)

        # 4. Fallback if LLM unavailable/failed
        if not reply_text:
            if kb_answer:
                reply_text = kb_answer
                sources = [kb_source]
            else:
                # Dynamic, intent-aware fallback instead of one static sentence
                reply_text = _build_dynamic_fallback(message, result)
        elif kb_answer:
            sources = [kb_source]

        # 5. Validator — sanitize/guarantee a safe, non-empty reply
        reply_text = InputValidator.validate_reply(reply_text)

        return {
            "reply": reply_text,
            "sources": sources,
            "used_gemini": used_gemini,
            **result,
        }
