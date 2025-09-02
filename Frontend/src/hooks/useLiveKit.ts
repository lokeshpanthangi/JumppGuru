import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Room, 
  RoomEvent, 
  RemoteTrack, 
  RemoteTrackPublication, 
  RemoteParticipant,
  Track,
  AudioTrack,
  createLocalAudioTrack
} from 'livekit-client';

export interface LiveKitState {
  isStreaming: boolean;
  isConnected: boolean;
  status: string;
  error: string;
}

export interface LiveKitCallbacks {
  onMessage?: (message: string) => void;
  onAudioResponse?: (audioBuffer: AudioBuffer) => void;
  onStatusChange?: (status: string) => void;
  onError?: (error: string) => void;
}

export function useLiveKit(callbacks?: LiveKitCallbacks) {
  const [state, setState] = useState<LiveKitState>({
    isStreaming: false,
    isConnected: false,
    status: 'Disconnected',
    error: ''
  });

  const roomRef = useRef<Room | null>(null);
  const localAudioTrackRef = useRef<any>(null);
  const callbacksRef = useRef(callbacks);

  // Update callbacks ref when callbacks change
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const updateState = useCallback((updates: Partial<LiveKitState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const updateStatus = useCallback((status: string) => {
    updateState({ status });
    callbacksRef.current?.onStatusChange?.(status);
  }, [updateState]);

  const updateError = useCallback((error: string) => {
    updateState({ error });
    callbacksRef.current?.onError?.(error);
  }, [updateState]);

  const connectToRoom = useCallback(async () => {
    const apiKey = import.meta.env.VITE_LIVEKIT_API_KEY;
    const apiSecret = import.meta.env.VITE_LIVEKIT_API_SECRET;
    const wsUrl = import.meta.env.VITE_LIVEKIT_WS_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      throw new Error('LiveKit API key, secret, and WebSocket URL are required');
    }

    updateStatus('Connecting to LiveKit...');

    const room = new Room();
    roomRef.current = room;

    return new Promise<void>((resolve, reject) => {
      // Set up room event listeners
      room.on(RoomEvent.Connected, () => {
        updateState({ isConnected: true });
        updateStatus('✅ Connected to LiveKit');
        console.log('Connected to LiveKit room');
        resolve();
      });

      room.on(RoomEvent.Disconnected, () => {
        updateState({ isConnected: false, isStreaming: false });
        updateStatus('Disconnected from LiveKit');
        console.log('Disconnected from LiveKit room');
      });

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          const audioTrack = track as AudioTrack;
          const audioElement = audioTrack.attach();
          document.body.appendChild(audioElement);
          audioElement.play();
          
          updateStatus('🎧 Receiving response...');
          
          // Clean up when track ends
          track.on('ended', () => {
            audioElement.remove();
            updateStatus('🎤 Live - Speak anytime');
          });
        }
      });

      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
        const message = new TextDecoder().decode(payload);
        callbacksRef.current?.onMessage?.(message);
      });

      // Handle connection errors
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === 'disconnected') {
          reject(new Error(`Connection failed: ${state}`));
        }
      });

      // Create a proper LiveKit token
      createLiveKitToken(apiKey, apiSecret, `user_${Date.now()}`, 'voice-assistant-room')
        .then(token => {
          // Connect to room
          return room.connect(wsUrl, token);
        })
        .catch(reject);
    });
  }, [updateState, updateStatus]);

  const startStreaming = useCallback(async () => {
    if (state.isStreaming) {
      return;
    }

    try {
      updateStatus('Starting live connection...');
      
      // Connect to room if not already connected
      if (!state.isConnected) {
        await connectToRoom();
      }

      // Create local audio track for microphone input
      const audioTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
      
      localAudioTrackRef.current = audioTrack;

      // Publish the audio track
      if (roomRef.current) {
        await roomRef.current.localParticipant.publishTrack(audioTrack, {
          name: 'microphone'
        });
      }

      updateState({ isStreaming: true });
      updateStatus('🎤 Live - Speak anytime');
      
      // Send initial greeting request to the agent
      setTimeout(() => {
        if (roomRef.current) {
          const greetingMessage = 'Please greet the user and offer your assistance.';
          const encoder = new TextEncoder();
          roomRef.current.localParticipant.publishData(encoder.encode(greetingMessage));
        }
      }, 1000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateError(`Failed to start streaming: ${errorMessage}`);
      console.error('Streaming error:', error);
    }
  }, [state.isStreaming, state.isConnected, connectToRoom, updateState, updateStatus, updateError]);

  const stopStreaming = useCallback(() => {
    if (!state.isStreaming) {
      return;
    }

    updateStatus('Stopping live connection...');

    // Unpublish local audio track
    if (localAudioTrackRef.current && roomRef.current) {
      roomRef.current.localParticipant.unpublishTrack(localAudioTrackRef.current);
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current = null;
    }

    updateState({ isStreaming: false });
    updateStatus('Live connection stopped');
  }, [state.isStreaming, updateState, updateStatus]);

  const disconnect = useCallback(() => {
    stopStreaming();
    
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    
    updateState({ isConnected: false, isStreaming: false });
    updateStatus('Disconnected');
  }, [stopStreaming, updateState, updateStatus]);

  const toggleStreaming = useCallback(() => {
    if (state.isStreaming) {
      stopStreaming();
    } else {
      startStreaming();
    }
  }, [state.isStreaming, startStreaming, stopStreaming]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
      }
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  return {
    state,
    startStreaming,
    stopStreaming,
    toggleStreaming,
    disconnect,
    connectToRoom
  };
}

// Proper LiveKit JWT token creation
async function createLiveKitToken(apiKey: string, apiSecret: string, identity: string, roomName: string): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: apiKey,
    sub: identity,
    aud: 'livekit',
    iat: now,
    exp: now + 3600, // 1 hour
    nbf: now,
    jti: `${identity}_${now}`,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    }
  };

  // Create JWT token with proper base64url encoding
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const message = `${encodedHeader}.${encodedPayload}`;
  
  const signature = await createHMACSignature(message, apiSecret);
  const encodedSignature = base64UrlEncode(signature);
  
  return `${message}.${encodedSignature}`;
}

function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function createHMACSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return String.fromCharCode(...new Uint8Array(signature));
}
