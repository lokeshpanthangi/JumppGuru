import React, { useEffect, useState, useRef } from "react";
import { X, Volume2, VolumeX } from "lucide-react";

interface ResearchTTSModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  messageId: string;
}

export const ResearchTTSModal: React.FC<ResearchTTSModalProps> = ({
  isOpen,
  onClose,
  chatId,
  messageId,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState<string>("");
  const [displayedText, setDisplayedText] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && chatId) {
      fetchContentAndGenerateAudio();
    }

    return () => {
      cleanup();
    };
  }, [isOpen, chatId]);

  const cleanup = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  const fetchContentAndGenerateAudio = async () => {
    setIsLoading(true);
    setContent("");
    setDisplayedText("");
    setIsPlaying(false);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    try {
      // Fetch content from the research API
      const response = await fetch(`${BACKEND_URL}/genai/getContent/${chatId}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const textContent = data.text_content?.[0] || "";

      if (!textContent) {
        throw new Error("No content found");
      }

      setContent(textContent);

      // Generate audio using ElevenLabs
      await generateAudio(textContent);

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching content or generating audio:", error);
      setIsLoading(false);
    }
  };

  const generateAudio = async (text: string) => {
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

    try {
      const ttsResponse = await fetch(
        "https://api.elevenlabs.io/v1/text-to-speech/zT03pEAEi0VHKciJODfn",
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: text,
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

      const audioBlob = await ttsResponse.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      // Create audio element
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
      };

      audio.onerror = () => {
        console.error("Audio playback error");
        setIsPlaying(false);
      };
    } catch (error) {
      console.error("ElevenLabs TTS error:", error);
    }
  };

  const startStreamingText = () => {
    if (!content || streamIntervalRef.current) return;

    const words = content.split(/(\s+)/).filter((word) => word.length > 0); // Split while keeping whitespace and filter empty strings
    let currentIndex = 0;

    setDisplayedText(words[0]);

    streamIntervalRef.current = setInterval(() => {
      if (currentIndex < words.length && words[currentIndex] !== undefined) {
        setDisplayedText((prev) => prev + words[currentIndex]);
        currentIndex++;
      } else {
        if (streamIntervalRef.current) {
          clearInterval(streamIntervalRef.current);
          streamIntervalRef.current = null;
        }
      }
    }, 100); // Adjust speed as needed (100ms per word/space)
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      startStreamingText();
    }
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Research Audio Playback
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-gray-600 dark:text-gray-400">
                Fetching content and generating audio...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Controls */}
              <div className="flex items-center justify-center">
                <button
                  onClick={handlePlayPause}
                  disabled={!audioRef.current}
                  className={`p-4 rounded-full transition-colors ${
                    isPlaying
                      ? "bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                      : "bg-blue-100 hover:bg-blue-200 text-blue-600 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
                  }`}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <VolumeX className="w-8 h-8" />
                  ) : (
                    <Volume2 className="w-8 h-8" />
                  )}
                </button>
              </div>

              {/* Text Content */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 max-h-64 overflow-y-auto">
                <div className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {displayedText || content}
                  {isPlaying && displayedText !== content && (
                    <span className="animate-pulse">|</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
