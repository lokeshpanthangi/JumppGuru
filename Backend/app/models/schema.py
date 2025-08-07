from pydantic import BaseModel
from typing import List, Optional

class QueryRequest(BaseModel):
    query: str
    lang: Optional[str] = "auto"  # auto | english | hinglish
    mode: Optional[str] = "general"  # general | web

class Quiz(BaseModel):
    question: str
    options: List[str]
    answer: str

class PageContent(BaseModel):
    script: str
    audio: Optional[str] = None
    image_prompts: Optional[List[str]] = []
    quizzes: Optional[List[Quiz]] = []

class QueryResponse(BaseModel):
    source: str  # e.g. LLM, RAG, WEB
    language: str
    lesson: List[PageContent]
