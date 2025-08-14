import asyncio
import base64
import os
from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import FileResponse
from sarvamai import AsyncSarvamAI, AudioOutput
import logging
from app.db.mongodb import multimodal_chat_collection
from concurrent.futures import ThreadPoolExecutor
import subprocess
from dotenv import load_dotenv

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tts", tags=["Text-to-Speech"])

async def tts_stream_internal(text: str, output_path: str):
    """
    Internal function to handle TTS streaming with improved error handling
    """
    client = None
    file_handle = None
    
    try:
        client = AsyncSarvamAI(api_subscription_key=os.getenv("SARVAM_API_KEY"))
        
        logger.info(f"Starting TTS conversion for text length: {len(text)} characters")
        logger.info(f"Text preview: {text[:100]}...")
        
        # Use async context manager for WebSocket connection
        async with client.text_to_speech_streaming.connect(model="bulbul:v2") as ws:
            logger.info("WebSocket connection established")
            
            # Configure the TTS settings
            await ws.configure(target_language_code="hi-IN", speaker="abhilash", pitch=0, pace=1, loudness=1, speech_sample_rate=22050)
            logger.info("TTS configuration set: hi-IN, anushka")
            
            # Send the text for conversion
            await ws.convert(text)
            logger.info("Text sent for conversion")
            
            await ws.flush()
            logger.info("Flush completed")
            
            # Open file for writing
            file_handle = open(output_path, "wb")
            logger.info(f"Output file opened: {output_path}")
            
            # Process the audio stream
            chunk_count = 0
            message_count = 0
            async for message in ws:
                message_count += 1
                logger.info(f"Received message {message_count}, type: {type(message).__name__}")
                
                if isinstance(message, AudioOutput):
                    try:
                        logger.info(f"AudioOutput message - audio data length: {len(message.data.audio) if hasattr(message.data, 'audio') else 'N/A'}")
                        
                        if hasattr(message.data, 'audio') and message.data.audio:
                            audio_chunk = base64.b64decode(message.data.audio)
                            file_handle.write(audio_chunk)
                            file_handle.flush()  # Ensure data is written immediately
                            chunk_count += 1
                            
                            logger.info(f"Processed audio chunk {chunk_count}, size: {len(audio_chunk)} bytes")
                        else:
                            logger.warning("AudioOutput message has no audio data")
                            
                    except Exception as chunk_error:
                        logger.error(f"Error processing audio chunk: {chunk_error}")
                        continue
                else:
                    # Log other message types for debugging
                    logger.info(f"Non-AudioOutput message: {message}")
            
            logger.info(f"TTS conversion completed. Total messages: {message_count}, Audio chunks: {chunk_count}")
            
            # Check if we got any audio data
            if chunk_count == 0:
                raise Exception(f"No audio chunks received. Total messages: {message_count}")
        
        # WebSocket is automatically closed here due to async context manager
        
    except Exception as e:
        logger.error(f"Error in TTS conversion: {e}")
        # Clean up partial file if error occurs
        if os.path.exists(output_path):
            try:
                os.remove(output_path)
                logger.info(f"Cleaned up partial file: {output_path}")
            except:
                pass
        raise HTTPException(status_code=500, detail=f"TTS conversion failed: {str(e)}")
    
    finally:
        # Clean up resources
        if file_handle:
            try:
                file_handle.close()
            except:
                pass

async def process_single_chunk(chunk_text: str, chunk_index: int, chat_id: str, semaphore: asyncio.Semaphore):
    """
    Process a single chunk of text to audio with chat_id naming
    """
    async with semaphore:  # Limit concurrent connections
        temp_file = f"{chat_id}_{chunk_index + 1}.mp3"
        client = None
        
        try:
            logger.info(f"Starting processing chunk {chunk_index + 1} -> {temp_file}")
            client = AsyncSarvamAI(api_subscription_key=os.getenv("SARVAM_API_KEY"))
            
            async with client.text_to_speech_streaming.connect(model="bulbul:v2") as ws:
                await ws.configure(target_language_code="hi-IN", speaker="abhilash", pitch=0, pace=1, loudness=1, speech_sample_rate=22050)
                await ws.convert(chunk_text)
                await ws.flush()
                
                with open(temp_file, "wb") as f:
                    chunk_count = 0
                    async for message in ws:
                        if isinstance(message, AudioOutput):
                            if hasattr(message.data, 'audio') and message.data.audio:
                                audio_chunk = base64.b64decode(message.data.audio)
                                f.write(audio_chunk)
                                f.flush()
                                chunk_count += 1

                logger.info(f"Processed chunk {chunk_count}")
                
                if chunk_count == 0:
                    logger.warning(f"No audio data received for chunk {chunk_index + 1}")
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                    return None
                
                logger.info(f"Completed processing chunk {chunk_index + 1} -> {temp_file} - {os.path.getsize(temp_file)} bytes")
                return temp_file
                
        except Exception as e:
            logger.error(f"Error processing chunk {chunk_index + 1}: {e}")
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except:
                    pass
            return None

