from fastapi import APIRouter, HTTPException
import httpx
from pydantic import BaseModel
import os
import json
import re
import google.generativeai as genai
from typing import Optional

router = APIRouter(prefix="/api/youtube-learning", tags=["YouTube Learning"])

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class YouTubeLearningRequest(BaseModel):
    url: str

class YouTubeLearningResponse(BaseModel):
    html_content: str


# Constants from the original codebase
SPEC_FROM_VIDEO_PROMPT = """You are a pedagogist and product designer with deep expertise in crafting engaging learning experiences via interactive web apps.

Examine the contents of the attached video. Then, write a detailed and carefully considered spec for an interactive web app designed to complement the video and reinforce its key idea or ideas. The recipient of the spec does not have access to the video, so the spec must be thorough and self-contained (the spec must not mention that it is based on a video). Here is an example of a spec written in response to a video about functional harmony:

"In music, chords create expectations of movement toward certain other chords and resolution towards a tonal center. This is called functional harmony.

Build me an interactive web app to help a learner understand the concept of functional harmony.

SPECIFICATIONS:
1. The app must feature an interactive keyboard.
2. The app must showcase all 7 diatonic triads that can be created in a major key (i.e., tonic, supertonic, mediant, subdominant, dominant, submediant, leading chord).
3. The app must somehow describe the function of each of the diatonic triads, and state which other chords each triad tends to lead to.
4. The app must provide a way for users to play different chords in sequence and see the results.
[etc.]"

The goal of the app that is to be built based on the spec is to enhance understanding through simple and playful design. The provided spec should not be overly complex, i.e., a junior web developer should be able to implement it in a single html file (with all styles and scripts inline). Most importantly, the spec must clearly outline the core mechanics of the app, and those mechanics must be highly effective in reinforcing the given video's key idea(s).

Provide the result as a JSON object containing a single field called "spec", whose value is the spec for the web app."""

CODE_REGION_OPENER = '```'
CODE_REGION_CLOSER = '```'

SPEC_ADDENDUM = f'\n\nThe app must be fully responsive and function properly on both desktop and mobile. Provide the code as a single, self-contained HTML document. All styles and scripts must be inline. In the result, encase the code between "{CODE_REGION_OPENER}" and "{CODE_REGION_CLOSER}" for easy parsing.'

def get_youtube_video_id(url: str) -> Optional[str]:
    """Extract YouTube video ID from URL"""
    try:
        # Handle standard watch URLs (youtube.com/watch?v=...)
        if 'youtube.com/watch' in url:
            match = re.search(r'v=([^&]+)', url)
            if match and len(match.group(1)) == 11:
                return match.group(1)
        
        # Handle short URLs (youtu.be/...)
        if 'youtu.be/' in url:
            match = re.search(r'youtu\.be/([^?]+)', url)
            if match and len(match.group(1)) == 11:
                return match.group(1)
        
        # Handle embed URLs (youtube.com/embed/...)
        if 'youtube.com/embed/' in url:
            match = re.search(r'embed/([^?]+)', url)
            if match and len(match.group(1)) == 11:
                return match.group(1)
        
        # Fallback regex
        reg_exp = r'^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*)'
        match = re.search(reg_exp, url)
        if match and len(match.group(2)) == 11:
            return match.group(2)
            
    except Exception as e:
        print(f"Error extracting video ID: {e}")
    
    return None

def validate_youtube_url(url: str) -> dict:
    """Validate YouTube URL"""
    video_id = get_youtube_video_id(url)
    if video_id:
        return {"isValid": True}
    return {"isValid": False, "error": "Invalid YouTube URL"}

def parse_json_response(response_text: str) -> dict:
    """Parse JSON from response text"""
    try:
        start = response_text.find('{')
        end = response_text.rfind('}') + 1
        if start != -1 and end > start:
            json_str = response_text[start:end]
            return json.loads(json_str)
    except Exception as e:
        print(f"Error parsing JSON: {e}")
    return {}

def parse_html_content(response_text: str, opener: str, closer: str) -> str:
    """Extract HTML content from response"""
    try:
        start = response_text.find('<!DOCTYPE html>')
        end = response_text.rfind(closer)
        if start != -1 and end > start:
            return response_text[start:end]
    except Exception as e:
        print(f"Error parsing HTML: {e}")
    return ""

import requests
import json

