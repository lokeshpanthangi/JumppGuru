from app.db.mongodb import mongo_db
from datetime import datetime
from typing import List, Dict

chat_collection = mongo_db["chat_history"]
chat_multimodal_collection = mongo_db["multimodal_chat_history"]

async def save_message(user_id: str, role: str, content: str):
    chat_collection.update_one(
        {"user_id": user_id},

        {
            "$push": {
                "messages": {
                    "role": role,
                    "content": content
                }
            },
            "$set": {"last_updated": datetime.utcnow()}
        },
        upsert=True
    )

async def get_recent_messages(user_id: str, limit: int = 10) -> List[Dict]:
    doc = chat_collection.find_one({"user_id": user_id})
    if not doc:
        return []
     # only return last N messages as list of {"role":..., "content":...}
    msgs = doc["messages"][-limit:]
    return [{"role": m["role"], "content": m["content"]} for m in msgs]


async def get_assistant_text_by_chat_id(chat_id: str) -> List[Dict[str, str]]:
    docs = chat_multimodal_collection.find_one({"chat_id": chat_id, "role": "assistant"})
    docs1 = chat_multimodal_collection.find_one({"chat_id": chat_id, "role": "user"})
    # print("-------------docs--------------------")
    # print(docs)
    # print("-------------docs--------------------")
    return [
        {"role": "user", "content": docs1["text_content"]},
        {"role": "assistant", "content": docs["text_content"]}
    ]

