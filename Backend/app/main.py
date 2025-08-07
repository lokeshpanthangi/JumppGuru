from fastapi import FastAPI
from app.api.routes import router as api_router

app = FastAPI(
    title="JumppGuru",
    description="AI + Short Learning Backend for Jumppapp",
    version="1.0"
)

app.include_router(api_router)

@app.get("/ping")
async def ping():
    return {"message": "pong"}
