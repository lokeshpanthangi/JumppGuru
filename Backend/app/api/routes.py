from fastapi import APIRouter
from app.models.schema import QueryRequest, QueryResponse
from app.services.orchestrator import handle_user_query

router = APIRouter()

@router.post("/query", response_model=QueryResponse)
async def query_user_input(payload: QueryRequest):
    return await handle_user_query(payload)
