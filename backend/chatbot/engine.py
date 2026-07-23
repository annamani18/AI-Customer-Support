from chatbot.classifier import classify
from chatbot.gemini_client import GeminiClient
from retrieval.retriever import KnowledgeRetriever
from validators.input_validator import InputValidator


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

        # 4. Fallback if LLM unavailable/failed
        if not reply_text:
            if kb_answer:
                reply_text = kb_answer
                sources = [kb_source]
            else:
                reply_text = (
                    "I'm not fully certain on that one — I've noted the details and, "
                    "if needed, a support ticket will be created for a human follow-up."
                )
        elif kb_answer:
            sources = [kb_source]

        # 5. Validator — sanitize/guarantee a safe, non-empty reply
        reply_text = InputValidator.validate_reply(reply_text)

        return {
            "reply": reply_text,
            "sources": sources,
            **result,
        }
