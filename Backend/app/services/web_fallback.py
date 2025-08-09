from app.services.web_search import web_search
from app.services.web_scrape import scrape_and_summarize
from app.services.vector_utils import chunk_and_store_summary
from openai import OpenAI
import asyncio
import os

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def web_fallback_answer(query: str, history=None) -> str:
    """
    Web fallback for queries not answered by direct LLM or RAG.
    Scrapes, summarizes, stores in vector DB, and answers with history context.
    """

    urls = await web_search(query)
    print("i GOT THE URLS")
    print(urls)
    if not urls:
        return "Sorry, I couldn't find anything useful on the web."

    # Scrape + summarize in parallel
    summaries = await asyncio.gather(*(scrape_and_summarize(url) for url in urls))
    summaries = [s for s in summaries if s.strip()]
    context = "\n\n".join(summaries)[:7000]


    print("--------------context----------------")
    print(context)
    print("----------------context--------------")

    await chunk_and_store_summary(context, query, str(urls))


    # Final LLM prompt with history included
    messages = [{"role": "system", "content": "You're a helpful educational assistant."}]
    
    if history:
        messages.extend(history)  # Append last N user+assistant turns
    
    messages.append({"role": "user", "content": f"Use the following web content to answer the user's question:\n\n{context}\n\nQuestion: {query}"})

    final = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages
    )

    return final.choices[0].message.content
