from fastapi import FastAPI
from app.api.routes import router as api_router
from app.api.deep_learning import router as deep_learning_router
from app.api.genai_router import router as genai_router
from app.api.youtube_router import router as youtube_router
from app.api import users
from app.api import tts_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="JumppGuru",
    description="AI + Short Learning Backend for Jumppapp",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev only, use specific domain in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Include both routers separately
app.include_router(api_router)
app.include_router(deep_learning_router)
app.include_router(genai_router)
app.include_router(youtube_router)
app.include_router(tts_router.router)
app.include_router(users.router)

@app.get("/ping")
async def ping():
    return {"message": "pong"}

