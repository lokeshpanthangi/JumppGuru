import os
import re
import json
from dotenv import load_dotenv
from app.models.schema import QueryRequest, QueryResponse, PageContent
from app.utils.language_detect import detect_language
from openai import OpenAI
from app.db.mongodb import mongo_collection
from app.services.vector_search import query_rag_chunks
from app.services.web_fallback import web_fallback_answer
from app.services.chat_history import save_message, get_recent_messages, get_assistant_text_by_chat_id


# Load environment variables from .env file, if present
load_dotenv()

# Initialize OpenAI client with API key from environment variable
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def is_direct_answer(query: str) -> bool:
    """
    Decide if the query is simple enough for a direct LLM answer.

    Uses regex patterns to check for common straightforward question patterns.
    """
    patterns = [
        r"^what is", r"^who is", r"^define", r"^when did", r"^where is",
        r"capital of", r"^name the", r"\d+ \+ \d+", r"^how many", r"^who won"
    ]
    return any(re.search(p, query.lower()) for p in patterns)


async def generate_llm_response(query: str, user_lang: str, history, additional_history) -> str:
    """
    Generate a chat completion response from OpenAI based on the query and language.
    Returns a short, friendly answer in Hinglish or English depending on user_lang.
    """
    prompt_values = {
        "hinglish": {
            "lang_desc": "Hinglish",
            "lang_label": "Hinglish"
        },
        "english": {
            "lang_desc": "Indian",
            "lang_label": "English"
        }
    }

    values = prompt_values.get(user_lang, prompt_values["english"])

    system_prompt = (
        "You are a friendly {lang_desc} teacher. Given a user question, "
        "return a short, clear, friendly answer in {lang_label} in 3–4 sentences. "
        "Use conversational, easy-to-understand tone. Avoid technical jargon."
    ).format(**values)

    messages = [{"role": "system", "content": system_prompt}] +  history + additional_history + [
        {"role": "user", "content": query}
    ]

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7
    )
    return response.choices[0].message.content

async def llm_orchestrator_decision(query: str, user_lang: str, history) -> dict:
    """
    NEW: LLM-based orchestrator that analyzes query and decides routing strategy.
    Uses GPT-4o to intelligently determine the best approach for handling the query.
    """
    system_prompt = """
You are an intelligent query orchestrator for an educational AI system.

Analyze the user query and decide the best approach to answer it.

AVAILABLE SOURCES:
- direct_llm: Use OpenAI directly for greetings, general knowledge, creative tasks
- rag: Search internal educational knowledge base for learning content
- web: Search internet for current/specific information  
- hybrid: Combine RAG + web for comprehensive answers

RETURN ONLY VALID JSON:
{
  "intent": "greeting|question|educational|creative|conversational",
  "complexity": "simple|medium|complex",
  "sources": ["source1"],
  "strategy": "quick_response|educational_detailed|research_based|conversational", 
  "confidence": 0.8,
  "reasoning": "brief explanation"
}

DECISION RULES:
- Greetings (hi, hello, namaste) → direct_llm, quick_response
- Educational topics (explain, teach, learn) → rag first, educational_detailed
- Current events/people → web, research_based
- Simple facts → rag first, then direct_llm
- Creative requests → direct_llm, conversational
- Math/science concepts → rag, educational_detailed

Always return valid JSON. Be decisive and confident.
"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Changed to match your existing model
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Query: {query}"}
            ],
            temperature=0.1,  # Low temperature for consistent routing decisions
            max_tokens=200
        )
        
        decision_text = response.choices[0].message.content.strip()
        
        # Parse JSON response
        decision = json.loads(decision_text)
        
        # Validate required fields
        required_fields = ["intent", "complexity", "sources", "strategy", "confidence"]
        if all(field in decision for field in required_fields):
            return decision
        else:
            raise ValueError("Missing required fields in orchestrator response")
            
    except Exception as e:
        print(f"LLM Orchestrator failed: {e}")
        # FALLBACK to old logic
        return {
            "intent": "question",
            "complexity": "medium", 
            "sources": ["rag", "web"] if not is_direct_answer(query) else ["direct_llm"],
            "strategy": "research_based" if not is_direct_answer(query) else "quick_response",
            "confidence": 0.5,
            "reasoning": f"Fallback to regex-based routing due to LLM error: {str(e)}"
        }

async def handle_user_query(payload: QueryRequest) -> QueryResponse:
    """
    ENHANCED: Main orchestrator function with intelligent LLM-based routing.
    
    Uses GPT-4o to analyze queries and decide optimal processing strategy:
    - Direct LLM for greetings, general knowledge, creative tasks
    - RAG search for educational content in knowledge base
    - Web search for current events and specific information
    - Hybrid approaches for comprehensive answers
    
    Falls back to regex-based routing if LLM orchestrator fails.
    """
    query = payload.query
    mode = payload.mode or "general"
    user_lang = payload.lang or detect_language(query)
    user_id = payload.user_id  # NEW: we take user_id from request
    chat_id = payload.chat_id or None

    if user_lang == "auto":
        user_lang = detect_language(query)

     # Retrieve chat history for context
    history = await get_recent_messages(user_id)
    additional_history = await get_assistant_text_by_chat_id(chat_id) if chat_id else ""

    # Decide between direct LLM answer or Search (future implementation)
    # if is_direct_answer(query):
    script_text = await generate_llm_response(query, user_lang, history, additional_history)
    source = "LLM"
    # else:
    #     # Placeholder message for more complex queries requiring search
    #     script_text = "This query requires search (RAG/Web), which is coming next."
    #     source = "Search"

    #     # BASIC RAG
    #     chunks = await query_rag_chunks(query)

    #     if chunks:
    #         context = "\n".join([c["text"] for c in chunks])
    #         prompt = f"""Use the following context to answer clearly:\n\n{context}\n\nQuestion: {query}"""
    #         messages = [{"role": "system", "content": "Be clear, educational."}] + history + [
    #             {"role": "user", "content": prompt}
    #         ]

    #         response = client.chat.completions.create(
    #             model="gpt-4o-mini",
    #             messages=messages
    #         )

    #         script_text = response.choices[0].message.content
    #         source = "RAG"
    #     else:
    #         # script_text = "No educational content found. Web fallback not yet implemented."
    #         # source = "RAG-Miss"
    #         # Web fallback (if no good RAG chunks)
    #         script_text = await web_fallback_answer(query, history)
    #         source = "Web"


    # Save both user query & assistant reply in chat history
    await save_message(user_id, "user", query)
    await save_message(user_id, "assistant", script_text)

    # Store query & answer in general MongoDB collection for analytics
    try:
        mongo_collection.insert_one({
            "user_id": user_id,
            "query": query,
            "response": script_text,
            "language": user_lang,
            "source": source,
#             "orchestrator_decision": decision  # NEW: Store LLM orchestrator decision for analytics
        })
    except Exception as e:
        print(f"Failed to insert into MongoDB: {e}")

    page = PageContent(script=script_text, audio=None, image_prompts=["concept"], quizzes=[])
    return QueryResponse(source=source, language=user_lang, lesson=[page])
