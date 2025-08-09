# app/api/youtube_router.py
import os
import requests
from fastapi import APIRouter, HTTPException, Query
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/youtube", tags=["youtube"])

SERPAPI_KEY = os.getenv("SERPER_API_KEY")
SERPAPI_URL = "https://serpapi.com/search.json"

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