async def generate_spec_from_video(video_url: str) -> str:
    """Generate learning app specification from video"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
        
        headers = {
            'accept': '*/*',
            'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
            'content-type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY
        }
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": SPEC_FROM_VIDEO_PROMPT
                        },
                        {
                            "fileData": {
                                "fileUri": video_url,
                                "mimeType": "video/mp4"
                            }
                        }
                    ],
                    "role": "user"
                }
            ],
            "generationConfig": {
                "temperature": 0.75
            }
        }
        
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        
        result = response.json()
        
        
        # Extract the generated text from the response
        generated_text = result['candidates'][0]['content']['parts'][0]['text']
        
        # Parse the JSON response
        # print(generated_text,"=======================================================")
        parsed_response = parse_json_response(generated_text)
        spec = "I have strict budget constraints, so please do not include unnecessary code, libraries, very strictly dont use any image in base64, or features that aren’t essential. what you use inplace of image is use Unicode emoji characters when needed. I still want a clean, visually appealing UI with good functionality — but keep it minimal and optimized. Write only the required code"
        spec += parsed_response.get('spec', '')
        
        if not spec:
            # Fallback: try to extract spec from response text directly
            spec = generated_text
        
        # Add the addendum
        spec += SPEC_ADDENDUM
        
        print(spec,"======================initial specs generated by gemini=================================")
        return spec
        
    except Exception as e:
        print(f"Error generating spec: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate spec: {str(e)}")



# async def generate_code_from_spec(spec: str) -> str:
#     """Generate HTML code from specification"""
#     if not GEMINI_API_KEY:
#         raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
#     try:
#         # Prepare the request data matching the curl structure
#         headers = {
#             'accept': '*/*',
#             'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
#             'content-type': 'application/json',
#             'x-goog-api-client': 'google-genai-sdk/1.13.0 gl-node/web',
#             'x-goog-api-key': GEMINI_API_KEY
#         }
        
#         payload = {
#             "contents": [
#                 {
#                     "parts": [
#                         {
#                             "text": spec
#                         }
#                     ],
#                     "role": "user"
#                 }
#             ],
#             "generationConfig": {
#                 "temperature": 0.75
#             }
#         }

#         print(payload,"=======================================================")
        
#         url="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
#         # Make the HTTP request
#         response = requests.post(url, headers=headers, json=payload)
#         response.raise_for_status()
        
#         response_data = response.json()
        
#         print(response_data,"================================response data=======================")

#         # Extract the generated text from response
#         generated_text = response_data['candidates'][0]['content']['parts'][0]['text']
        
#         print(generated_text,"===============================generated text========================")
#         # Extract HTML content
#         code = parse_html_content(generated_text, CODE_REGION_OPENER, CODE_REGION_CLOSER)
        
#         print(code,"===============================code========================")
#         if not code:
#             # Fallback: look for DOCTYPE html in the response

#             print("im inside the if")
#             if '<!DOCTYPE html>' in generated_text:
#                 start = generated_text.find('<!DOCTYPE html>')
#                 code = generated_text[start:]
#                 # Clean up any trailing text after </html>
#                 html_end = code.rfind('</html>')
#                 if html_end != -1:
#                     code = code[:html_end + 7]  # Include </html>
        
#         return code
        
#     except Exception as e:
#         print(f"Error generating code: {e}")
#         raise HTTPException(status_code=500, detail=f"Failed to generate code: {str(e)}")

        
@router.post("/generate", response_model=YouTubeLearningResponse)
async def generate_youtube_learning_app(request: YouTubeLearningRequest):
    """
    Generate an interactive learning app from a YouTube video URL.
    
    This endpoint:
    1. Validates the YouTube URL
    2. Uses Gemini AI to analyze the video content
    3. Generates a learning app specification
    4. Creates HTML code for an interactive learning app
    5. Returns the complete HTML content
    """
    try:
        # Validate YouTube URL
        validation_result = validate_youtube_url(request.url)
        if not validation_result["isValid"]:
            raise HTTPException(
                status_code=400, 
                detail=validation_result.get("error", "Invalid YouTube URL")
            )
        
        # Generate specification from video
        spec = await generate_spec_from_video(request.url)
        if not spec:
            raise HTTPException(status_code=500, detail="Failed to generate learning app specification")
        
        # Generate HTML code from specification  
        html_content = await generate_code_from_spec(spec)
        if not html_content:
            raise HTTPException(status_code=500, detail="Failed to generate HTML code")
        
        return YouTubeLearningResponse(html_content=html_content)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred")


import requests
import json

async def generate_code_from_spec(spec: str) -> str:
    """Generate HTML code from specification using Claude Sonnet 4"""
    
    print("SPEC BEING SENT TO CLAUDE SONNET 4========================================:", spec)
    try:
        # Claude API configuration
        CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY")
        if not CLAUDE_API_KEY:
            raise HTTPException(status_code=500, detail="Claude API key not configured")
        
        headers = {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01'
        }
        
        payload = {
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 8192,
            "temperature": 0.75,
            "messages": [
                {
                    "role": "user",
                    "content": spec
                }
            ]
        }

        # print("Payload being sent to Claude:", json.dumps(payload, indent=2))
        # print("=" * 80)
        
        url = "https://api.anthropic.com/v1/messages"
        
        # Make the HTTP request to Claude
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        
        response_data = response.json()
        
        print("Claude Response Data:", json.dumps(response_data, indent=2))
        print("=" * 80)

        # Extract the generated text from Claude's response
        generated_text = response_data['content'][0]['text']
        
        print("Generated text from Claude:",generated_text ,"=======================================================")
        
        # Extract HTML content
        code = parse_html_content(generated_text, CODE_REGION_OPENER, CODE_REGION_CLOSER)
        
        # print("Extracted code:")
        # print("=" * 80)
        # print(code)
        # print("=" * 80)
        
        if not code:
            # Fallback: look for DOCTYPE html in the response
            print("No code found between markers, looking for DOCTYPE html...")
            if '<!DOCTYPE html>' in generated_text:
                start = generated_text.find('<!DOCTYPE html>')
                code = generated_text[start:]
                # Clean up any trailing text after </html>
                html_end = code.rfind('</html>')
                if html_end != -1:
                    code = code[:html_end + 7]  # Include </html>
                # print("Extracted code using fallback method:")
                # print("=" * 80)
                # print(code)
                # print("=" * 80)
        
        return code
        
    except Exception as e:
        print(f"Error generating code with Claude: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate code with Claude: {str(e)}")