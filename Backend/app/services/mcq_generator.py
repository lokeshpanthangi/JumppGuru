import os
import json
from openai import OpenAI
from app.services.chat_history import get_recent_messages
from app.db.mongodb import mongo_db
from dotenv import load_dotenv
from typing import List

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# collection to store generated quizzes
quiz_collection = mongo_db["user_quizzes"]

async def summarize_messages_for_mcq(history: List[dict]) -> str:
    """
    Compress the recent messages into 4-6 bullet learning points.
    This reduces tokens and focuses the MCQ generation prompt.
    """
    if not history:
        return ""

    # Build a short conversation string
    convo_text = "\n".join([f"{m['role']}: {m['content']}" for m in history])
    prompt = (
        "You are an assistant that extracts short learning points from a conversation.\n"
        "Given the conversation below, write 4-6 concise bullet points summarizing the key learnings\n"
        "or facts the user learned or asked about. Keep each point short (1-2 sentences).\n\n"
        f"Conversation:\n{convo_text}\n\nBullets:"
    )

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": "You summarize conversation into learning bullets."},
                  {"role": "user", "content": prompt}],
        temperature=0.1
    )
    return resp.choices[0].message.content

async def generate_mcqs_from_summary(summary: str, num_questions: int = 8, difficulty: str = "medium"):
    """
    Generate structured MCQs from the summary. Request the LLM to return valid JSON array.
    """
    # Defensive: ensure num_questions reasonable
    if num_questions < 1:
        num_questions = 1
    if num_questions > 20:
        num_questions = 20

    generation_prompt = (
        f"You are a helpful exam-question generator. Based on the following learning points:\n\n"
        f"{summary}\n\n"
        f"Create {num_questions} multiple-choice questions. For each question, provide 4 options and mark the correct answer.\n"
        f"Difficulty: {difficulty}\n\n"
        "Return output as JSON array of objects with fields: question, options (array of 4 strings), answer (one of options), explanation (optional).\n"
        "Make sure the JSON is strictly parseable (no extra text). Example:\n"
        '[{\"question\":\"Q1\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"answer\":\"B\",\"explanation\":\"...\"}, ...]'
    )

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": "You generate MCQs in strict JSON."},
                  {"role": "user", "content": generation_prompt}],
        temperature=0.2
    )

    raw = resp.choices[0].message.content.strip()

    # Try to extract JSON from the response robustly
    json_text = raw
    # If the model added triple backticks or other padding, strip them:
    if json_text.startswith("```"):
        json_text = json_text.strip("```").strip()
    # Try to find the first '[' and last ']' to parse
    start = json_text.find("[")
    end = json_text.rfind("]") + 1
    if start != -1 and end != -1:
        json_text = json_text[start:end]

    try:
        items = json.loads(json_text)
    except Exception as e:
        # Fallback: If parsing failed, attempt an alternative simple parsing or regenerate once
        # Try one regeneration with stricter instruction:
        resp2 = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": "Return only JSON array. No commentary."},
                      {"role": "user", "content": generation_prompt}],
            temperature=0.0
        )
        raw2 = resp2.choices[0].message.content
        try:
            start = raw2.find("["); end = raw2.rfind("]") + 1
            json_text2 = raw2[start:end]
            items = json.loads(json_text2)
        except Exception as e2:
            # Give up and return empty
            items = []

    # Normalize: ensure each item has question/options/answer
    normalized = []
    for it in items:
        q = it.get("question") if isinstance(it, dict) else None
        opts = it.get("options") if isinstance(it, dict) else None
        ans = it.get("answer") if isinstance(it, dict) else None
        expl = it.get("explanation") if isinstance(it, dict) else None
        if q and isinstance(opts, list) and ans:
            normalized.append({
                "question": q,
                "options": opts,
                "answer": ans,
                "explanation": expl or ""
            })
    return normalized

async def generate_mcqs_for_user(user_id: str, num_questions: int = 8, difficulty: str = "medium"):
    # 1. Fetch recent 5 messages
    history = await get_recent_messages(user_id, limit=5)

    # 2. Summarize conversation to compact learning points
    summary = await summarize_messages_for_mcq(history)

    # 3. Generate MCQs from the summary
    mcqs = await generate_mcqs_from_summary(summary, num_questions, difficulty)

    # 4. Store generated MCQs in DB (for caching)
    if mcqs:
        quiz_collection.update_one(
            {"user_id": user_id},
            {"$set": {"last_generated": mcqs, "difficulty": difficulty, "num_questions": num_questions}},
            upsert=True
        )

    return mcqs
