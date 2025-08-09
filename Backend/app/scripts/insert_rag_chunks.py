import os
import json
import asyncio
from pymongo import MongoClient
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
mongo = MongoClient(os.getenv("MONGO_URI"))
db = mongo["demo"]
collection = db["rag_chunks"]

async def get_embedding(texts: list[str]):
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=texts
    )
    return response.data[0].embedding

async def insert_chunks(documents):
    collection.insert_one(documents)
