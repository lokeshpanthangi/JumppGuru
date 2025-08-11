from pydantic import BaseModel
from typing import List, Optional

class QueryRequest(BaseModel):
    page: int
    query: str
    # user_id: Optional[str] = None
    user_id: str
    chat_id: Optional[str] = None
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

# New models for MCQ endpoint:
class MCQItem(BaseModel):
    question: str
    options: List[str]
    answer: str
    explanation: Optional[str] = None

class GenerateMCQRequest(BaseModel):
    user_id: str
    num_questions: Optional[int] = 8
    difficulty: Optional[str] = "medium"  # easy | medium | hard
    chat_id: Optional[str] = None

class GenerateMCQResponse(BaseModel):
    user_id: str
    mcqs: List[MCQItem]
    source: str  # "generated" | "cached"

class ChatItem(BaseModel):
    query: str
    response: str

class GenerateLessonRequest(BaseModel):
    user_id: str
    category: str
    chats: List[ChatItem]
