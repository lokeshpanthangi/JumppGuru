import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  Globe,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  Brain,
  Play,
  X,
} from "lucide-react";
import { useChatContext } from "../contexts/ChatContext";
import { ChatInput, type ChatInputRef } from "./ChatInput";
import { TypingAnimation } from "./ui/typing-animation";
import { LoadingState } from "./ui/LoadingState";
import ResearchLoadingAnimation from "./ui/ResearchLoadingAnimation";
import { MarkdownRenderer } from "./ui/MarkdownRenderer";
import { FastBlockRenderer } from "./ui/FastBlockRenderer";
import { StreamingMessage } from "./ui/StreamingMessage";
import { PlainTextRenderer } from "./ui/PlainTextRenderer";
import { TTSHighlightRenderer } from "./ui/TTSHighlightRenderer";
import { QuizModal } from "./ui/QuizModal";
import { QuizDisplayModal } from "./ui/QuizDisplayModal";
import { ResearchTTSModal } from "./ui/ResearchTTSModal";
import { Renderer, Program, Mesh, Color, Triangle } from "ogl";
// ElevenLabs TTS will use direct API calls

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ), 
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                               \
     ColorStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  ColorStop currentColor = colors[index];                   \
  ColorStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  
  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);
  
  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);
  
  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;
  
  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);
  
  vec3 auroraColor = intensity * rampColor;
  
  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`;

interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  time?: number;
  speed?: number;
}

const Aurora: React.FC<AuroraProps> = (props) => {
  const {
    colorStops = ["#5227FF", "#7cff67", "#5227FF"],
    amplitude = 1.0,
    blend = 0.5,
  } = props;
  const propsRef = useRef<AuroraProps>(props);
  propsRef.current = props;

  const ctnDom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctn = ctnDom.current;
    if (!ctn) return;

    const renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.canvas.style.backgroundColor = "transparent";

    let program: Program | undefined;

    function resize() {
      if (!ctn) return;
      const width = ctn.offsetWidth;
      const height = ctn.offsetHeight;
      renderer.setSize(width, height);
      if (program) {
        program.uniforms.uResolution.value = [width, height];
      }
    }
    window.addEventListener("resize", resize);

    const geometry = new Triangle(gl);
    if (geometry.attributes.uv) {
      delete geometry.attributes.uv;
    }

    const colorStopsArray = colorStops.map((hex) => {
      const c = new Color(hex);
      return [c.r, c.g, c.b];
    });

    program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: amplitude },
        uColorStops: { value: colorStopsArray },
        uResolution: { value: [ctn.offsetWidth, ctn.offsetHeight] },
        uBlend: { value: blend },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    ctn.appendChild(gl.canvas);

    let animateId = 0;
    const update = (t: number) => {
      animateId = requestAnimationFrame(update);
      const { time = t * 0.01, speed = 1.0 } = propsRef.current;
      if (program) {
        program.uniforms.uTime.value = time * speed * 0.1;
        program.uniforms.uAmplitude.value = propsRef.current.amplitude ?? 1.0;
        program.uniforms.uBlend.value = propsRef.current.blend ?? blend;
        const stops = propsRef.current.colorStops ?? colorStops;
        program.uniforms.uColorStops.value = stops.map((hex: string) => {
          const c = new Color(hex);
          return [c.r, c.g, c.b];
        });
        renderer.render({ scene: mesh });
      }
    };
    animateId = requestAnimationFrame(update);

    resize();

    return () => {
      cancelAnimationFrame(animateId);
      window.removeEventListener("resize", resize);
      if (ctn && gl.canvas.parentNode === ctn) {
        ctn.removeChild(gl.canvas);
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [amplitude]);

  return (
    <div
      ref={ctnDom}
      style={{
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "40%",
        pointerEvents: "none",
        zIndex: 1,
        borderRadius: "0 0 20px 20px",
        overflow: "hidden",
      }}
    />
  );
};

const getTimeOfDayGreeting = (userName: string): string => {
  // Get current time in IST (Indian Standard Time - UTC+5:30)
  const now = new Date();
  const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000); // Add 5.5 hours to UTC
  const hour = istTime.getUTCHours();

  if (hour < 12) {
    const morningMessages = [
      "Coffee Time",
      "Sunny Start",
      "Let's Start",
      "Sun's Out",
    ];
    return `${
      morningMessages[Math.floor(Math.random() * morningMessages.length)]
    }, ${userName}`;
  }

  if (hour < 17) {
    const afternoonMessages = ["Midday Vibes", "Sunny Noon", "Good Afternoon"];
    return `${
      afternoonMessages[Math.floor(Math.random() * afternoonMessages.length)]
    }, ${userName}`;
  }

  const eveningMessages = [
    "Hello Batman",
    `Evening, ${userName}`,
    `Dream On, ${userName}`,
  ];
  return eveningMessages[Math.floor(Math.random() * eveningMessages.length)];
};

const isEveningTime = (): boolean => {
  // Get current time in IST (Indian Standard Time - UTC+5:30)
  const now = new Date();
  const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000); // Add 5.5 hours to UTC
  const hour = istTime.getUTCHours();
  return hour >= 17;
};

const formatMessageTime = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const ChatArea: React.FC = () => {
  const { state, addAIMessage, sendMessage, markMessageAutoTTSPlayed, dispatch } = useChatContext();
  const [showCenteredInput, setShowCenteredInput] = useState(true);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set());
  const [dislikedMessages, setDislikedMessages] = useState<Set<string>>(
    new Set()
  );
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [isQuizDisplayOpen, setIsQuizDisplayOpen] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [selectedMessageChatId, setSelectedMessageChatId] = useState<string | null>(null);

  // Research TTS Modal state
  const [isResearchTTSModalOpen, setIsResearchTTSModalOpen] = useState(false);
  const [researchTTSChatId, setResearchTTSChatId] = useState<string>("");
  const [researchTTSMessageId, setResearchTTSMessageId] = useState<string>("");

  // Playground state
  const [playgroundMode, setPlaygroundMode] = useState(false);
  const [playgroundUrl, setPlaygroundUrl] = useState("");
  const [selectedVideoForPlayground, setSelectedVideoForPlayground] =
    useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputRef>(null);

  // TTS Streaming State
  const [ttsAudioCache, setTtsAudioCache] = useState<Map<string, Blob[]>>(
    new Map()
  );
  const [isLoadingTTS, setIsLoadingTTS] = useState<Map<string, boolean>>(
    new Map()
  );
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const lastProcessedMessageRef = useRef<string | null>(null);
  const [currentAudioElement, setCurrentAudioElement] =
    useState<HTMLAudioElement | null>(null);
  const [currentPlayingMessageId, setCurrentPlayingMessageId] = useState<
    string | null
  >(null);
  const [wordTimestamps, setWordTimestamps] = useState<Array<{
    word: string;
    start: number;
    end: number;
  }> | null>(null);
  
  // Synchronized TTS state
  const [synchronizedTTSData, setSynchronizedTTSData] = useState<{
    messageId: string;
    fullText: string;
    wordTimestamps: Array<{ word: string; start: number; end: number }>;
    audioElement: HTMLAudioElement;
    isPlaying: boolean;
  } | null>(null);
  const [revealedText, setRevealedText] = useState<string>("");
  const [currentRevealIndex, setCurrentRevealIndex] = useState<number>(-1);
  
  // Auto TTS generation state - track which messages are generating audio
  const [generatingAutoTTS, setGeneratingAutoTTS] = useState<Set<string>>(new Set());

  const hasMessages = state.currentChat?.messages.length ?? 0 > 0;

  useEffect(() => {
    if (hasMessages) {
      setShowCenteredInput(false);
    } else {
      setShowCenteredInput(true);
    }
  }, [hasMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.currentChat?.messages]);

  // Global Enter key handler for chat area
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle Enter key in chat area when not in input field
      if (e.key === "Enter" && !e.shiftKey && !state.isTyping) {
        const target = e.target as HTMLElement;

        // Don't handle if user is typing in input field, textarea, or contenteditable
        if (
          target.tagName === "TEXTAREA" ||
          target.tagName === "INPUT" ||
          target.contentEditable === "true" ||
          target.isContentEditable
        ) {
          return;
        }

        // Don't handle if any modal is open
        if (isQuizModalOpen || isQuizDisplayOpen || isResearchTTSModalOpen) {
          return;
        }

        // Focus the chat input and trigger submission if there's content
        if (chatInputRef.current) {
          e.preventDefault();
          chatInputRef.current.focusAndSubmit();
        }
      }
    };

    // Add event listener to document
    document.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [
    state.isTyping,
    isQuizModalOpen,
    isQuizDisplayOpen,
    isResearchTTSModalOpen,
  ]);

  // Cleanup audio when component unmounts or chat changes
  useEffect(() => {
    // Reset last processed message when chat changes
    lastProcessedMessageRef.current = null;

    return () => {
      // Stop all audio playback
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      audioRefs.current.clear();

      // Stop speech synthesis
      speechSynthesis.cancel();

      // Clear TTS state
      setTtsAudioCache(new Map());
      setIsLoadingTTS(new Map());
      setPlayingVoice(null);
      setGeneratingAutoTTS(new Set());
    };
  }, [state.currentChatId]); // Clear when chat changes

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      speechSynthesis.cancel();
      setGeneratingAutoTTS(new Set());
    };
  }, []);

  // Reset last processed message when chat changes
  useEffect(() => {
    lastProcessedMessageRef.current = null;
  }, [state.currentChatId]);

  // Handle synchronized word revelation based on audio timestamps
  useEffect(() => {
    if (!synchronizedTTSData || !synchronizedTTSData.isPlaying) {
      return;
    }

    const { audioElement, wordTimestamps, fullText } = synchronizedTTSData;
    
    const updateRevealedText = () => {
      const currentTime = audioElement.currentTime;
      
      // Find which words should be revealed based on current time
      let revealUpToIndex = -1;
      for (let i = 0; i < wordTimestamps.length; i++) {
        if (currentTime >= wordTimestamps[i].start) {
          revealUpToIndex = i;
        } else {
          break;
        }
      }
      
      if (revealUpToIndex !== currentRevealIndex) {
        setCurrentRevealIndex(revealUpToIndex);
        
        // Build revealed text up to current index
        if (revealUpToIndex >= 0) {
          const revealedWords = wordTimestamps.slice(0, revealUpToIndex + 1).map(t => t.word);
          setRevealedText(revealedWords.join(' '));
        } else {
          setRevealedText('');
        }
      }
    };

    const handleTimeUpdate = () => {
      updateRevealedText();
    };

    const handleEnded = () => {
      // Reveal full text when audio ends
      setRevealedText(fullText);
      setCurrentRevealIndex(wordTimestamps.length - 1);
    };

    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('ended', handleEnded);

    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [synchronizedTTSData, currentRevealIndex]);

  // Auto TTS for pending responses with synchronized word display
  useEffect(() => {
    if (!state.autoTTS || !state.pendingAutoTTSResponse) return;

    const { chatId, content, messageId } = state.pendingAutoTTSResponse;
    
    // Only process if it's for the current chat and not already processed
    if (
      chatId === state.currentChatId &&
      messageId !== lastProcessedMessageRef.current
    ) {
      // Mark as processed
      lastProcessedMessageRef.current = messageId;

      // First, add the message to chat immediately to show animation
      const placeholderMessage = {
        id: messageId,
        content: content,
        type: "ai" as const,
        timestamp: new Date(),
        isStreaming: false,
        isCurrentlyGenerating: false,
        page: state.currentPage,
        hasAutoTTSPlayed: false,
        isAutoTTSMessage: true,
      };
      
      if (state.currentChatId) {
        dispatch({ type: "ADD_MESSAGE", chatId: state.currentChatId, message: placeholderMessage });
      }
      
      // Clear the pending response
      dispatch({ type: "HANDLE_AUTO_TTS_RESPONSE", chatId: "", content: "", messageId: "" });

      // Trigger synchronized TTS with word-by-word display
      handleSynchronizedTTS(content, messageId);
    }
  }, [
    state.autoTTS,
    state.pendingAutoTTSResponse,
    state.currentChatId,
  ]);

  const handleMessageSent = () => {
    if (showCenteredInput) {
      // Smooth transition delay to allow message to be added first
      setTimeout(() => {
        setShowCenteredInput(false);
      }, 300);
    }
  };

  const getModeIcon = (mode?: string) => {
    switch (mode) {
      case "web":
        return <Globe className="w-3 h-3" />;
      case "research":
        return <Search className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    setNotification("Copied");
    setTimeout(() => setNotification(null), 2000);
  };

  const handleLikeMessage = (messageId: string) => {
    setLikedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        // Remove from disliked if it was disliked
        setDislikedMessages((prevDisliked) => {
          const newDislikedSet = new Set(prevDisliked);
          newDislikedSet.delete(messageId);
          return newDislikedSet;
        });
      }
      return newSet;
    });
  };

  const handleDislikeMessage = (messageId: string) => {
    setDislikedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        // Remove from liked if it was liked
        setLikedMessages((prevLiked) => {
          const newLikedSet = new Set(prevLiked);
          newLikedSet.delete(messageId);
          return newLikedSet;
        });
      }
      return newSet;
    });
  };

  const handleSpeakMessage = async (
    content: string,
    messageId: string,
    mode
  ) => {
    // Check if this specific message was generated in research mode
    const message = state.currentChat?.messages.find(
      (msg) => msg.id === messageId
    );
    const isResearchModeMessage = message?.mode === "research";
    const chatId = state.currentChat?.backendChatId;

    if (playingVoice === messageId) {
      // Stop current playback
      if (isResearchModeMessage && chatId) {
        const audioElement = audioRefs.current.get(messageId);
        if (audioElement) {
          audioElement.pause();
          audioElement.currentTime = 0;
        }
      } else {
        speechSynthesis.cancel();
        // Stop current audio element if it exists
        if (currentAudioElement) {
          currentAudioElement.pause();
          currentAudioElement.currentTime = 0;
        }
      }
      setPlayingVoice(null);
      setCurrentAudioElement(null);
      setCurrentPlayingMessageId(null);
      setWordTimestamps(null);
      return;
    }

    // Stop any current playback
    if (playingVoice) {
      const currentAudio = audioRefs.current.get(playingVoice);
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      speechSynthesis.cancel();
      // Stop current audio element if it exists
      if (currentAudioElement) {
        currentAudioElement.pause();
        currentAudioElement.currentTime = 0;
      }
    }

    // Clear previous states
    setCurrentAudioElement(null);
    setCurrentPlayingMessageId(null);
    setWordTimestamps(null);
    setPlayingVoice(messageId);

    if (isResearchModeMessage && chatId) {
      // Open research TTS modal for research mode messages
      setResearchTTSChatId(chatId);
      setResearchTTSMessageId(messageId);
      setIsResearchTTSModalOpen(true);
      setPlayingVoice(null); // Reset playing voice since modal will handle playback
    } else {
      // Use ElevenLabs TTS for non-research mode messages
      await handleElevenLabsTTS(content, messageId);
    }
  };

  const processCharacterTimestamps = (alignment: any, text: string) => {
    // Convert character-level timestamps to word-level for compatibility
    const words = text.split(/\s+/);
    const wordTimestamps = [];
    let charIndex = 0;

    for (const word of words) {
      const wordStart = charIndex;
      const wordEnd = charIndex + word.length - 1;

      // Get start and end times from character arrays
      const startTime = alignment.character_start_times_seconds[wordStart] || 0;
      const endTime =
        alignment.character_end_times_seconds[wordEnd] || startTime + 0.5;

      wordTimestamps.push({
        word: word,
        start: startTime,
        end: endTime,
      });

      charIndex += word.length + 1; // +1 for space
    }

    return wordTimestamps;
  };

  const handleSynchronizedTTS = async (content: string, messageId: string) => {
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

    try {
      setPlayingVoice(messageId);
      // Mark this message as generating auto TTS
      setGeneratingAutoTTS(prev => new Set(prev).add(messageId));
      
      // Call ElevenLabs API with character timestamps
      const ttsResponse = await fetch(
        "https://api.elevenlabs.io/v1/text-to-speech/zT03pEAEi0VHKciJODfn/with-timestamps",
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: content,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: true,
              speed: 0.75,
            },
          }),
        }
      );

      if (!ttsResponse.ok) {
        throw new Error(`ElevenLabs API error: ${ttsResponse.status}`);
      }

      const result = await ttsResponse.json();

      // Convert base64 audio to blob
      const audioData = atob(result.audio_base64);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }
      const audioBlob = new Blob([audioArray], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Process character-level timestamps into word-level
      const processedTimestamps = processCharacterTimestamps(
        result.alignment,
        content
      );

      // Create audio element
      const audio = new Audio(audioUrl);
      
      // Message already added to chat in useEffect, just proceed with TTS setup

      // Setup synchronized TTS data
      setSynchronizedTTSData({
        messageId,
        fullText: content,
        wordTimestamps: processedTimestamps,
        audioElement: audio,
        isPlaying: true,
      });
      
      setRevealedText("");
      setCurrentRevealIndex(-1);
      setCurrentAudioElement(audio);
      setCurrentPlayingMessageId(messageId);

      // Setup audio event handlers
      audio.onended = () => {
        setPlayingVoice(null);
        setSynchronizedTTSData(null);
        setRevealedText("");
        setCurrentRevealIndex(-1);
        setCurrentAudioElement(null);
        setCurrentPlayingMessageId(null);
        // Clear generating state
        setGeneratingAutoTTS(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        console.error("Audio playback error");
        setPlayingVoice(null);
        setSynchronizedTTSData(null);
        setRevealedText("");
        setCurrentRevealIndex(-1);
        setCurrentAudioElement(null);
        setCurrentPlayingMessageId(null);
        // Clear generating state
        setGeneratingAutoTTS(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
        URL.revokeObjectURL(audioUrl);
      };

      // When audio starts playing, clear generating state and mark message as played
      audio.onplay = () => {
        setGeneratingAutoTTS(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
        // Mark the message as played when audio starts
        if (state.currentChatId) {
          dispatch({ 
            type: "MARK_MESSAGE_AUTO_TTS_PLAYED", 
            chatId: state.currentChatId, 
            messageId: messageId 
          });
        }
      };

      // Start audio playback
      audio.play();
    } catch (error) {
      console.error("Synchronized TTS error:", error);
      setPlayingVoice(null);
      setSynchronizedTTSData(null);
      setRevealedText("");
      setCurrentRevealIndex(-1);
      setCurrentAudioElement(null);
      setCurrentPlayingMessageId(null);
      // Clear generating state on error
      setGeneratingAutoTTS(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
  };

  const handleElevenLabsTTS = async (content: string, messageId: string) => {
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

    try {
      // Call ElevenLabs API with character timestamps using Raju voice
      const ttsResponse = await fetch(
        "https://api.elevenlabs.io/v1/text-to-speech/zT03pEAEi0VHKciJODfn/with-timestamps",
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: content,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: true,
              speed: 0.75,
            },
          }),
        }
      );

      if (!ttsResponse.ok) {
        throw new Error(`ElevenLabs API error: ${ttsResponse.status}`);
      }

      const result = await ttsResponse.json();

      // Convert base64 audio to blob
      const audioData = atob(result.audio_base64);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }
      const audioBlob = new Blob([audioArray], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Process character-level timestamps into word-level for compatibility
      const processedTimestamps = processCharacterTimestamps(
        result.alignment,
        content
      );

      // Store timestamps for highlighting
      setWordTimestamps(processedTimestamps);

      // Create and setup audio element
      const audio = new Audio(audioUrl);

      // Store audio element reference for highlighting
      setCurrentAudioElement(audio);
      setCurrentPlayingMessageId(messageId);

      audio.onended = () => {
        setPlayingVoice(null);
        setCurrentAudioElement(null);
        setCurrentPlayingMessageId(null);
        setWordTimestamps(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.play();
    } catch (error) {
      console.error("ElevenLabs TTS error:", error);
      setPlayingVoice(null);
      setCurrentAudioElement(null);
      setCurrentPlayingMessageId(null);
      setWordTimestamps(null);
    }
  };

  const handleTTSStreaming = async (chatId: string, messageId: string) => {
    try {
      // Check if we already have cached audio files for this message
      const cachedFiles = ttsAudioCache.get(messageId);
      if (cachedFiles && cachedFiles.length > 0) {
        // Play the combined cached audio
        await playCombinedAudio(cachedFiles, messageId);
        return;
      }

      // Set loading state
      setIsLoadingTTS((prev) => new Map(prev.set(messageId, true)));

      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

      // Start TTS generation
      const response = fetch(`${BACKEND_URL}/tts/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
        }),
      });

      // Wait 10 seconds before starting to fetch files
      await new Promise((resolve) => setTimeout(resolve, 6000));

      // Fetch all audio files
      const audioFiles: Blob[] = [];
      let iteration = 1;
      let consecutiveFailures = 0;
      const maxConsecutiveFailures = 1;
      let shouldContinueFetching = true;

      console.log("Starting to fetch all audio files...");

      while (shouldContinueFetching) {
        try {
          console.log(`Fetching audio file: ${chatId}_${iteration}.mp3`);
          const audioResponse = await fetch(
            `${BACKEND_URL}/tts/file/${chatId}_${iteration}.mp3`
          );

          if (audioResponse.ok) {
            const audioBlob = await audioResponse.blob();
            audioFiles.push(audioBlob);
            consecutiveFailures = 0;

            console.log(
              `Successfully fetched file ${iteration}, total files: ${audioFiles.length}`
            );
            iteration++;

            // Small delay between requests
            await new Promise((resolve) => setTimeout(resolve, 500));
          } else if (audioResponse.status === 404) {
            consecutiveFailures++;
            console.log(
              `File ${iteration} not found (404), consecutive failures: ${consecutiveFailures}`
            );

            if (consecutiveFailures >= maxConsecutiveFailures) {
              console.log("Max consecutive failures reached, stopping fetch");
              shouldContinueFetching = false;
            } else {
              iteration++;
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          } else {
            throw new Error(`Audio fetch failed: ${audioResponse.status}`);
          }
        } catch (error) {
          console.error(`Error fetching audio file ${iteration}:`, error);
          consecutiveFailures++;

          if (consecutiveFailures >= maxConsecutiveFailures) {
            console.log(
              "Max consecutive failures reached due to errors, stopping fetch"
            );
            shouldContinueFetching = false;
          } else {
            iteration++;
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      if (audioFiles.length > 0) {
        console.log(
          `Finished fetching ${audioFiles.length} audio files. Combining and playing...`
        );

        // Cache the audio files
        setTtsAudioCache((prev) => new Map(prev.set(messageId, audioFiles)));

        // Combine and play the audio
        await playCombinedAudio(audioFiles, messageId);
      } else {
        console.log("No audio files were fetched");
        setPlayingVoice(null);
        setNotification("No audio files found");
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error("TTS Streaming Error:", error);
      setNotification("Failed to load audio. Please try again.");
      setTimeout(() => setNotification(null), 3000);
      setPlayingVoice(null);
    } finally {
      setIsLoadingTTS((prev) => new Map(prev.set(messageId, false)));
    }
  };

  const combineAudioFiles = async (audioFiles: Blob[]): Promise<Blob> => {
    console.log(`Combining ${audioFiles.length} audio files...`);

    // Create a new blob by combining all audio file data
    const combinedArrayBuffer = await Promise.all(
      audioFiles.map((file) => file.arrayBuffer())
    );

    // Calculate total size
    const totalSize = combinedArrayBuffer.reduce(
      (total, buffer) => total + buffer.byteLength,
      0
    );

    // Create a new Uint8Array to hold all the data
    const combinedBuffer = new Uint8Array(totalSize);
    let offset = 0;

    // Copy each audio file's data into the combined buffer
    for (const buffer of combinedArrayBuffer) {
      combinedBuffer.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }

    // Create a new blob with the combined data
    const combinedBlob = new Blob([combinedBuffer], { type: "audio/mpeg" });
    console.log(`Combined audio created: ${combinedBlob.size} bytes`);

    return combinedBlob;
  };

  const playCombinedAudio = async (audioFiles: Blob[], messageId: string) => {
    try {
      console.log(
        `Starting combined audio playback for ${audioFiles.length} files`
      );

      // Combine all audio files into a single blob
      const combinedAudio = await combineAudioFiles(audioFiles);

      // Create object URL for the combined audio
      const audioUrl = URL.createObjectURL(combinedAudio);

      // Create audio element
      const audioElement = new Audio();
      audioElement.src = audioUrl;

      // Store the audio element
      audioRefs.current.set(messageId, audioElement);

      // Set up event handlers
      audioElement.onended = () => {
        console.log("Combined audio playback finished");
        URL.revokeObjectURL(audioUrl);
        setPlayingVoice(null);
      };

      audioElement.onerror = (e) => {
        console.error("Combined audio playback error:", e);
        URL.revokeObjectURL(audioUrl);
        setPlayingVoice(null);
      };

      audioElement.onloadeddata = () => {
        console.log("Combined audio loaded successfully");
      };

      // Start playing
      await audioElement.play();
      console.log("Combined audio started playing");
    } catch (error) {
      console.error("Error playing combined audio:", error);
      setPlayingVoice(null);
    }
  };

  const handleOpenQuizModal = (messageChatId?: string) => {
    if (!state.currentChat?.messages.length) {
      setNotification("No conversation found to generate quiz from");
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // Use the specific message's chat_id if provided, otherwise fall back to the general chat's backendChatId
    const chatIdToUse = messageChatId || state.currentChat?.backendChatId;
    
    if (!chatIdToUse) {
      setNotification("Please send a message first to start a conversation");
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setSelectedMessageChatId(chatIdToUse);
    setIsQuizModalOpen(true);
  };

  const handleGenerateQuiz = async (
    difficulty: string,
    numQuestions: number
  ) => {
    const chatIdToUse = selectedMessageChatId || state.currentChat?.backendChatId;
    
    if (!chatIdToUse) {
      setNotification("No chat ID found. Please send a message first.");
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // Validate chat_id format (should be a string, not an object)
    if (typeof chatIdToUse !== 'string') {
      console.error('Invalid chat_id format:', chatIdToUse);
      setNotification("Invalid chat ID format. Please try again.");
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsGeneratingQuiz(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      const requestBody = {
        user_id: state.currentUser.username,
        num_questions: numQuestions,
        difficulty: difficulty,
        chat_id: chatIdToUse,
      };

      console.log("Sending quiz request:", requestBody);

      const response = await fetch(`${backendUrl}/generate_mcqs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Quiz generation failed (${response.status}):`, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Quiz response:", data);

      if (data.mcqs && Array.isArray(data.mcqs)) {
        // Convert backend MCQ format to frontend quiz format
        const quizQuestions = data.mcqs.map((mcq: any) => ({
          question: mcq.question,
          options: mcq.options,
          answer: mcq.answer, // Fixed: backend returns 'answer', not 'correct_answer'
          explanation: mcq.explanation || "No explanation provided",
        }));

        // Store quiz questions and open display modal
        setQuizQuestions(quizQuestions);
        setIsQuizDisplayOpen(true);

        setNotification(`Generated ${quizQuestions.length} quiz questions!`);
        setTimeout(() => setNotification(null), 3000);
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (error) {
      console.error("Error generating quiz:", error);
      setNotification("Failed to generate quiz. Please try again.");
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsGeneratingQuiz(false);
      setIsQuizModalOpen(false);
    }
  };

  const handleCloseQuizModal = () => {
    if (!isGeneratingQuiz) {
      setIsQuizModalOpen(false);
    }
  };

  // Playground functions
  const extractVideoId = (url: string): string | null => {
    const regex =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleTogglePlaygroundMode = () => {
    setPlaygroundMode(!playgroundMode);
    if (playgroundMode) {
      // Reset playground state when turning off
      setPlaygroundUrl("");
      setSelectedVideoForPlayground(null);
    }
  };

  const handlePlaygroundUrlChange = (url: string) => {
    setPlaygroundUrl(url);
    setSelectedVideoForPlayground(null); // Clear selection when typing manually
  };

  const handleVideoSelectForPlayground = (video: any) => {
    setSelectedVideoForPlayground(video);
    setPlaygroundUrl(video.link || "");
  };

  const handleGeneratePlayground = () => {
    const urlToUse = playgroundUrl.trim();
    if (!urlToUse) {
      setNotification("Please enter a YouTube URL");
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const videoId = extractVideoId(urlToUse);
    if (!videoId) {
      setNotification("Invalid YouTube URL");
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // Open playground in new tab
    const playgroundPath = `/playground/${videoId}?url=${encodeURIComponent(
      urlToUse
    )}`;
    window.open(playgroundPath, "_blank");

    // Reset playground state
    setPlaygroundMode(false);
    setPlaygroundUrl("");
    setSelectedVideoForPlayground(null);

    setNotification("Opening playground in new tab...");
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="flex-1 flex flex-col bg-chat-bg transition-all duration-500 ease-in-out h-screen relative">
      {/* Aurora Effect - Only in dark mode */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
          state.showAurora && state.theme === 'dark' ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ zIndex: 5 }}
      >
        <Aurora
          colorStops={["#5227FF", "#7cff67", "#5227FF"]}
          amplitude={1.0}
          blend={0.5}
          speed={1.0}
        />
      </div>

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 bg-brand-primary text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          {notification}
        </div>
      )}
      {showCenteredInput && !hasMessages ? (
        /* Welcome Screen */
        <div className="flex-1 flex flex-col items-center justify-start min-h-screen p-8 pt-48 relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-6">
              <span className="gradient-welcome">
                {getTimeOfDayGreeting(state.userName)}
              </span>
            </h1>
            <p className="text-xl text-text-secondary mb-6">
              What would you like to explore today?
            </p>
          </div>

          <div className="w-full max-w-3xl">
            <ChatInput
              ref={chatInputRef}
              centered
              onMessageSent={handleMessageSent}
            />
          </div>
        </div>
      ) : (
        /* Active Chat - Full Screen */
        <div className="flex-1 flex flex-col h-full relative z-10">
          {/* Messages Container - Full Screen */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto scrollbar-thin p-6 pb-32 space-y-6 min-h-0"
          >
            {state.currentChat?.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.type === "user" ? "justify-end" : "justify-start"
                } transition-all duration-sidebar ease-sidebar`}
                style={{
                  marginRight:
                    message.type === "user"
                      ? state.sidebarCollapsed
                        ? "165px"
                        : "40px"
                      : "0",
                  marginLeft:
                    message.type === "user"
                      ? "0"
                      : state.sidebarCollapsed
                      ? "170px"
                      : "50px",
                }}
              >
                <div
                  className={`max-w-[80%] ${
                    message.type === "user"
                      ? "bg-[hsl(var(--message-user-bg))] text-text-primary border border-input-border rounded-2xl rounded-br-md px-4 py-3"
                      : "bg-transparent text-text-primary"
                  }`}
                >
                  {message.type === "user" ? (
                    <div>
                      {message.mode && (
                        <div className="flex items-center gap-2 mb-2 text-text-secondary text-sm">
                          {getModeIcon(message.mode)}
                          <span>
                            {message.mode === "web" ? "Web Search" : "Research"}
                          </span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  ) : (
                    <div
                      className="space-y-3 group relative"
                      onMouseEnter={() => setHoveredMessageId(message.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      {message.mode === "research" && (
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white">
                            <img
                              src="/logo.png"
                              alt="JumpApp Logo"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <span className="font-medium text-text-primary">
                            JumpApp
                          </span>
                          <span className="text-xs text-text-muted">
                            {formatMessageTime(message.timestamp)}
                          </span>
                        </div>
                      )}
                      <div className="prose max-w-none">
                        {message.type === "ai" &&
                        message.isCurrentlyGenerating ? (
                          message.mode === "research" ? (
                            <FastBlockRenderer
                              content={message.content}
                              playgroundMode={playgroundMode}
                              onVideoSelectForPlayground={
                                handleVideoSelectForPlayground
                              }
                            />
                          ) : (
                            <StreamingMessage
                              content={message.content}
                              messageId={message.id}
                              chatId={state.currentChatId!}
                            >
                              {(displayedContent) =>
                                displayedContent.includes("<BLOCKS_DATA>") ? (
                                  <FastBlockRenderer
                                    content={displayedContent}
                                    playgroundMode={playgroundMode}
                                    onVideoSelectForPlayground={
                                      handleVideoSelectForPlayground
                                    }
                                  />
                                ) : (
                                  <PlainTextRenderer
                                    content={displayedContent}
                                  />
                                )
                              }
                            </StreamingMessage>
                          )
                        ) : state.autoTTS && generatingAutoTTS.has(message.id) ? (
                          // Show thinking animation when auto TTS is generating audio
                          <TypingAnimation className="text-base" />
                        ) : message.isAutoTTSMessage && !message.hasAutoTTSPlayed ? (
                          // Show thinking animation until Auto TTS audio starts playing
                          <TypingAnimation className="text-base" />
                        ) : message.content.includes("<BLOCKS_DATA>") ? (
                          <FastBlockRenderer
                            content={message.content}
                            playgroundMode={playgroundMode}
                            onVideoSelectForPlayground={
                              handleVideoSelectForPlayground
                            }
                          />
                        ) : synchronizedTTSData && synchronizedTTSData.messageId === message.id ? (
                          <MarkdownRenderer
                            content={revealedText || ""}
                            playgroundMode={playgroundMode}
                            onVideoSelectForPlayground={
                              handleVideoSelectForPlayground
                            }
                          />
                        ) : currentPlayingMessageId === message.id ? (
                          <TTSHighlightRenderer
                            content={message.content}
                            isPlaying={playingVoice === message.id}
                            audioElement={currentAudioElement}
                            wordTimestamps={wordTimestamps}
                          />
                        ) : (
                          <MarkdownRenderer
                            content={message.content}
                            playgroundMode={playgroundMode}
                            onVideoSelectForPlayground={
                              handleVideoSelectForPlayground
                            }
                          />
                        )}
                      </div>

                      {/* Playground Input - Show when playground mode is active and message has YouTube videos */}
                      {playgroundMode &&
                        message.content.includes("<youtube-cards>") &&
                        message.type === "ai" &&
                        message.mode === "research" && (
                          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 mb-3">
                              <Play className="w-5 h-5 text-blue-600" />
                              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                                Generate Learning Playground
                              </h3>
                            </div>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                              Enter a YouTube URL or click on one of the videos
                              above to create an interactive learning
                              experience.
                            </p>

                            <div className="space-y-3">
                              {/* URL Input */}
                              <div>
                                <input
                                  type="text"
                                  value={playgroundUrl}
                                  onChange={(e) =>
                                    handlePlaygroundUrlChange(e.target.value)
                                  }
                                  placeholder="Paste YouTube URL here..."
                                  className="w-full px-3 py-2 border border-input-border rounded-lg bg-background text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>

                              {/* Selected Video Display */}
                              {selectedVideoForPlayground && (
                                <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <img
                                    src={selectedVideoForPlayground.thumbnail}
                                    alt={selectedVideoForPlayground.title}
                                    className="w-16 h-12 object-cover rounded"
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-text-primary truncate">
                                      {selectedVideoForPlayground.title}
                                    </p>
                                    <p className="text-xs text-text-muted">
                                      Selected video
                                    </p>
                                  </div>
                                  <button
                                    onClick={() =>
                                      setSelectedVideoForPlayground(null)
                                    }
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                  >
                                    <X className="w-4 h-4 text-text-muted" />
                                  </button>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={handleGeneratePlayground}
                                  disabled={!playgroundUrl.trim()}
                                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                                    !playgroundUrl.trim()
                                      ? "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
                                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                                  }`}
                                >
                                  <Play className="w-4 h-4" />
                                  Generate Playground
                                </button>

                                <button
                                  onClick={handleTogglePlaygroundMode}
                                  className="px-4 py-2 rounded-lg font-medium transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                      {/* Action Buttons - Always reserve space but only visible on hover */}
                      <div className="flex items-center justify-between mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyMessage(message.content)}
                            className="p-2 rounded-lg hover:bg-button-secondary transition-colors duration-200 text-text-muted hover:text-text-primary"
                            title="Copy"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleLikeMessage(message.id)}
                            className={`p-2 rounded-lg hover:bg-button-secondary transition-colors duration-200 ${
                              likedMessages.has(message.id)
                                ? "text-green-500 bg-green-100 dark:bg-green-900/20"
                                : "text-text-muted hover:text-green-500"
                            }`}
                            title={
                              likedMessages.has(message.id) ? "Unlike" : "Like"
                            }
                          >
                            <ThumbsUp
                              className={`w-4 h-4 ${
                                likedMessages.has(message.id)
                                  ? "fill-current"
                                  : ""
                              }`}
                            />
                          </button>
                          <button
                            onClick={() => handleDislikeMessage(message.id)}
                            className={`p-2 rounded-lg hover:bg-button-secondary transition-colors duration-200 ${
                              dislikedMessages.has(message.id)
                                ? "text-red-500 bg-red-100 dark:bg-red-900/20"
                                : "text-text-muted hover:text-red-500"
                            }`}
                            title={
                              dislikedMessages.has(message.id)
                                ? "Remove dislike"
                                : "Dislike"
                            }
                          >
                            <ThumbsDown
                              className={`w-4 h-4 ${
                                dislikedMessages.has(message.id)
                                  ? "fill-current"
                                  : ""
                              }`}
                            />
                          </button>
                          <button
                            onClick={() =>
                              handleSpeakMessage(
                                message.content,
                                message.id,
                                message.mode
                              )
                            }
                            disabled={isLoadingTTS.get(message.id)}
                            className={`p-2 rounded-lg hover:bg-button-secondary transition-colors duration-200 ${
                              playingVoice === message.id
                                ? "text-blue-500 bg-blue-100 dark:bg-blue-900/20"
                                : isLoadingTTS.get(message.id)
                                ? "text-orange-500 bg-orange-100 dark:bg-orange-900/20"
                                : "text-text-muted hover:text-blue-500"
                            } ${
                              isLoadingTTS.get(message.id) ? "cursor-wait" : ""
                            }`}
                            title={
                              isLoadingTTS.get(message.id)
                                ? "Loading audio..."
                                : playingVoice === message.id
                                ? "Stop reading"
                                : "Read aloud"
                            }
                          >
                            {isLoadingTTS.get(message.id) ? (
                              <Volume2 className="w-4 h-4 animate-pulse" />
                            ) : playingVoice === message.id ? (
                              <VolumeX className="w-4 h-4 animate-pulse" />
                            ) : (
                              <Volume2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Action Buttons for research mode responses */}
                        {message.type === "ai" &&
                          message.mode === "research" && (
                            <div className="flex items-center gap-3">
                              {/* Generate Playground Button - Show when message contains YouTube videos */}
                              {message.content.includes("<youtube-cards>") && (
                                <button
                                  onClick={handleTogglePlaygroundMode}
                                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                                    playgroundMode
                                      ? "bg-green-100 dark:bg-green-900/20 text-green-600 border border-green-300"
                                      : "bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg"
                                  }`}
                                >
                                  <Play className="w-4 h-4" />
                                  {playgroundMode
                                    ? "Exit Playground"
                                    : "Generate Playground"}
                                </button>
                              )}

                              {/* Generate Quiz Button */}
                              <button
                                onClick={() => handleOpenQuizModal(message.chat_id)}
                                disabled={isGeneratingQuiz}
                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                                  isGeneratingQuiz
                                    ? "bg-purple-100 dark:bg-purple-900/20 text-purple-600 cursor-not-allowed"
                                    : "bg-purple-500 hover:bg-purple-600 text-white shadow-md hover:shadow-lg"
                                }`}
                              >
                                <Brain
                                  className={`w-4 h-4 ${
                                    isGeneratingQuiz ? "animate-pulse" : ""
                                  }`}
                                />
                                {isGeneratingQuiz
                                  ? "Generating..."
                                  : "Generate Quiz"}
                              </button>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {(state.isTyping || state.loadingState) && (
              <div
                className="flex justify-start transition-all duration-sidebar ease-sidebar"
                style={{
                  marginLeft: state.sidebarCollapsed ? "170px" : "85px",
                }}
              >
                <div className="bg-transparent text-text-primary max-w-[80%]">
                  {/* {state.loadingState && state.loadingState.includes('research') && (
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white">
                        <img src="/logo.png" alt="JumpApp Logo" className="w-full h-full object-contain" />
                      </div>
                      <span className="font-medium text-text-primary">JumpApp</span>
                    </div>
                  )} */}
                  <div className="prose max-w-none">
                    {state.loadingState ? (
                      state.loadingState.includes("research") ? (
                        <ResearchLoadingAnimation />
                      ) : (
                        <LoadingState message={state.loadingState} />
                      )
                    ) : (
                      <TypingAnimation className="text-base" />
                    )}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Floating Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-chat-bg via-chat-bg/95 to-transparent pointer-events-none z-10">
            <div
              className="pointer-events-auto transition-all duration-sidebar ease-sidebar"
              style={{
                marginLeft: state.sidebarCollapsed ? "85px" : "15px",
                marginRight: state.sidebarCollapsed ? "80px" : "15px",
              }}
            >
              <ChatInput ref={chatInputRef} onMessageSent={handleMessageSent} />
            </div>
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      <QuizModal
        isOpen={isQuizModalOpen}
        onClose={handleCloseQuizModal}
        onGenerate={handleGenerateQuiz}
        isGenerating={isGeneratingQuiz}
      />

      {/* Quiz Display Modal */}
      <QuizDisplayModal
        isOpen={isQuizDisplayOpen}
        onClose={() => setIsQuizDisplayOpen(false)}
        questions={quizQuestions}
      />

      {/* Research TTS Modal */}
      <ResearchTTSModal
        isOpen={isResearchTTSModalOpen}
        onClose={() => setIsResearchTTSModalOpen(false)}
        chatId={state?.currentChat?.backendChatId ?? researchTTSChatId}
        messageId={researchTTSMessageId}
      />
    </div>
  );
};
