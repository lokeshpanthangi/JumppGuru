# app/api/genai_router.py
import asyncio
import json
import os
import base64
import uuid
import re
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from dotenv import load_dotenv
import google.generativeai as genai
from starlette.responses import StreamingResponse
from app.models.genai_schema import GenAIRequest, GenAIResponse
from app.db.mongodb import multimodal_chat_collection
import re
from typing import AsyncGenerator, List, Dict
import boto3
from botocore.exceptions import ClientError
import io
from app.db.mongodb import mongo_collection
from fastapi import HTTPException
from bson import ObjectId

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
async def generate_tutorial_stream(payload: GenAIRequest):
    """Generate tutorial with SSE streaming"""
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Empty query")

    # Return StreamingResponse for SSE
    return StreamingResponse(
        _stream_tutorial_content(payload),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        }
    )

async def _stream_tutorial_content(payload: GenAIRequest) -> AsyncGenerator[str, None]:
    """Internal streaming function"""
    model = genai.GenerativeModel("gemini-2.0-flash-preview-image-generation")
    
    # Initialize variables
    blocks = []
    text_only_parts = []
    chat_id = str(uuid.uuid4())
    image_index = 0
    current_text_block = ""
    
    # Send initial metadata
    yield f"data: {json.dumps({'type': 'init', 'chat_id': chat_id})}\n\n"
    
    try:
        # Create streaming request
        response_stream = model.generate_content(
            payload.query + ADDITIONAL_INSTRUCTIONS,
            generation_config={"response_modalities": ["TEXT", "IMAGE"]},
            stream=True  # Enable streaming - moved outside generation_config
        )
        
        # Process streaming response
        for chunk in response_stream:
            try:
                # Process each part in the chunk
                if hasattr(chunk, 'candidates') and chunk.candidates:
                    candidate = chunk.candidates[0]
                    if hasattr(candidate, 'content') and candidate.content:
                        for part in candidate.content.parts:
                            
                            # Handle text streaming
                            if hasattr(part, "text") and part.text:
                                current_text_block += part.text
                                text_only_parts.append(part.text)
                                
                                # Stream text chunk to frontend
                                text_data = {
                                    "type": "text_chunk",
                                    "content": part.text,
                                    "chat_id": chat_id
                                }
                                yield f"data: {json.dumps(text_data)}\n\n"
                                
                            # Handle complete image
                            elif hasattr(part, "inline_data") and part.inline_data:
                                # Send loading indicator for image
                                loading_data = {
                                    "type": "image_loading",
                                    "message": f"Processing image {image_index + 1}...",
                                    "chat_id": chat_id
                                }
                                yield f"data: {json.dumps(loading_data)}\n\n"
                                
                                # Process complete image
                                img_bytes = part.inline_data.data
                                
                                # Upload image to S3 and get URL
                                s3_url = await upload_image_to_s3(img_bytes, chat_id, image_index)
                                
                                # Create image block
                                image_block = {
                                    "type": "image",
                                    "alt": f"Generated illustration {image_index + 1}",
                                    "image_url": s3_url
                                }
                                blocks.append(image_block)
                                
                                # Stream complete image to frontend
                                image_data = {
                                    "type": "image_complete",
                                    "content": image_block,
                                    "chat_id": chat_id
                                }
                                yield f"data: {json.dumps(image_data)}\n\n"
                                
                                image_index += 1
                                
            except Exception as e:
                error_data = {
                    "type": "error",
                    "message": f"Error processing chunk: {str(e)}",
                    "chat_id": chat_id
                }
                yield f"data: {json.dumps(error_data)}\n\n"
                continue
        
        # Finalize text block
        if current_text_block:
            blocks.append({"type": "text", "content": current_text_block})
        
        # Generate clean text content
        raw_text = "".join(text_only_parts)
        clean_text = re.sub(r'[^a-zA-Z0-9\s,.!?]', '', raw_text)
        
        # Save to database asynchronously
        await _save_chat_messages(payload, chat_id, blocks, clean_text)
        
        # Send completion message
        completion_data = {
            "type": "complete",
            "chat_id": chat_id,
            "source": "LLM+IMG",
            "language": payload.lang or "auto",
            "total_blocks": len(blocks),
            "total_images": image_index
        }
        yield f"data: {json.dumps(completion_data)}\n\n"
        
    except Exception as e:
        # Send error to frontend instead of raising HTTPException
        error_data = {
            "type": "fatal_error",
            "message": f"Gemini streaming failed: {str(e)}",
            "chat_id": chat_id
        }
        yield f"data: {json.dumps(error_data)}\n\n"

