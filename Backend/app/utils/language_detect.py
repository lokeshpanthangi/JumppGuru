from langdetect import detect

def detect_language(text: str) -> str:
    try:
        lang = detect(text)
        if lang == "hi":
            # Still may be Hinglish – do keyword match
            hinglish_keywords = ["kya", "kaise", "hai", "nahi", "mera", "tum", "ke", "ki", "ho", "me", "kyunki", "ka", "kb"]
            words = text.lower().split()
            if sum(1 for w in words if w in hinglish_keywords) / len(words) > 0.2:
                return "hinglish"
        return "english" if lang == "en" else "hinglish"
    except:
        return "english"  # Fallback
