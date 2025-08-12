from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, HttpUrl
import google.generativeai as genai
import json
import os
import tempfile
import yt_dlp
from typing import Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
import re

router = APIRouter(
    prefix="/api/youtube-learning",
    tags=["YouTube Learning"]
)

# Configure Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required")

genai.configure(api_key=GEMINI_API_KEY)

class YouTubeRequest(BaseModel):
    url: HttpUrl
    
class LearningAppResponse(BaseModel):
    html_content: str
    video_title: str
    success: bool
    message: str

# Thread pool for CPU-bound tasks
executor = ThreadPoolExecutor(max_workers=2)

def download_video_info(url: str):
    """Download video information and audio for processing"""
    ydl_opts = {
        'format': 'bestaudio/best',
        'extractaudio': True,
        'audioformat': 'mp3',
        'outtmpl': '%(title)s.%(ext)s',
        'quiet': True,
        'no_warnings': True,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            # Extract video info
            info = ydl.extract_info(url, download=False)
            title = info.get('title', 'Unknown Video')
            
            # Create temporary file for audio
            temp_dir = tempfile.mkdtemp()
            audio_path = os.path.join(temp_dir, f"{title[:50]}.mp3")
            
            # Download audio
            ydl_opts['outtmpl'] = audio_path
            with yt_dlp.YoutubeDL(ydl_opts) as ydl_download:
                ydl_download.download([url])
            
            return {
                'title': title,
                'audio_path': audio_path,
                'duration': info.get('duration', 0)
            }
        except Exception as e:
            raise Exception(f"Failed to download video: {str(e)}")

def generate_spec_from_video(video_path: str, video_title: str) -> str:
    """Generate app specification using Gemini 2.5 Flash"""
    
    prompt = """You are a pedagogist and product designer with deep expertise in crafting engaging learning experiences via interactive web apps.

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

    try:
        # Initialize Gemini 2.5 Flash model with safety settings
        safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH", 
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_NONE"
            }
        ]
        
        generation_config = {
            "temperature": 0.7,
            "top_p": 0.8,
            "top_k": 40,
            "max_output_tokens": 100000,
        }
        
        model = genai.GenerativeModel(
            'gemini-2.5-flash',
            safety_settings=safety_settings,
            generation_config=generation_config
        )
        
        # Upload the video file
        video_file = genai.upload_file(video_path)
        
        # Generate response
        response = model.generate_content([prompt, video_file])
        
        # Check if response was blocked
        if response.candidates and response.candidates[0].finish_reason != 1:  # 1 = STOP (successful)
            finish_reason = response.candidates[0].finish_reason if response.candidates else "Unknown"
            genai.delete_file(video_file.name)
            raise Exception(f"Response was blocked. Finish reason: {finish_reason}")
        
        # Check if response has valid parts
        if not response.parts:
            genai.delete_file(video_file.name)
            raise Exception("No response parts generated")
            
        # Clean up uploaded file
        genai.delete_file(video_file.name)
        
        # Get response text safely
        try:
            response_text = response.text.strip()
        except:
            # Fallback to extracting text from parts
            response_text = ""
            for part in response.parts:
                if hasattr(part, 'text'):
                    response_text += part.text
            
            if not response_text:
                raise Exception("Unable to extract text from response")
        
        # Extract JSON from response if wrapped in code blocks
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response_text, re.DOTALL)
        if json_match:
            response_text = json_match.group(1)
        
        # Try to parse as JSON
        try:
            spec_data = json.loads(response_text)
            return spec_data.get('spec', response_text)
        except json.JSONDecodeError:
            # If not valid JSON, return the text as is
            return response_text
        
    except Exception as e:
        raise Exception(f"Failed to generate spec: {str(e)}")

def generate_app_code(spec: str) -> str:
    """Generate HTML app code using Gemini 2.5 Pro"""
    
    full_prompt = f"""{spec}

The app must be fully responsive and function properly on both desktop and mobile. Provide the code as a single, self-contained HTML document. All styles and scripts must be inline. In the result, encase the code between "```" and "```" for easy parsing."""

    try:
        # Initialize Gemini 2.5 Pro model with safety settings
        safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH", 
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_NONE"
            }
        ]
        
        generation_config = {
            "temperature": 0.3,
            "top_p": 0.8,
            "top_k": 40,
            "max_output_tokens": 81920,
        }
        
        model = genai.GenerativeModel(
            'gemini-2.5-pro',
            safety_settings=safety_settings,
            generation_config=generation_config
        )
        
        # Generate response
        response = model.generate_content(full_prompt)
        
        # Check if response was blocked
        if response.candidates and response.candidates[0].finish_reason != 1:  # 1 = STOP (successful)
            finish_reason = response.candidates[0].finish_reason if response.candidates else "Unknown"
            raise Exception(f"Response was blocked. Finish reason: {finish_reason}")
        
        # Check if response has valid parts
        if not response.parts:
            raise Exception("No response parts generated")
        
        # Get response text safely
        try:
            response_text = response.text.strip()
        except:
            # Fallback to extracting text from parts
            response_text = ""
            for part in response.parts:
                if hasattr(part, 'text'):
                    response_text += part.text
            
            if not response_text:
                raise Exception("Unable to extract text from response")
        
        # Extract HTML code from response
        html_match = re.search(r'```(?:html)?\s*(.*?)\s*```', response_text, re.DOTALL)
        if html_match:
            return html_match.group(1).strip()
        
        # If no code blocks found, return the whole response
        return response_text
        
    except Exception as e:
        raise Exception(f"Failed to generate app code: {str(e)}")

async def process_youtube_video(url: str) -> LearningAppResponse:
    """Main processing function"""
    temp_files = []
    
    try:
        # Step 1: Download video info and audio
        loop = asyncio.get_event_loop()
        video_info = await loop.run_in_executor(executor, download_video_info, url)
        temp_files.append(video_info['audio_path'])
        
        # Step 2: Generate spec using Gemini 2.5 Flash
        spec = await loop.run_in_executor(
            executor, 
            generate_spec_from_video, 
            video_info['audio_path'], 
            video_info['title']
        )
        
        # Step 3: Generate HTML app using Gemini 2.5 Pro
        html_content = await loop.run_in_executor(executor, generate_app_code, spec)
        
        return LearningAppResponse(
            html_content=html_content,
            video_title=video_info['title'],
            success=True,
            message="Learning app generated successfully"
        )
        
    except Exception as e:
        return LearningAppResponse(
            html_content="",
            video_title="",
            success=False,
            message=f"Error processing video: {str(e)}"
        )
    finally:
        # Cleanup temporary files
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
                    # Also remove the directory if empty
                    temp_dir = os.path.dirname(temp_file)
                    if os.path.exists(temp_dir) and not os.listdir(temp_dir):
                        os.rmdir(temp_dir)
            except:
                pass

@router.post("/generate", response_model=LearningAppResponse)
async def generate_learning_app(request: YouTubeRequest):
    """
    Generate an interactive learning app from a YouTube video URL
    
    - **url**: YouTube video URL to process
    - Returns: HTML content for the interactive learning app
    """
    
    try:
        url_str = str(request.url)
        
        # Validate YouTube URL
        if not any(domain in url_str.lower() for domain in ['youtube.com', 'youtu.be']):
            raise HTTPException(status_code=400, detail="Please provide a valid YouTube URL")
        
        # Process the video
        result = await process_youtube_video(url_str)
        
        if not result.success:
            raise HTTPException(status_code=500, detail=result.message)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "YouTube Learning App Generator",
        "models": {
            "spec_generator": "gemini-2.5-flash",
            "code_generator": "gemini-2.5-pro"
        }
    }

# Additional endpoint to get just the HTML content as plain text
@router.post("/generate/html")
async def generate_learning_app_html(request: YouTubeRequest):
    """
    Generate an interactive learning app from YouTube video and return HTML as plain text
    """
    result = await generate_learning_app(request)
    
    return {
        "html": result.html_content,
        "title": result.video_title,
        "success": result.success
    }   