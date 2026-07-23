import json
import os
import re


class KnowledgeRetriever:
    def __init__(self):
        self.kb_path = os.path.join(os.path.dirname(__file__), "knowledge_base.json")
        self.knowledge_base = self._load_kb()

    def _load_kb(self):
        try:
            with open(self.kb_path, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading knowledge base: {e}")
            return {"faq": [], "company_info": {}}

    @staticmethod
    def _contains(text: str, keyword: str) -> bool:
        """Whole-word/phrase match so short keywords (e.g. 'hi') don't false-positive
        inside unrelated words (e.g. 'this', 'which')."""
        pattern = r"\b" + re.escape(keyword) + r"\b"
        return re.search(pattern, text) is not None

    def search(self, query: str):
        """Returns (answer, source) for the best keyword match, or (None, None)."""
        text = query.lower()
        for item in self.knowledge_base.get("faq", []):
            if any(self._contains(text, k) for k in item["keywords"]):
                return item["answer"], item["source"]
        return None, None

    def get_company_context(self):
        return self.knowledge_base.get("company_info", {})

    def build_context(self, query: str) -> str:
        """Assembles a context string for the LLM prompt, combining company info + best FAQ match."""
        info = self.get_company_context()
        answer, source = self.search(query)

        context = f"Company: {info.get('name', 'SupportAI')}\nHours: {info.get('hours', '24/7')}\n\n"
        if answer:
            context += f"Relevant FAQ ({source}): {answer}"
        else:
            context += "No specific FAQ match found. Use general support knowledge."
        return context
