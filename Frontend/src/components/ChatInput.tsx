import React, { useState, useRef, useEffect } from 'react';
import { Waves, Paperclip, Pin, Search, Globe, Mic, X } from 'lucide-react';
import { useChatContext, type ChatMode } from '../contexts/ChatContext';
import { useLiveKit } from '../hooks/useLiveKit';

interface ChatInputProps {
  centered?: boolean;
  onMessageSent?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ centered = false, onMessageSent }) => {
  const { state, sendMessage, setMode, toggleAurora, toggleLiveMode, addAIMessage } = useChatContext();
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // LiveKit integration
  const liveKit = useLiveKit({
    onMessage: async (message: string) => {
      // Handle incoming messages and add them to chat
      console.log('LiveKit message received:', message);
      addAIMessage(message);
    },
    onStatusChange: (status: string) => {
      console.log('LiveKit status:', status);
    },
    onError: (error: string) => {
      console.error('LiveKit error:', error);
    }
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || state.isTyping) return;

    const messageToSend = message.trim();
    setMessage('');
    await sendMessage(messageToSend, state.currentMode);
    onMessageSent?.();
    
    // Refocus the input field after sending the message
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleWavesClick = () => {
    if (!state.isLiveMode) {
      // Start live mode with direct streaming connection
      liveKit.startStreaming();
      toggleLiveMode();
      toggleAurora();
    }
    // If already in live mode, do nothing - only exit button can stop it
  };

  const handleExitLiveMode = () => {
    // Exit live mode completely and stop aurora
    liveKit.stopStreaming();
    liveKit.disconnect();
    toggleLiveMode();
    toggleAurora();
  };

  const handleAttachment = () => {
    // Handle file attachment
    console.log('Attachment clicked');
  };

  const handleModeSelect = (mode: ChatMode) => {
    if (state.currentMode === mode) {
      setMode(null);
    } else {
      setMode(mode);
    }
    setShowModeDropdown(false);
  };

  const getModeIcon = () => {
    switch (state.currentMode) {
      case 'web':
        return Search;
      case 'research':
        return Globe;
      default:
        return Pin;
    }
  };

  const getModeColor = () => {
    if (state.currentMode) {
      return 'text-brand-primary';
    }
    return 'text-text-secondary';
  };

  const ModeIcon = getModeIcon();

  return (
    <div className={`relative ${centered ? 'w-full max-w-4xl mx-auto' : 'w-full'}`}>
      {/* Live Mode Status */}
      {state.isLiveMode && (
        <div className="mb-3 p-3 bg-surface-elevated border border-brand-primary rounded-lg">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              liveKit.state.isStreaming ? 'bg-green-500 animate-pulse' : 
              liveKit.state.isConnected ? 'bg-blue-500' : 'bg-yellow-500'
            }`} />
            <span className="text-sm font-medium text-text-primary">
              {liveKit.state.isStreaming ? '🎤 Live Connection Active' : 
               liveKit.state.isConnected ? '🔗 Connected to LiveKit' : 
               '⏳ Connecting...'}
            </span>
          </div>
          {liveKit.state.status && (
            <p className="text-xs text-text-muted mt-1">{liveKit.state.status}</p>
          )}
          {liveKit.state.error && (
            <p className="text-xs text-red-500 mt-1">{liveKit.state.error}</p>
          )}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="relative">
        <div 
          className={`relative flex items-center gap-3 rounded-3xl shadow-md transition-all duration-300 ease-out transform ${
            centered ? 'p-4 shadow-elevated' : 'p-3'
          } ${
            isFocused
              ? 'bg-surface-elevated border-2 border-green-400 scale-[1.02] shadow-lg'
              : isHovered
              ? 'bg-surface-elevated border border-input-border scale-[1.01] shadow-lg'
              : 'bg-surface-elevated border border-input-border scale-100'
          }`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Left Buttons */}
          <div className="flex items-center gap-2">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={handleAttachment}
              className="flex-shrink-0 p-2 rounded-full transition-all duration-300 ease-out transform hover:bg-button-secondary hover:scale-110 active:scale-95 text-text-secondary hover:text-text-primary"
              aria-label="Attach file"
            >
              <Paperclip className="w-5 h-5 transition-all duration-300" />
            </button>

            {/* Mode Selection Button */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowModeDropdown(!showModeDropdown)}
                className={`flex-shrink-0 p-2 rounded-full transition-all duration-300 ease-out transform hover:bg-button-secondary hover:scale-110 active:scale-95 ${getModeColor()} hover:text-text-primary ${
                  showModeDropdown ? 'scale-110 bg-button-secondary' : ''
                }`}
                aria-label="Select mode"
              >
                <ModeIcon className={`w-5 h-5 transition-all duration-300 ${
                  showModeDropdown ? 'rotate-180' : ''
                }`} />
              </button>

              {/* Mode Dropdown */}
              {showModeDropdown && (
                <div className="absolute bottom-full left-0 mb-2 w-40 bg-surface-elevated border border-input-border rounded-lg shadow-lg overflow-hidden z-10">
                  <button
                    type="button"
                    onClick={() => handleModeSelect('web')}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-button-secondary transition-colors ${
                      state.currentMode === 'web' ? 'bg-sidebar-item-active' : ''
                    }`}
                  >
                    <Search className="w-4 h-4 text-brand-primary" />
                    <span className="text-sm text-text-primary">Web Search</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleModeSelect('research')}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-button-secondary transition-colors ${
                      state.currentMode === 'research' ? 'bg-sidebar-item-active' : ''
                    }`}
                  >
                    <Globe className="w-4 h-4 text-brand-primary" />
                    <span className="text-sm text-text-primary">Research</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Input Field */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Type your message..."
              className={`w-full bg-transparent text-text-primary placeholder:text-text-muted resize-none outline-none overflow-y-auto scrollbar-thin transition-all duration-300 ease-out ${
                centered ? 'min-h-[36px] max-h-48 text-lg leading-relaxed py-2' : 'min-h-[24px] max-h-32 leading-6 py-1'
              } ${
                isFocused ? 'transform scale-[1.01]' : ''
              }`}
              rows={1}
              disabled={state.isTyping}
            />
          </div>

          {/* Voice Button */}
          <button
            type="button"
            className={`flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ease-out group ${
              centered ? 'w-12 h-12' : 'w-10 h-10'
            } bg-button-secondary hover:bg-brand-primary text-text-secondary hover:text-white shadow-md hover:shadow-xl transform hover:scale-110 active:scale-95`}
            aria-label="Voice input"
          >
            <Mic className={`${centered ? 'w-5 h-5' : 'w-4 h-4'} transition-all duration-300 group-hover:scale-110`} />
          </button>

          {/* Live Mode Toggle Button */}
          <button
            type="button"
            onClick={state.isLiveMode ? handleExitLiveMode : handleWavesClick}
            className={`flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-500 ease-in-out group ${
              centered ? 'w-12 h-12' : 'w-10 h-10'
            } ${
              state.isLiveMode 
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-button-secondary hover:bg-brand-primary text-brand-primary hover:text-white'
            } shadow-md hover:shadow-xl transform hover:scale-110 active:scale-95`}
            aria-label={state.isLiveMode ? "Exit Live Mode" : "Start Live Mode"}
          >
            {state.isLiveMode ? (
              <X className={`${centered ? 'w-5 h-5' : 'w-4 h-4'} transition-all duration-500 group-hover:scale-110`} />
            ) : (
              <Waves className={`${centered ? 'w-5 h-5' : 'w-4 h-4'} transition-all duration-500 group-hover:scale-110`} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