async def tts_stream_long_text_batch(text: str, chat_id: str, max_chunk_size: int = 100, max_concurrent: int = 60):
    """
    Handle very long text by splitting it into chunks and processing them concurrently
    Returns list of generated file names
    """
    # Split text into smaller chunks
    words = text.split()
    chunks = []
    current_chunk = []
    current_length = 0
    
    for word in words:
        if current_length + len(word) + 1 > max_chunk_size and current_chunk:
            chunks.append(" ".join(current_chunk))
            current_chunk = [word]
            current_length = len(word)
        else:
            current_chunk.append(word)
            current_length += len(word) + 1
    
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    logger.info(f"Split long text into {len(chunks)} chunks for batch processing")
    
    # Create semaphore to limit concurrent connections
    semaphore = asyncio.Semaphore(max_concurrent)
    
    # Process all chunks concurrently
    start_time = asyncio.get_event_loop().time()
    
    tasks = [
        process_single_chunk(chunk, i, chat_id, semaphore) 
        for i, chunk in enumerate(chunks)
    ]
    
    logger.info(f"Starting batch processing of {len(tasks)} chunks with max {max_concurrent} concurrent connections")
    
    # Wait for all tasks to complete
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    end_time = asyncio.get_event_loop().time()
    logger.info(f"Batch processing completed in {end_time - start_time:.2f} seconds")
    
    # Filter successful results and get file names
    successful_files = []
    successful_chunks = 0
    
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            logger.error(f"Chunk {i + 1} failed with exception: {result}")
        elif result is not None:
            successful_files.append(result)
            successful_chunks += 1
        else:
            logger.warning(f"Chunk {i + 1} returned None")
    
    if not successful_files:
        raise Exception("All chunks failed to process")
    
    logger.info(f"Successfully processed {successful_chunks}/{len(chunks)} chunks")
    logger.info(f"Generated files: {successful_files}")
    
    return successful_files

@router.post("/stream")
async def tts_stream_endpoint(chat_id: str = Body(..., embed=True)):
    """
    Test TTS streaming endpoint with batch processing for long texts.
    Returns array of generated chunk file names.
    """
    # Fetch the assistant's message from MongoDB
    doc = multimodal_chat_collection.find_one({"chat_id": chat_id, "role": "assistant"})
    if not doc:
        raise HTTPException(status_code=404, detail=f"No assistant message found for chat_id {chat_id}")

    text_to_convert = doc.get("text_content", "").strip()
    
    try:
        # Automatically use batch processing for longer texts (>1000 characters)
        if len(text_to_convert) > 1000:
            logger.info(f"Text is long ({len(text_to_convert)} chars), using batch processing")
            generated_files = await tts_stream_long_text_batch(
                text_to_convert, 
                chat_id,
                max_chunk_size=800,
                max_concurrent=15  # Adjust this based on your API limits
            )
        else:
            logger.info(f"Text is short ({len(text_to_convert)} chars), using direct approach")
            output_file = f"{chat_id}_1.mp3"
            await tts_stream_internal(text_to_convert, output_file)
            
            # Verify the file was created and has content
            if not os.path.exists(output_file) or os.path.getsize(output_file) == 0:
                raise HTTPException(status_code=500, detail="Generated audio file is empty or missing")
            
            generated_files = [output_file]
        
        logger.info(f"Successfully generated {len(generated_files)} audio files")
        
        # Return the array of file names
        return {
            "success": True,
            "files": generated_files,
            "total_files": len(generated_files),
            "chat_id": chat_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/file/{filename}")
async def get_audio_file(filename: str):
    """
    Endpoint to serve individual audio files.
    Expects filename in format: {chat_id}_{chunk_number}.mp3
    """
    # Validate filename format (basic security check)
    if not filename.endswith('.mp3') or '_' not in filename:
        raise HTTPException(status_code=400, detail="Invalid filename format")
    
    # Check if file exists
    if not os.path.exists(filename):
        raise HTTPException(status_code=404, detail=f"File {filename} not found")
    
    # Check if file has content
    if os.path.getsize(filename) == 0:
        raise HTTPException(status_code=404, detail=f"File {filename} is empty")
    
    logger.info(f"Serving audio file: {filename} ({os.path.getsize(filename)} bytes)")
    
    return FileResponse(
        filename, 
        media_type="audio/mpeg", 
        filename=filename,
        headers={"Cache-Control": "no-cache"}
    )

@router.delete("/cleanup/{chat_id}")
async def cleanup_chat_files(chat_id: str):
    """
    Optional endpoint to clean up all files for a specific chat_id
    """
    deleted_files = []
    error_files = []
    
    # Find all files matching the chat_id pattern
    for file in os.listdir('.'):
        if file.startswith(f"{chat_id}_") and file.endswith('.mp3'):
            try:
                os.remove(file)
                deleted_files.append(file)
                logger.info(f"Deleted file: {file}")
            except Exception as e:
                error_files.append({"file": file, "error": str(e)})
                logger.error(f"Failed to delete file {file}: {e}")
    
    return {
        "success": True,
        "deleted_files": deleted_files,
        "error_files": error_files,
        "total_deleted": len(deleted_files),
        "chat_id": chat_id
    }


    