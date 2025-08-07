import React, { useEffect, useRef, useState } from 'react';
import { Search, Globe } from 'lucide-react';
import { useChatContext } from '../contexts/ChatContext';
import { ChatInput } from './ChatInput';
import { TextShimmer } from './ui/text-shimmer';

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

  return (
    <div 
      className={`flex-1 flex flex-col bg-chat-bg transition-all duration-500 ease-in-out h-screen ${
        state.sidebarCollapsed ? 'ml-16' : 'ml-80'
      }`}
    >
      {showCenteredInput && !hasMessages ? (
        /* Welcome Screen */
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-8">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-6">
              <span className="gradient-welcome">
                {getTimeOfDayGreeting()}, {state.userName}
              </span>
            </h1>
            <p className="text-xl text-text-secondary mb-12">
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
                    <div className="space-y-3">
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
                    <TextShimmer 
                      className="text-text-primary text-base"
                      duration={1.5}
                    >
                      Generating response...
                    </TextShimmer>
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