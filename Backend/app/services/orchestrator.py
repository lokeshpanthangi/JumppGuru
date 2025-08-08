import os
import re
from dotenv import load_dotenv
from app.models.schema import QueryRequest, QueryResponse, PageContent
from app.utils.language_detect import detect_language
from openai import OpenAI
from app.db.mongodb import mongo_collection
from app.services.vector_search import query_rag_chunks
from app.services.web_fallback import web_fallback_answer
from app.services.chat_history import save_message, get_recent_messages



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


async def generate_llm_response(query: str, user_lang: str, history) -> str:
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

    messages = [{"role": "system", "content": system_prompt}] +      + [
        {"role": "user", "content": query}
    ]

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7
    )
    return response.choices[0].message.content

async def handle_user_query(payload: QueryRequest) -> QueryResponse:
    """
    Handle user query asynchronously.

    Decides direct answer via LLM or returns a placeholder for future RAG/Search functionality.
    """
    query = payload.query
    mode = payload.mode or "general"
    user_lang = payload.lang or detect_language(query)
    user_id = payload.user_id  # NEW: we take user_id from request

    if user_lang == "auto":
        user_lang = detect_language(query)

     # Retrieve chat history for context
    history = await get_recent_messages(user_id)

    # Decide between direct LLM answer or Search (future implementation)
    if is_direct_answer(query):
        script_text = await generate_llm_response(query, user_lang, history)
        source = "LLM"
    else:
        # Placeholder message for more complex queries requiring search
        script_text = "This query requires search (RAG/Web), which is coming next."
        source = "Search"

        # BASIC RAG
        chunks = await query_rag_chunks(query)

        if chunks:
            context = "\n".join([c["text"] for c in chunks])
            prompt = f"""Use the following context to answer clearly:\n\n{context}\n\nQuestion: {query}"""
            messages = [{"role": "system", "content": "Be clear, educational."}] + history + [
                {"role": "user", "content": prompt}
            ]

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages
            )

            script_text = response.choices[0].message.content
            source = "RAG"
        else:
            # script_text = "No educational content found. Web fallback not yet implemented."
            # source = "RAG-Miss"
            # Web fallback (if no good RAG chunks)
            script_text = await web_fallback_answer(query, history)
            source = "Web"


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
            "source": source
        })
    except Exception as e:
        print(f"Failed to insert into MongoDB: {e}")

    page = PageContent(script=script_text, audio=None, image_prompts=["concept"], quizzes=[])
    return QueryResponse(source=source, language=user_lang, lesson=[page])
