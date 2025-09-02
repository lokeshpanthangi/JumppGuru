import os
# import httpx
from dotenv import load_dotenv
import requests

load_dotenv()

SERPAPI_KEY = os.getenv("SERPER_API_KEY")  # Your SerpApi key

async def web_search(question: str, num_results: int = 3):
    params = {
        "q": question,
        "api_key": SERPAPI_KEY,
        "engine": "google",
        "num": num_results
    }
    try:
        response = requests.get("https://serpapi.com/search", params=params)
        results = response.json().get("organic_results", [])
    except Exception as e:
        print(f"❌ SerpApi failed: {e}")
        return
        
    urls = [result.get("link") for result in results if result.get("link")]
    if not urls:
        print("❌ No URLs found to process")
        return []
    print(f"📋 Found {len(urls)} URLs to process")
    return urls