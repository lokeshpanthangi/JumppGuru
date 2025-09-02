from app.db.mongodb import mongo_collection_chunk
from app.scripts.insert_rag_chunks import get_embedding
from openai import OpenAI
import os
import asyncio

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def chunk_text(text: str, max_len: int = 300) -> list[str]:
    sentences = text.split(". ")
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        if len(current_chunk) + len(sentence) < max_len:
            current_chunk += sentence + ". "
        else:
            chunks.append(current_chunk.strip())
            current_chunk = sentence + ". "

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks


async def chunk_and_store_summary(summary: str, query: str, source_url: str):
    chunks = chunk_text(summary)

    if not chunks:
        print("❌ No chunks generated from summary.")
        return

    documents = []

    for chunk in chunks:
        try:
            embedding = await get_embedding(chunk)

            document = {
                "text": chunk,
                "embedding": embedding,
                "query": query,
                "source": "web",
                "origin_url": source_url,
                "metadata": {
                    "content_type": "web_summary",
                    "confidence_score": 0.8,
                    "subject": "general"
                }
            }

            documents.append(document)
        except Exception as e:
            print(f"❌ Failed to embed chunk: {chunk[:30]}... | Error: {e}")

    if documents:
        try:
            mongo_collection_chunk.insert_many(documents)
            print(f"✅ Stored {len(documents)} chunks in MongoDB.")
        except Exception as e:
            print(f"❌ MongoDB insert error: {e}")