async def _save_chat_messages(payload: GenAIRequest, chat_id: str, blocks: list, clean_text: str):
    """Save chat messages to database asynchronously"""
    try:
        # Save USER message
        user_message = {
            "user_id": payload.user_id,
            "chat_id": chat_id,
            "timestamp": datetime.utcnow(),
            "role": "user",
            "text_content": payload.query,
            "youtube_links": [],
            "generated_mcq_questions": []
        }
        
        # Save ASSISTANT message
        assistant_message = {
            "user_id": payload.user_id,
            "chat_id": chat_id,
            "timestamp": datetime.utcnow(),
            "role": "assistant",
            "content": blocks,
            "text_content": clean_text,
        }
        
        # Insert both messages asynchronously
        await asyncio.gather(
            asyncio.to_thread(multimodal_chat_collection.insert_one, user_message),
            asyncio.to_thread(multimodal_chat_collection.insert_one, assistant_message)
        )
        
    except Exception as e:
        print(f"Database save error: {e}")  # Log error but don't break streaming



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


        # try:
        #     mongo_collection.insert_one({
        #         "user_id": payload.user_id,
        #         "page": page,
        #         "timestamp": datetime.utcnow(),
        #         "chat_id": chat_id,
        #         "query": payload.query,
        #         "response": blocks,
        #         "LLM_model": "gemini",
        #         # "language": user_lang,
        #         # "source": source
        #     })
        # except Exception as e:
        #     print(f"Failed to insert into MongoDB: {e}")

        return {
            "source": "LLM+IMG",
            "language": payload.lang or "auto",
            "blocks": blocks,
            "chat_id": chat_id,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process response: {e}")


# @router.get("/history/{user_id}")
# async def get_chat_history(user_id: str):
#     try:
#         # Fetch and sort chats by timestamp
#         chats = list(
#             multimodal_chat_collection
#             .find({"user_id": user_id})
#             .sort("timestamp", 1)  # Ascending order
#         )

#         # Group by chat_id
#         history_dict: Dict[str, Dict] = {}
#         for chat in chats:
#             chat_id = chat["chat_id"]

#             if chat_id not in history_dict:
#                 history_dict[chat_id] = {
#                     "chatId": chat_id,
#                     "user": {},
#                     "assistant": {}
#                 }

#             if chat["role"] == "user":
#                 history_dict[chat_id]["user"] = {
#                     "query": chat.get("text_content", ""),
#                     "timestamp": chat["timestamp"],
#                     "youtube_links": chat.get("youtube_links", []),
#                     "generated_mcq_questions": chat.get("generated_mcq_questions", []),
#                 }

#             elif chat["role"] == "assistant":
#                 history_dict[chat_id]["assistant"] = {
#                     "content": chat.get("content", []),
#                     "timestamp": chat["timestamp"]
#                 }

#         # Convert dict to sorted list
#         history_list = list(history_dict.values())
#         history_list.sort(key=lambda x: x["user"].get("timestamp", datetime.min))

#         return {"history": history_list}

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to fetch chat history: {e}")

@router.get("/history/{user_id}")
async def get_chat_history(user_id: str):
    try:
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$sort": {"timestamp": 1}},
            {
                "$group": {
                    "_id": "$page",
                    "chats": {
                        "$push": {
                            "_id": {"$toString": "$_id"},
                            "timestamp": "$timestamp",
                            "chat_id": "$chat_id",
                            "query": "$query",
                            "response": "$response",
                            "youtube_links": "$youtube_links",
                            "generated_mcq_questions": "$generated_mcq_questions",
                            "LLM_model": "$LLM_model"
                        }
                    }
                }
            },
            {"$sort": {"_id": 1}}
        ]

        history_data = list(mongo_collection.aggregate(pipeline))

        # If no history found, return empty list
        if not history_data:
            return {
                "user_id": user_id,
                "history": []
            }

        # Transform data to add "page" and "preview"
        formatted_history = []
        for doc in history_data:
            page_num = doc.pop("_id")
            chats = doc["chats"]
            preview = chats[0]["query"] if chats else ""  # 1st chat query
            formatted_history.append({
                "page": page_num,
                "preview": preview,
                "chats": chats
            })

        return {
            "user_id": user_id,
            "history": formatted_history
        }

    except Exception as e:
        print(f"Error fetching chat history: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving chat history")
