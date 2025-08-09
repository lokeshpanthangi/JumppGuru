# app/api/genai_router.py
import os
import base64
import uuid
import re
from datetime import datetime
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv
import google.generativeai as genai
from app.models.genai_schema import GenAIRequest, GenAIResponse
from app.db.mongodb import multimodal_chat_collection  # new collection import

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

router = APIRouter(prefix="/genai", tags=["genai"])

ADDITIONAL_INSTRUCTIONS = """
You are an expert tutorial creator.
When the user asks something, respond in **very detailed Markdown format** with:
- A catchy title as an H1.
- An intro very detailed paragraph.
- A numbered list of steps, each with a **bold heading** and very detailed clear explanation.
- Add relevant illustrations between steps, in authentic Indian style, bright colours, with textures and details.
- Interleave text and images naturally, don’t group them.
- keep the image size to be strictly 500*500
- Use Hinglish casually for warmth.
"""

@router.post("/generate", response_model=GenAIResponse)
async def generate_tutorial(payload: GenAIRequest):
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Empty query")

    model = genai.GenerativeModel("gemini-2.0-flash-preview-image-generation")

    try:
        result = model.generate_content(
            payload.query + ADDITIONAL_INSTRUCTIONS,
            generation_config={"response_modalities": ["TEXT", "IMAGE"]}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini call failed: {e}")

    blocks = []
    text_only_parts = []

    try:
        for part in result.candidates[0].content.parts:
            if hasattr(part, "text") and part.text:
                blocks.append({"type": "text", "content": part.text})
                text_only_parts.append(part.text)
            elif hasattr(part, "inline_data") and part.inline_data:
                # Robustly build a proper data URL, handling both bytes and base64 strings
                raw = part.inline_data.data
                mime = getattr(part.inline_data, "mime_type", "image/png") or "image/png"

                img_b64: str
                if isinstance(raw, (bytes, bytearray)):
                    img_b64 = base64.b64encode(raw).decode("utf-8")
                elif isinstance(raw, str):
                    # Strip existing data URL prefix if present
                    m = re.match(r'^data:image/[^;]+;base64,(.*)$', raw)
                    candidate = m.group(1) if m else raw
                    try:
                        # Validate base64; if valid, use as-is
                        base64.b64decode(candidate, validate=True)
                        img_b64 = candidate
                    except Exception:
                        # Fallback: encode the string bytes
                        img_b64 = base64.b64encode(candidate.encode("utf-8")).decode("utf-8")
                else:
                    # Unsupported data type
                    continue

                blocks.append({
                    "type": "image",
                    "alt": "",
                    "data_url": f"data:{mime};base64,{img_b64}"
                })

        # Generate unique chat_id for this interaction
        chat_id = str(uuid.uuid4())

        # Save USER message
        multimodal_chat_collection.insert_one({
            "user_id": payload.user_id,
            "chat_id": chat_id,
            "timestamp": datetime.utcnow(),
            "role": "user",
            "text_content": payload.query,
        })

        # Save ASSISTANT message
        multimodal_chat_collection.insert_one({
            "user_id": payload.user_id,
            "chat_id": chat_id,
            "timestamp": datetime.utcnow(),
            "role": "assistant",
            "content": blocks,
            "text_content": "\n".join(text_only_parts),
            "youtube_links": [],
            "generated_mcq_questions": []
        })

        return {
            "source": "LLM+IMG",
            "language": payload.lang or "auto",
            "blocks": blocks
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process response: {e}")
