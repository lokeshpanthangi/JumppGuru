from dotenv import load_dotenv
import logging
import asyncio

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import (
    openai,
    noise_cancellation,
)

load_dotenv()

# Configure logging for better debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions="You are a helpful voice AI assistant. Speak in Hindi when possible, but can also respond in English if needed. Be friendly and helpful.")


async def entrypoint(ctx: agents.JobContext):
    try:
        logger.info("Starting LiveKit agent session...")
        
        session = AgentSession(
            llm=openai.realtime.RealtimeModel(
                voice="alloy",  # Changed from coral to alloy for better Hindi support
                modalities=["text", "audio"],
                instructions="You are a helpful AI assistant. Respond in Hindi when appropriate, but can use English if needed. Keep responses conversational and natural."
            )
        )

        await session.start(
            room=ctx.room,
            agent=Assistant(),
            room_input_options=RoomInputOptions(
                # LiveKit Cloud enhanced noise cancellation
                # - If self-hosting, omit this parameter
                # - For telephony applications, use `BVCTelephony` for best results
                noise_cancellation=noise_cancellation.BVC(),
            ),
        )

        logger.info("Agent session started successfully")
        
        # Generate initial greeting in Hindi
        await session.generate_reply(
            instructions="Greet the user in Hindi and offer your assistance. Say something like 'नमस्ते! मैं आपकी सहायता के लिए यहाँ हूँ। आप मुझसे कुछ भी पूछ सकते हैं।'"
        )
        
    except Exception as e:
        logger.error(f"Error in agent entrypoint: {e}")
        # Retry mechanism
        await asyncio.sleep(2)
        logger.info("Retrying agent initialization...")
        await entrypoint(ctx)


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))