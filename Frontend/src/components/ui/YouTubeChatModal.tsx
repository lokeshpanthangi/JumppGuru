import React, { useState, useEffect, useRef } from 'react';
import { X, MessageCircle, Video, Maximize2, Minimize2, Send, Mic, MicOff } from 'lucide-react';
import { useLiveKit } from '../../hooks/useLiveKit';
import { youtubeAnalysisService } from '../../services/youtubeAnalysis';

interface YouTubeChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

type ViewMode = 'split' | 'video-only' | 'chat-only';

export const YouTubeChatModal: React.FC<YouTubeChatModalProps> = ({ 
  isOpen, 
  onClose, 
  videoUrl, 
  title 
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isMobile, setIsMobile] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // LiveKit integration for voice chat
  const {
    isConnected,
    isListening,
    isSpeaking,
    connect,
    disconnect,
    startListening,
    stopListening,
    conversationHistory
  } = useLiveKit();

  // Helper function to extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };



  // Initialize chat when modal opens
  useEffect(() => {
    if (isOpen) {
      // Add initial welcome message without analyzing video
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        content: `I'm ready to discuss this video: "${title}". What would you like to know about it?`,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, title]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message with video URL to Gemini
  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Convert messages to conversation history format
      const conversationHistory = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Send both the user question and video URL to Gemini
      const response = await youtubeAnalysisService.sendContextualMessage(
        message,
        videoUrl,
        conversationHistory
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleVoiceToggle = async () => {
    if (!isConnected) {
      await connect();
    }
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };





  // Handle responsive design
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && viewMode === 'split') {
        setViewMode('video-only');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [viewMode]);



  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-all duration-200 z-10"
        aria-label="Close modal"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* View mode toggle buttons */}
      <div className="absolute top-6 left-6 flex gap-2 z-10">
        {!isMobile ? (
          <>
            <button
              onClick={() => setViewMode('split')}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === 'split' 
                  ? 'bg-brand-primary text-white' 
                  : 'bg-black bg-opacity-50 text-white hover:bg-opacity-70'
              }`}
              title="Split view"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('video-only')}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === 'video-only' 
                  ? 'bg-brand-primary text-white' 
                  : 'bg-black bg-opacity-50 text-white hover:bg-opacity-70'
              }`}
              title="Video only"
            >
              <Video className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('chat-only')}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === 'chat-only' 
                  ? 'bg-brand-primary text-white' 
                  : 'bg-black bg-opacity-50 text-white hover:bg-opacity-70'
              }`}
              title="Chat only"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setViewMode(viewMode === 'video-only' ? 'chat-only' : 'video-only')}
            className="p-2 rounded-lg bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all duration-200"
            title={viewMode === 'video-only' ? 'Switch to chat' : 'Switch to video'}
          >
            {viewMode === 'video-only' ? <MessageCircle className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Main content */}
      <div className={`relative bg-surface-elevated rounded-lg overflow-hidden shadow-2xl w-full max-h-[85vh] flex ${
        isMobile ? 'flex-col max-w-sm' : 'max-w-6xl'
      }`}>
        {/* Video Section */}
        {(viewMode === 'split' || viewMode === 'video-only') && (
          <div className={`${viewMode === 'split' ? 'flex-1 max-w-3xl' : 'w-full'} bg-black flex flex-col`}>
            <div className="p-4 bg-surface-elevated border-b border-input-border">
              <h2 className="text-lg font-semibold text-text-primary truncate">{title}</h2>
            </div>
            <div className="flex-1 relative">
              {getYouTubeVideoId(videoUrl) ? (
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeVideoId(videoUrl)}?autoplay=0&rel=0&modestbranding=1`}
                  title={title}
                  className="w-full h-full min-h-[400px]"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="flex-1 relative flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-900 to-purple-900">
                  <div className="text-center text-white space-y-4">
                    <div className="w-24 h-24 mx-auto bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <p className="text-blue-200 text-sm max-w-md">
                      Video URL: {videoUrl}
                    </p>
                    <p className="text-white text-opacity-80 text-sm">
                      Invalid YouTube URL. Please provide a valid YouTube link.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Section */}
        {(viewMode === 'split' || viewMode === 'chat-only') && (
          <div className={`${viewMode === 'split' ? 'w-96' : 'w-full'} bg-surface-primary flex flex-col border-l border-input-border`}>
            {/* Chat Header */}
            <div className="p-4 border-b border-input-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">AI Chat</h3>

                </div>
                <button
                  onClick={handleVoiceToggle}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    isListening 
                      ? 'bg-red-500 text-white' 
                      : isConnected 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-500 text-white hover:bg-gray-600'
                  }`}
                  title={isListening ? 'Stop listening' : 'Start voice chat'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-sm text-text-muted mt-1">Ask questions about the video content</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-brand-primary text-white'
                        : 'bg-surface-elevated border border-input-border text-text-primary'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface-elevated border border-input-border text-text-primary p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-2 border-t border-input-border bg-surface-elevated">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => sendMessage('What is this video about?')}
                  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs rounded-full transition-colors"
                  disabled={isLoading}
                >
                  What's this about?
                </button>
                <button
                  onClick={() => sendMessage('Summarize the key points of this video')}
                  className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 text-xs rounded-full transition-colors"
                  disabled={isLoading}
                >
                  Summarize video
                </button>
                <button
                  onClick={() => sendMessage('What are the main takeaways from this video?')}
                  className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs rounded-full transition-colors"
                  disabled={isLoading}
                >
                  Key takeaways
                </button>
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-input-border">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask about the video..."
                  className="flex-1 px-3 py-2 bg-surface-elevated border border-input-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  disabled={isLoading}
                />

                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};