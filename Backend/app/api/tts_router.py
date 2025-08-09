# app/api/tts_router.py
import os
import requests
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/tts", tags=["text-to-speech"])

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"


class TTSRequest(BaseModel):
    text: str
    target_language_code: str = "hi-IN"  # Default to Hindi


@router.post("/generate")
async def generate_tts(payload: TTSRequest):
    """
    Generate speech audio from text using Sarvam TTS API.
    """
    if not SARVAM_API_KEY:
        raise HTTPException(status_code=500, detail="Missing SARVAM_API_KEY in environment")

    try:
        resp = requests.post(
            SARVAM_TTS_URL,
            headers={
                "api-subscription-key": SARVAM_API_KEY
            },
            json={
                "text": payload.text,
                "target_language_code": payload.target_language_code
            },
            timeout=30
        )
        resp.raise_for_status()
        data = resp.json()

        if "audios" not in data or not data["audios"]:
            raise HTTPException(status_code=500, detail="No audio returned from Sarvam API")

        # Return same format as Sarvam
        return {
            "request_id": data.get("request_id"),
            "audio_base64": data["audios"][0]
        }

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Request failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
