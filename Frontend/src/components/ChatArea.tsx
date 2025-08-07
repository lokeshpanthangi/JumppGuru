import React, { useEffect, useRef, useState } from 'react';
import { Search, Globe, Copy, ThumbsUp, ThumbsDown, Volume2, VolumeX } from 'lucide-react';
import { useChatContext } from '../contexts/ChatContext';
import { ChatInput } from './ChatInput';
import { TypingAnimation } from './ui/typing-animation';

const getTimeOfDayGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatMessageTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

export const ChatArea: React.FC = () => {
  const { state } = useChatContext();
  const [showCenteredInput, setShowCenteredInput] = useState(true);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set());
  const [dislikedMessages, setDislikedMessages] = useState<Set<string>>(new Set());
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const hasMessages = state.currentChat?.messages.length ?? 0 > 0;

  useEffect(() => {
    if (hasMessages) {
      setShowCenteredInput(false);
    } else {
      setShowCenteredInput(true);
    }
  }, [hasMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.currentChat?.messages]);

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
      case 'web':
        return <Search className="w-3 h-3" />;
      case 'research':
        return <Globe className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    setNotification('Copied');
    setTimeout(() => setNotification(null), 2000);
  };

  const handleLikeMessage = (messageId: string) => {
    setLikedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        // Remove from disliked if it was disliked
        setDislikedMessages(prevDisliked => {
          const newDislikedSet = new Set(prevDisliked);
          newDislikedSet.delete(messageId);
          return newDislikedSet;
        });
      }
      return newSet;
    });
  };

  const handleDislikeMessage = (messageId: string) => {
    setDislikedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        // Remove from liked if it was liked
        setLikedMessages(prevLiked => {
          const newLikedSet = new Set(prevLiked);
          newLikedSet.delete(messageId);
          return newLikedSet;
        });
      }
      return newSet;
    });
  };

  const handleSpeakMessage = (content: string, messageId: string) => {
    if ('speechSynthesis' in window) {
      if (playingVoice === messageId) {
        // Stop current speech
        speechSynthesis.cancel();
        setPlayingVoice(null);
      } else {
        // Stop any current speech and start new one
        speechSynthesis.cancel();
        setPlayingVoice(messageId);
        
        const utterance = new SpeechSynthesisUtterance(content);
        utterance.onend = () => setPlayingVoice(null);
        utterance.onerror = () => setPlayingVoice(null);
        speechSynthesis.speak(utterance);
      }
    }
  };

  return (
    <div 
      className={`flex-1 flex flex-col bg-chat-bg transition-all duration-500 ease-in-out h-screen ${
        state.sidebarCollapsed ? 'ml-16' : 'ml-80'
      }`}
    >
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          {notification}
        </div>
      )}
      {showCenteredInput && !hasMessages ? (
        /* Welcome Screen */
        <div className="flex-1 flex flex-col items-center justify-start min-h-screen p-8 pt-48">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-6">
              <span className="gradient-welcome">
                {getTimeOfDayGreeting()}, {state.userName}
              </span>
            </h1>
            <p className="text-xl text-text-secondary mb-6">
              What would you like to explore today?
            </p>
          </div>
          
          <div className="w-full max-w-3xl">
            <ChatInput centered onMessageSent={handleMessageSent} />
          </div>
        </div>
      ) : (
        /* Active Chat */
        <div className="flex-1 flex flex-col h-full">
          {/* Messages Container */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6 min-h-0"
          >
            {state.currentChat?.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] ${
                    message.type === 'user'
                      ? 'bg-chat-message-user text-white rounded-2xl rounded-br-md px-4 py-3'
                      : 'bg-transparent text-text-primary'
                  }`}
                >
                  {message.type === 'user' ? (
                    <div>
                      {message.mode && (
                        <div className="flex items-center gap-2 mb-2 text-white/80 text-sm">
                          {getModeIcon(message.mode)}
                          <span>
                            {message.mode === 'web' ? 'Web Search' : 'Research'}
                          </span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <div className="text-xs text-white/70 mt-2">
                        {formatMessageTime(message.timestamp)}
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="space-y-3 group relative"
                      onMouseEnter={() => setHoveredMessageId(message.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white">
                          <img src="/logo.png" alt="JumppGuru Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="font-medium text-text-primary">JumppGuru</span>
                        <span className="text-xs text-text-muted">
                          {formatMessageTime(message.timestamp)}
                        </span>
                      </div>
                      <div className="prose max-w-none">
                        <p className="text-text-primary whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                      
                      {/* Action Buttons - Always reserve space but only visible on hover */}
                      <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
                              ? 'text-green-500 bg-green-100 dark:bg-green-900/20' 
                              : 'text-text-muted hover:text-green-500'
                          }`}
                          title={likedMessages.has(message.id) ? 'Unlike' : 'Like'}
                        >
                          <ThumbsUp className={`w-4 h-4 ${likedMessages.has(message.id) ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleDislikeMessage(message.id)}
                          className={`p-2 rounded-lg hover:bg-button-secondary transition-colors duration-200 ${
                            dislikedMessages.has(message.id) 
                              ? 'text-red-500 bg-red-100 dark:bg-red-900/20' 
                              : 'text-text-muted hover:text-red-500'
                          }`}
                          title={dislikedMessages.has(message.id) ? 'Remove dislike' : 'Dislike'}
                        >
                          <ThumbsDown className={`w-4 h-4 ${dislikedMessages.has(message.id) ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleSpeakMessage(message.content, message.id)}
                          className={`p-2 rounded-lg hover:bg-button-secondary transition-colors duration-200 ${
                            playingVoice === message.id 
                              ? 'text-blue-500 bg-blue-100 dark:bg-blue-900/20' 
                              : 'text-text-muted hover:text-blue-500'
                          }`}
                          title={playingVoice === message.id ? 'Stop reading' : 'Read aloud'}
                        >
                          {playingVoice === message.id ? (
                            <VolumeX className="w-4 h-4 animate-pulse" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {state.isTyping && (
              <div className="flex justify-start">
                <div className="bg-transparent text-text-primary max-w-[80%]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white">
                      <img src="/logo.png" alt="JumppGuru Logo" className="w-full h-full object-contain" />
                    </div>
                    <span className="font-medium text-text-primary">JumppGuru</span>
                  </div>
                  <div className="prose max-w-none">
                    <TypingAnimation className="text-base" />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Fixed at bottom */}
          <div className="flex-shrink-0 bg-chat-bg p-6">
            <ChatInput onMessageSent={handleMessageSent} />
          </div>
        </div>
      )}
    </div>
  );
};