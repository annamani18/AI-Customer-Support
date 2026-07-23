SUPPORT_SYSTEM_PROMPT = """You are a helpful, concise customer support assistant for an
e-commerce/SaaS company. Answer the customer's question directly in 1-3 sentences using
the knowledge base context provided. Be professional and empathetic. Do not include any
JSON or formatting in your reply — plain text only."""


def build_chat_prompt(message: str, context: str, history_text: str) -> str:
    """Assembles the full prompt sent to the LLM for a chat turn."""
    return f"""{SUPPORT_SYSTEM_PROMPT}

Knowledge base context:
{context}

Recent conversation:
{history_text}

Customer's new message: {message}"""
