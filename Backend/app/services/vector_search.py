import os
from pymongo import MongoClient
from app.scripts.insert_rag_chunks import get_embedding
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["demo"]
collection = db["rag_chunks"]

async def query_rag_chunks(query: str, top_k: int = 10, min_score: float = 0.6):
    embedding = await get_embedding(query)

    pipeline = [
        {
            "$search": {
                "index": "default",  # your vector index name
                "knnBeta": {
                    "vector": embedding,
                    "path": "embedding",
                    "k": top_k
                }
            }
        },
        {
            "$project": {
                "text": 1,
                "subject": 1,
                "score": {"$meta": "searchScore"}
            }
        },
        {
            "$match": {
                "score": {"$gte": min_score}
            }
        }
    ]

    return list(collection.aggregate(pipeline))
