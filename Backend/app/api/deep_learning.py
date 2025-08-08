from fastapi import APIRouter
from bson import ObjectId
from datetime import datetime
import json
import os

from app.db.mongodb import mongo_history_collection, deep_learning_collection
from app.services.vector_search import query_rag_chunks
from app.services.web_fallback import web_fallback_answer
from openai import OpenAI
from app.models.schema import GenerateLessonRequest, QueryResponse, PageContent

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

router = APIRouter()

@router.get("/deep_learning/init")
async def init_deep_learning(user_id: str):
    """
    Returns static categories + all past conversations for selection.
    """
    categories = ["Finance", "Science", "Technology", "Health", "History"]

    chats = []
    cursor = mongo_history_collection.find({"user_id": user_id}).sort("last_updated", -1)

    for doc in cursor:
        messages = doc.get("messages", [])
        
        for i in range(len(messages) - 1):
            if messages[i]["role"] == "user" and messages[i + 1]["role"] == "assistant":
                user_msg = messages[i]["content"]
                assistant_msg = messages[i + 1]["content"]

                chats.append({
                    "query": user_msg,
                    "response": assistant_msg,
                })

    return {
        "categories": categories,
        "chats": chats
    }



@router.post("/deep_learning/generate")
async def generate_deep_learning(payload: GenerateLessonRequest):
    """
    Accepts up to 5 chat objects and generates a structured deep learning lesson.
    """
    if not (1 <= len(payload.chats) <= 5):
        return {"error": "Please select between 1 to 5 chats."}

    # Step 1: Build combined context
    combined_context = ""
    for chat in payload.chats:
        combined_context += f"Q: {chat.query}\nA: {chat.response}\n\n"

    # Step 2: Retrieve related chunks (RAG) or fallback to web search
    related_chunks = await query_rag_chunks(combined_context, 5, 0.8)
    chunk_text = "\n".join([chunk.get("text", "") for chunk in related_chunks]) if related_chunks else ""

    print("-------------chunk_text--------------------")
    print(chunk_text)
    print("-------------chunk_text--------------------")


    if not chunk_text:
        web_context = await web_fallback_answer(combined_context)
        chunk_text = web_context or ""
        print("-------------web_text--------------------")
        print(chunk_text)
        print("-------------web_text--------------------")

    # Step 3: Prompt OpenAI to generate the lesson
    prompt = f"""
You are an expert educator. Using the following conversation history and extra context, 
create a detailed multi-page lesson.

Conversation History:
{combined_context}

Additional Context:
{chunk_text}

Output the lesson as a JSON array where each element has:
- "title": topic of the page
- "content": detailed explanation in educational tone
"""

    final = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You're a helpful and structured educator."},
            {"role": "user", "content": prompt}
        ]
    )

    print(final)

    try:
        lesson_data = final.choices[0].message.content
    except json.JSONDecodeError:
        return {"error": "Failed to parse lesson content from model response."}

    # Step 4: Save lesson in MongoDB
    deep_learning_collection.insert_one({
        "user_id": payload.user_id,
        "category": payload.category,
        "lesson": lesson_data,
        # "chats_used": [chat.dict() for chat in payload.chats],
        "created_at": datetime.utcnow()
    })
    page = PageContent(script=lesson_data, audio=None, image_prompts=["concept"], quizzes=[])
    return QueryResponse(source="DEEP_LEARNING", language="GENERAL", lesson=[page])
