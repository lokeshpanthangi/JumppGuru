# app/api/youtube_router.py
import os
import requests
from fastapi import APIRouter, HTTPException, Query
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List, Dict
from app.db.mongodb import multimodal_chat_collection
from app.db.mongodb import mongo_collection
from datetime import datetime

load_dotenv()

router = APIRouter(prefix="/youtube", tags=["youtube"])

SERPAPI_KEY = os.getenv("SERPER_API_KEY")
SERPAPI_URL = "https://serpapi.com/search.json"


class YouTubeLinksRequest(BaseModel):
    user_id: str
    page: int
    chat_id: str
    videos: List[Dict]

@router.get("/recommend")
async def recommend_videos(q: str = Query(..., description="User query")):
    """
    Fetch top 8 YouTube videos for a given search query using SerpAPI.
    """
    if not SERPAPI_KEY:
        raise HTTPException(status_code=500, detail="Missing SERPAPI_KEY in environment")

    params = {
        "engine": "youtube",
        "search_query": q,
        "gl": "IN",   # Country: India
        "hl": "hi",   # Hindi results (can change to 'en' for English)
        "api_key": SERPAPI_KEY
    }

    try:
        resp = requests.get(SERPAPI_URL, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        videos = []
        for item in data.get("video_results", [])[:8]:
            videos.append({
                "title": item.get("title"),
                "link": item.get("link"),
                "thumbnail": item.get("thumbnail", {}).get("static", None),
                "views": item.get("views"),
                "channel": item.get("channel", {}).get("name"),
                "published": item.get("published")
            })

        if not videos:
            raise HTTPException(status_code=404, detail="No videos found")

        return {
            "query": q,
            "count": len(videos),
            "videos": videos
        }

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Request failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


from datetime import datetime
from fastapi import HTTPException

@router.post("/update_youtube_links")
async def update_youtube_links(payload: YouTubeLinksRequest):
    """
    Update the youtube_links for the given chat_id and role='user',
    then save relevant details to mongo_collection.
    """

    # Step 1: Update youtube_links in multimodal_chat_collection
    result = multimodal_chat_collection.update_one(
        {"chat_id": payload.chat_id, "role": "user"},
        {"$set": {"youtube_links": payload.videos}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Chat not found for given chat_id and role=user.")

    # Step 2: Fetch user document
    user_doc = multimodal_chat_collection.find_one(
        {"chat_id": payload.chat_id, "role": "user"},
        {"user_id": 1, "text_content": 1, "youtube_links": 1, "generated_mcq_questions": 1}
    )

    if not user_doc:
        raise HTTPException(status_code=404, detail="User chat document not found.")

    # Step 3: Fetch assistant document
    assistant_doc = multimodal_chat_collection.find_one(
        {"chat_id": payload.chat_id, "role": "assistant"},
        {"content": 1}
    )

    if not assistant_doc:
        raise HTTPException(status_code=404, detail="Assistant chat document not found.")

    # Step 4: Prepare fields
    user_id = user_doc.get("user_id")
    query = user_doc.get("text_content")
    youtube_links = user_doc.get("youtube_links", [])
    generated_mcq_ques = user_doc.get("generated_mcq_questions", [])
    response = assistant_doc.get("content", [])

    # Step 5: Save into mongo_collection
    try:
        mongo_collection.insert_one({
            "user_id": user_id,
            "page": payload.page,
            "timestamp": datetime.utcnow(),
            "chat_id": payload.chat_id,
            "query": query,
            "response": response,
            "youtube_links": youtube_links,
            "generated_mcq_questions": generated_mcq_ques,
            "LLM_model": "gemini",
        })
    except Exception as e:
        print(f"Failed to insert into MongoDB: {e}")
        raise HTTPException(status_code=500, detail="Error saving to mongo_collection")

    return {
        "message": "YouTube links updated and details saved successfully."
    }
