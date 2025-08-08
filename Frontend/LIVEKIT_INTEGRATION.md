# LiveKit Integration Guide

This application has been updated to use LiveKit instead of Google AI Gemini Live for voice AI capabilities.

## Features

- **Real-time Voice Communication**: Connect to LiveKit rooms for voice-based AI interactions
- **Audio Streaming**: Publish and subscribe to audio tracks in real-time
- **Voice AI Assistant**: Integrated voice AI capabilities using LiveKit's infrastructure
- **Modern UI**: Updated interface with LiveKit connection status indicators

## Environment Variables

Make sure your `.env` file contains the following LiveKit credentials:

```env
# LiveKit Configuration
VITE_LIVEKIT_API_KEY=your_livekit_api_key
VITE_LIVEKIT_API_SECRET=your_livekit_api_secret
VITE_LIVEKIT_URL=wss://your-livekit-server.livekit.cloud

# Optional: Additional service API keys for enhanced features
VITE_DEEPGRAM_API_KEY=your_deepgram_api_key  # For Speech-to-Text
VITE_CARTESIA_API_KEY=your_cartesia_api_key   # For Text-to-Speech
```

## Current Configuration

The application is currently configured with:
- **API Key**: `APICK9gotCPN6Ez`
- **API Secret**: `8scd278iWXwtXy3hpieRXByFpqh1o4HfiDsVJAMkkCfB`
- **Server URL**: `wss://slack-ai-e59s5qtm.livekit.cloud`

## How to Use

1. **Start the Application**: Run `npm run dev` to start the development server
2. **Access Live Mode**: Click the waves icon (🌊) in the chat input to start live voice mode
3. **Voice Interaction**: Speak into your microphone to interact with the AI assistant
4. **Exit Live Mode**: Click the X button to stop the live voice session

## Technical Implementation

### Key Components

1. **useLiveKit Hook** (`src/hooks/useLiveKit.ts`)
   - Manages LiveKit room connection and state
   - Handles audio streaming and real-time communication
   - Provides callbacks for message handling
   - Uses direct connection with simplified token generation

2. **JWT Token Generation**
   - Proper JWT token creation using HMAC-SHA256 signing
   - Client-side token generation for development purposes
   - **SECURITY NOTE**: API secret is exposed in frontend for demo purposes
   - **PRODUCTION**: Move token generation to secure backend server

3. **ChatInput Integration** (`src/components/ChatInput.tsx`)
   - Updated to use `useLiveKit` instead of `useGeminiLive`
   - Maintains same UI/UX for voice interaction

### Dependencies

The following LiveKit packages are installed:
- `livekit-client`: Client SDK for connecting to LiveKit rooms
- `@livekit/components-react`: React components for LiveKit integration

## Migration from Gemini Live

The following changes were made:

1. **Replaced Files**:
   - `useGeminiLive.ts` → `useLiveKit.ts` (with direct connection)

2. **Updated Files**:
   - `ChatInput.tsx`: Updated to use `useLiveKit`
   - `.env`: Added LiveKit credentials

3. **Removed Dependencies**:
   - Gemini Live related packages
   - `VITE_GEMINI_API_KEY` environment variable
   - Complex server-side token generation

4. **Maintained the same UI/UX** for seamless user experience

## Troubleshooting

### Common Issues

1. **"Invalid authorization token" Error**: 
   - Verify `VITE_LIVEKIT_API_SECRET` is set in `.env` file
   - Ensure API key and secret match your LiveKit project
   - Check that JWT token generation is working properly

2. **Connection Failed**: Check that your LiveKit credentials are correct in the `.env` file
3. **Microphone Access Denied**: Ensure your browser allows microphone access
4. **Token Generation Errors**: Verify that all required environment variables are set

### Development Notes

- JWT token generation implemented with proper HMAC-SHA256 signing
- Client-side token creation for development ease (API secret exposed)
- The application uses room name `'voice-assistant-room'` by default
- Participant names are generated dynamically using timestamps
- Audio tracks are automatically published when starting live mode
- The connection status is displayed in the UI with color-coded indicators
- Fixed authentication issues with proper JWT format

## Next Steps

For production deployment:

1. **Security**: Implement proper JWT token generation on backend server
2. **Authentication**: Replace direct connection with secure token-based auth
3. **Add proper error handling**: Implement retry logic and better error messages
4. **Enhance voice features**: Integrate with Deepgram for STT and Cartesia for TTS
5. **Add room management**: Implement dynamic room creation and management
6. **Security improvements**: Add proper authentication and authorization

## Support

For LiveKit documentation and support:
- [LiveKit Documentation](https://docs.livekit.io/)
- [LiveKit Voice AI Guide](https://docs.livekit.io/agents/start/voice-ai/)
- [LiveKit React Components](https://docs.livekit.io/reference/components/react/)