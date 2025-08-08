from fastapi import FastAPI
from app.api.routes import router as api_router
from app.api.deep_learning import router as deep_learning_router

app = FastAPI(
    title="JumppGuru",
    description="AI + Short Learning Backend for Jumppapp",
    version="1.0"
)

# ✅ Include both routers separately
app.include_router(api_router)
app.include_router(deep_learning_router)

@app.get("/ping")
async def ping():
    return {"message": "pong"}
