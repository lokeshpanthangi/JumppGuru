# app/api/genai_router.py
import os
import base64
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv
import google.generativeai as genai
from app.models.genai_schema import GenAIRequest, GenAIResponse

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

    try:
        for part in result.candidates[0].content.parts:
            if hasattr(part, "text") and part.text:
                blocks.append({"type": "text", "content": part.text})
            elif hasattr(part, "inline_data") and part.inline_data:
                # Convert bytes to Base64 string
                img_bytes = part.inline_data.data
                img_b64 = base64.b64encode(img_bytes).decode("utf-8")
                blocks.append({
                    "type": "image",
                    "alt": "Generated illustration",
                    "data_url": f"data:image/png;base64,{img_b64}"
                })

        return {
            "source": "LLM+IMG",
            "language": payload.lang or "auto",
            "blocks": blocks
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process response: {e}")
