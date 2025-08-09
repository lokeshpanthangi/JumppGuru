# app/models/genai_schema.py
from pydantic import BaseModel
from typing import List, Optional

class GenAIRequest(BaseModel):
    user_id: Optional[str] = None
    query: str
    lang: Optional[str] = "auto"    # hint: english | hinglish | auto
    max_images: Optional[int] = 5   # maximum images allowed to generate

class TextBlock(BaseModel):
    type: str = "text"              # "text"
    content: str                    # markdown content

class ImageBlock(BaseModel):
    type: str = "image"             # "image"
    prompt: str                     # prompt used to generate the image (for debugging)
    alt: Optional[str] = None       # optional alt text
    data_url: Optional[str] = None  # "data:image/png;base64,...." set by server

class GenAIResponse(BaseModel):
    source: str                     # "LLM+IMG"
    language: str
    blocks: List[dict]              # list of TextBlock | ImageBlock (kept as dict for flexibility)
