class InputValidator:
    """
    Validates incoming customer messages before they reach the retrieval/LLM
    pipeline. Corresponds to the "Validator" stage in the system architecture
    (Customer -> Chat UI -> API -> Retrieval Layer -> LLM -> Validator -> Response).
    """

    FORBIDDEN_PATTERNS = ["ignore previous instructions", "system bypass", "ignore all instructions"]

    @staticmethod
    def validate_text(text: str):
        if not text or len(text.strip()) < 2:
            return False, "Please enter a more detailed message."

        if len(text) > 2000:
            return False, "Message is too long. Please shorten it to under 2000 characters."

        lowered = text.lower()
        if any(pattern in lowered for pattern in InputValidator.FORBIDDEN_PATTERNS):
            return False, "This message could not be processed. Please rephrase your request."

        return True, ""

    @staticmethod
    def validate_reply(reply_text: str) -> str:
        """
        Validates/cleans the LLM's reply before it's sent back to the customer.
        Falls back to a safe default if the model returned something empty or malformed.
        """
        if not reply_text or not reply_text.strip():
            return "I'm sorry, I wasn't able to generate a response. A support ticket will be created if needed."
        return reply_text.strip()
