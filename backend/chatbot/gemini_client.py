import os
from dotenv import load_dotenv

load_dotenv()

try:
    import google.generativeai as genai
except ImportError:
    genai = None

from prompts.system_prompts import build_chat_prompt


class GeminiClient:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        self.api_available = False

        if genai is None:
            print(
                "[GeminiClient] 'google-generativeai' package is not installed — "
                "running in offline mode. Run: pip install google-generativeai"
            )
        elif not api_key or api_key == "your_gemini_api_key_here":
            print(
                "[GeminiClient] GEMINI_API_KEY is not set (no .env file or placeholder "
                "value found) — running in offline mode. Copy .env.example to .env and "
                "add a real key from https://aistudio.google.com/apikey to enable live AI replies."
            )
        else:
            try:
                genai.configure(api_key=api_key)
                model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
                self.model = genai.GenerativeModel(model_name)
                self.api_available = True
                print(f"[GeminiClient] Gemini API active (model={model_name}).")
            except Exception as e:
                print(f"[GeminiClient] Gemini init failed, falling back to offline mode: {e}")

    async def generate_reply(self, message: str, context: str, history: list):
        """Returns raw text from Gemini, or None if unavailable/failed."""
        if not self.api_available:
            return None

        history_text = "\n".join(f"{h['role']}: {h['content']}" for h in history[-5:]) if history else ""
        prompt = build_chat_prompt(message, context, history_text)

        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"[GeminiClient] Gemini call failed, falling back to offline mode: {e}")
            return None
