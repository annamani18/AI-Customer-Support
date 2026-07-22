import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

try:
    import google.generativeai as genai
except ImportError:
    genai = None


class GeminiClient:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        self.api_available = False

        if genai and api_key and api_key != "your_gemini_api_key_here":
            try:
                genai.configure(api_key=api_key)
                model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
                self.model = genai.GenerativeModel(model_name)
                self.api_available = True
            except Exception as e:
                print(f"Gemini init failed, falling back to offline mode: {e}")

    async def generate_reply(self, message: str, context: str, history: list):
        """
        Returns raw text from Gemini, or None if unavailable/failed
        (caller should fall back to the keyword classifier + KB).
        """
        if not self.api_available:
            return None

        history_text = "\n".join(f"{h['role']}: {h['content']}" for h in history[-5:]) if history else ""

        prompt = f"""You are a helpful, concise customer support assistant.

Knowledge base context:
{context}

Recent conversation:
{history_text}

Customer's new message: {message}

Reply in 1-3 sentences, directly answering the customer. Do not include any JSON or formatting, just the reply text."""

        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Gemini call failed, falling back to offline mode: {e}")
            return None
