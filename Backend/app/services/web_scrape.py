import httpx
from bs4 import BeautifulSoup
from openai import OpenAI
import asyncio  
import os

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def scrape_and_summarize(url: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=10) as client_http:
            response = await client_http.get(url)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")
            text = " ".join([p.get_text() for p in soup.find_all("p")])
            text = text[:3000]  # Truncate to fit context
    except Exception as e:
        print(f"Scrape error at {url}: {e}")
        return ""

    prompt = f"Summarize the following article in simple points:\n\n{text}"
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You're a summarizer."},
            {"role": "user", "content": prompt}
        ]
    )
    print("--------------summary from gpt------------------")
    print(completion.choices[0].message.content)
    print("---------------summary from gpt-----------------")
    return completion.choices[0].message.content
