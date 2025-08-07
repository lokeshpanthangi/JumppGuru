# app/db/mongodb.py
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", os.getenv("MONGO_URI"))

mongo_client = MongoClient(MONGO_URI, server_api=ServerApi('1'))
mongo_db = mongo_client["demo"]
mongo_collection = mongo_db["first"]
mongo_collection_chunk = mongo_db["rag_chunks"]
