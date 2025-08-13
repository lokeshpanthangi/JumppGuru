from fastapi import APIRouter
from pydantic import BaseModel
import random
import string
from app.db.mongodb import mongo_db

users_collection = mongo_db["users"]  # Assuming you have a MongoDB "users" collection
router = APIRouter()

# Request model
class CreateUserRequest(BaseModel):
    name: str


@router.post("/users")
async def create_user(user: CreateUserRequest):
    # Generate a simple unique username
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    username = f"{user.name.lower()}_{random_suffix}"

    user_data = {
        "name": user.name,
        "username": username
    }

    result = users_collection.insert_one(user_data)

    # Add string version of _id to response
    return {
        # "_id": str(result.inserted_id),
        "name": user.name,
        "username": username
    }


@router.get("/users")
async def get_all_users():
    try:
        # Fetch users with only 'name' and 'username'
        users = list(users_collection.find({}, {"_id": 0, "name": 1, "username": 1}))

        # Return directly as list of objects
        return [
            {"name": u.get("name"), "username": u.get("username")}
            for u in users
            if u.get("name") and u.get("username")
        ]
    except Exception as e:
        return {"error": str(e)}

