# app/api/genai_router.py
import os
import base64
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from dotenv import load_dotenv
import google.generativeai as genai
from app.models.genai_schema import GenAIRequest, GenAIResponse
from app.db.mongodb import multimodal_chat_collection
import re
from typing import List, Dict
import boto3
from botocore.exceptions import ClientError
import io

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION")
)

AWS_S3_BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME")

router = APIRouter(prefix="/genai", tags=["genai"])

ADDITIONAL_INSTRUCTIONS = """
You are an expert tutorial creator.
When the user asks something, respond in **very detailed Markdown format** with:
- A catchy title as an H1.
- An intro very detailed paragraph.
- A numbered list of steps, each with a **bold heading** and very detailed clear explanation.
- Add relevant illustrations between steps, in authentic Indian style, bright colours, with textures and details.
- Interleave text and images naturally, don't group them.
- keep the image size to be strictly 500*500
- Use Hinglish casually for warmth.
"""

async def upload_image_to_s3(image_data: bytes, chat_id: str, image_index: int) -> str:
    """
    Upload image to S3 and return the public URL
    """
    try:
        # Generate unique filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"tutorials/{chat_id}/image_{image_index}_{timestamp}.png"
        
        # Upload to S3
        s3_client.put_object(
            Bucket=AWS_S3_BUCKET_NAME,
            Key=filename,
            Body=io.BytesIO(image_data),
            ContentType='image/png',
            # Make the object publicly readable
            # ACL='public-read'
        )
        
        # Generate public URL
        s3_url = f"https://{AWS_S3_BUCKET_NAME}.s3.{os.getenv('AWS_REGION')}.amazonaws.com/{filename}"
        
        return s3_url
        
    except ClientError as e:
        print(f"Error uploading to S3: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image to S3: {e}")

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
    chat_id = str(uuid.uuid4())
    image_index = 0

    try:
        for part in result.candidates[0].content.parts:
            if hasattr(part, "text") and part.text:
                blocks.append({"type": "text", "content": part.text})
                text_only_parts.append(part.text)
            elif hasattr(part, "inline_data") and part.inline_data:
                img_bytes = part.inline_data.data
                
                # Upload image to S3 and get URL
                s3_url = await upload_image_to_s3(img_bytes, chat_id, image_index)
                
                blocks.append({
                    "type": "image",
                    "alt": "Generated illustration",
                    "image_url": s3_url  # Store S3 URL instead of base64
                })
                
                image_index += 1

        # Generate clean text content
        raw_text = "\n".join(text_only_parts)
        clean_text = re.sub(r'[^a-zA-Z0-9\s,.!?]', '', raw_text)

        # Save USER message
        multimodal_chat_collection.insert_one({
            "user_id": payload.user_id,
            "chat_id": chat_id,
            "timestamp": datetime.utcnow(),
            "role": "user",
            "text_content": payload.query,
            "youtube_links": [],
            "generated_mcq_questions": []
        })

        # Save ASSISTANT message with S3 URLs
        multimodal_chat_collection.insert_one({
            "user_id": payload.user_id,
            "chat_id": chat_id,
            "timestamp": datetime.utcnow(),
            "role": "assistant",
            "content": blocks,  # Now contains S3 URLs instead of base64
            "text_content": clean_text,
        })

        return {
            "source": "LLM+IMG",
            "language": payload.lang or "auto",
            "blocks": blocks,
            "chat_id": chat_id,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process response: {e}")


@router.get("/history/{user_id}")
async def get_chat_history(user_id: str):
    try:
        # Fetch and sort chats by timestamp
        chats = list(
            multimodal_chat_collection
            .find({"user_id": user_id})
            .sort("timestamp", 1)  # Ascending order
        )

        # Group by chat_id
        history_dict: Dict[str, Dict] = {}
        for chat in chats:
            chat_id = chat["chat_id"]

            if chat_id not in history_dict:
                history_dict[chat_id] = {
                    "chatId": chat_id,
                    "user": {},
                    "assistant": {}
                }

            if chat["role"] == "user":
                history_dict[chat_id]["user"] = {
                    "query": chat.get("text_content", ""),
                    "timestamp": chat["timestamp"],
                    "youtube_links": chat.get("youtube_links", []),
                    "generated_mcq_questions": chat.get("generated_mcq_questions", []),
                }

            elif chat["role"] == "assistant":
                history_dict[chat_id]["assistant"] = {
                    "content": chat.get("content", []),
                    "timestamp": chat["timestamp"]
                }

        # Convert dict to sorted list
        history_list = list(history_dict.values())
        history_list.sort(key=lambda x: x["user"].get("timestamp", datetime.min))

        return {"history": history_list}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chat history: {e}")