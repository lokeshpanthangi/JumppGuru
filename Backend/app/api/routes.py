from fastapi import APIRouter, HTTPException
from app.models.schema import QueryRequest, QueryResponse, GenerateMCQRequest, GenerateMCQResponse, MCQItem
from app.services.orchestrator import handle_user_query
from app.services.mcq_generator import generate_mcqs_for_user


router = APIRouter()

@router.post("/query", response_model=QueryResponse)
async def query_user_input(payload: QueryRequest):
    return await handle_user_query(payload)

@router.post("/generate_mcqs", response_model=GenerateMCQResponse)
async def generate_mcqs_endpoint(payload: GenerateMCQRequest):
    user_id = payload.user_id
    num_q = payload.num_questions or 8
    difficulty = payload.difficulty or "medium"
    chat_id = payload.chat_id or None

    mcqs = await generate_mcqs_for_user(user_id, num_q, difficulty, chat_id)
    if not mcqs:
        raise HTTPException(status_code=500, detail="Failed to generate MCQs")

    return {"user_id": user_id, "mcqs": mcqs, "source": "generated"}