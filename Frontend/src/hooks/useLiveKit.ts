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

  const retryCountRef = useRef(0);
  const maxRetries = 3;

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

    return new Promise<void>(async (resolve, reject) => {
      let connectionTimeout: NodeJS.Timeout;
      let isResolved = false;

      // Set connection timeout (15 seconds)
      connectionTimeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          updateError('Connection timeout - please try again');
          room.disconnect();
          reject(new Error('Connection timeout'));
        }
      }, 15000);

      // Set up room event listeners
      room.on(RoomEvent.Connected, () => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(connectionTimeout);
          retryCountRef.current = 0; // Reset retry count on successful connection
          updateState({ isConnected: true, error: '' });
          updateStatus('✅ Connected to LiveKit');
          console.log('Connected to LiveKit room');
          resolve();
        }
      });

      room.on(RoomEvent.Disconnected, (reason) => {
        clearTimeout(connectionTimeout);
        updateState({ isConnected: false, isStreaming: false });
        updateStatus('Disconnected from LiveKit');
        console.log('Disconnected from LiveKit room:', reason);
      });

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          const audioTrack = track as AudioTrack;
          const audioElement = audioTrack.attach();
          audioElement.style.display = 'none'; // Hide audio element
          document.body.appendChild(audioElement);
          
          // Add error handling for audio playback
          audioElement.play().catch(error => {
            console.warn('Audio playback failed:', error);
            updateError('Audio playback failed - please check permissions');
          });
          
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

      // Handle connection state changes
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log('Connection state changed:', state);
        if (state === 'failed' || state === 'closed') {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(connectionTimeout);
            reject(new Error(`Connection failed: ${state}`));
          }
        }
      });

      // Handle reconnection events
      room.on(RoomEvent.Reconnecting, () => {
        updateStatus('Reconnecting to LiveKit...');
      });

      room.on(RoomEvent.Reconnected, () => {
        updateStatus('✅ Reconnected to LiveKit');
      });

      // Create a proper LiveKit token
      try {
        const token = await createLiveKitToken(apiKey, apiSecret, `user_${Date.now()}`, 'voice-assistant-room');
        await room.connect(wsUrl, token);
      } catch (error) {
        clearTimeout(connectionTimeout);
        if (!isResolved) {
          isResolved = true;
          const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
          updateError(`Connection failed: ${errorMessage}`);
          
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            updateStatus(`Retrying connection (${retryCountRef.current}/${maxRetries})...`);
            setTimeout(() => {
              connectToRoom().then(resolve).catch(reject);
            }, 3000); // Increased retry delay to 3 seconds
          } else {
            reject(error);
          }
        }
      }
    });
  }, [updateState, updateStatus, updateError, maxRetries]);

  const startStreaming = useCallback(async () => {
    if (state.isStreaming) {
      return;
    }

    retryCountRef.current = 0; // Reset retry count

    try {
      updateStatus('Starting live connection...');
      
      // Connect to room if not already connected
      if (!state.isConnected) {
        await connectToRoom();
      }

      // Check microphone permissions first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      } catch (permissionError) {
        updateError('Microphone permission denied. Please allow microphone access and try again.');
        return;
      }

      // Create local audio track for microphone input with enhanced settings
      let audioTrack;
      try {
        updateStatus('Setting up microphone...');
        audioTrack = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        });
        localAudioTrackRef.current = audioTrack;

        if (!roomRef.current) {
          throw new Error('Room not connected');
        }

        updateStatus('Publishing audio track...');
        await roomRef.current.localParticipant.publishTrack(audioTrack, { 
          name: 'microphone',
          source: Track.Source.Microphone
        });
        
      } catch (trackError) {
        const errorMessage = trackError instanceof Error ? trackError.message : 'Unknown track error';
        console.error('Audio track error:', trackError);
        
        // Clean up failed track
        if (audioTrack) {
          audioTrack.stop();
        }
        
        if (trackError instanceof Error && trackError.message.includes('Permission')) {
          updateError('Microphone access denied. Please check your browser permissions.');
          return;
        }
        
        updateError(`Failed to setup audio: ${errorMessage}`);
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          updateStatus(`Retrying audio setup (${retryCountRef.current}/${maxRetries})...`);
          setTimeout(() => startStreaming(), 2000);
          return;
        } else {
          throw trackError;
        }
      }
      
      updateState({ isStreaming: true, error: '' });
      updateStatus('🎤 Live - Speak anytime');
      
      // Send initial greeting request to the agent with Hindi instruction
      setTimeout(() => {
        if (roomRef.current) {
          const greetingMessage = 'Please greet the user in Hindi and offer your assistance. Say नमस्ते and introduce yourself.';
          const encoder = new TextEncoder();
          roomRef.current.localParticipant.publishData(encoder.encode(greetingMessage));
        }
      }, 1500); // Increased delay to ensure connection is stable
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateError(`Failed to start streaming: ${errorMessage}`);
      console.error('Streaming error:', error);
      updateState({ isStreaming: false });
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

  // Add reconnection logic on disconnect and connection health monitoring
  useEffect(() => {
    if (roomRef.current) {
      const room = roomRef.current;
      let reconnectTimeout: NodeJS.Timeout;
      
      const handleDisconnect = (reason?: any) => {
        console.log('Room disconnected:', reason);
        if (state.isStreaming && retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          updateStatus(`Reconnecting (${retryCountRef.current}/${maxRetries})...`);
          
          // Clear any existing timeout
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }
          
          // Attempt reconnection with exponential backoff
          const delay = Math.min(2000 * Math.pow(2, retryCountRef.current - 1), 10000);
          reconnectTimeout = setTimeout(() => {
            startStreaming().catch(error => {
              console.error('Reconnection failed:', error);
              updateError(`Reconnection failed: ${error.message}`);
            });
          }, delay);
        } else if (retryCountRef.current >= maxRetries) {
          updateError('Maximum reconnection attempts reached. Please try again manually.');
          updateState({ isStreaming: false });
        }
      };
      
      room.on(RoomEvent.Disconnected, handleDisconnect);
      
      return () => {
        room.off(RoomEvent.Disconnected, handleDisconnect);
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
      };
    }
  }, [state.isStreaming, startStreaming, updateStatus, updateError, updateState, maxRetries]);

  // Connection health check
  useEffect(() => {
    let healthCheckInterval: NodeJS.Timeout;
    
    if (state.isConnected && state.isStreaming) {
      healthCheckInterval = setInterval(() => {
        if (roomRef.current && roomRef.current.state === 'connected') {
          // Connection is healthy
          console.log('Connection health check: OK');
        } else if (roomRef.current && roomRef.current.state === 'disconnected') {
          console.warn('Connection health check: Disconnected');
          updateStatus('Connection lost - attempting to reconnect...');
        }
      }, 10000); // Check every 10 seconds
    }
    
    return () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
    };
  }, [state.isConnected, state.isStreaming, updateStatus]);

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
