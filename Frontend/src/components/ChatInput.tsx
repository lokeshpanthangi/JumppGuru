import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Waves, Paperclip, Pin, Search, Globe, Mic, X, MicOff } from 'lucide-react';
import { useChatContext, type ChatMode } from '../contexts/ChatContext';
import { useLiveKit } from '../hooks/useLiveKit';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface ChatInputProps {
  centered?: boolean;
  onMessageSent?: () => void;
}

export interface ChatInputRef {
  focusAndSubmit: () => void;
  focus: () => void;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(({ centered = false, onMessageSent }, ref) => {
  const { state, sendMessage, setMode, toggleAurora, toggleLiveMode, addAIMessage } = useChatContext();
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Speech Recognition
  const speechRecognition = useSpeechRecognition();

  // Auto-resize textarea function
  const autoResizeTextarea = () => {
    if (inputRef.current) {
      // Reset height to auto to get the correct scrollHeight
      inputRef.current.style.height = 'auto';
      
      // Calculate the new height based on content
      const scrollHeight = inputRef.current.scrollHeight;
      const minHeight = centered ? 36 : 24; // min-h-[36px] or min-h-[24px]
      const maxHeight = centered ? 120 : 80; // Reduced max height for better UX
      
      // Set the height, but don't exceed maxHeight
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      inputRef.current.style.height = `${newHeight}px`;
    }
  };

  // Auto-resize on message change
  useEffect(() => {
    autoResizeTextarea();
  }, [message, centered]);

  // Update input field with speech recognition transcript
  useEffect(() => {
    if (speechRecognition.transcript && speechRecognition.isListening) {
      setMessage(speechRecognition.transcript);
    }
  }, [speechRecognition.transcript, speechRecognition.isListening]);

  // Handle speech recognition errors
  useEffect(() => {
    if (speechRecognition.error) {
      setNotificationMessage(speechRecognition.error);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
  }, [speechRecognition.error]);

  // Focus input field when speech recognition stops
  useEffect(() => {
    if (!speechRecognition.isListening && speechRecognition.transcript && inputRef.current) {
      inputRef.current.focus();
      // Position cursor at the end of the text
      const length = speechRecognition.transcript.length;
      inputRef.current.setSelectionRange(length, length);
    }
  }, [speechRecognition.isListening, speechRecognition.transcript]);

  // Check if current chat has used research mode
  const hasUsedResearchMode = state.currentChat?.hasUsedResearchMode || false;

  // If current mode is research but it's already been used, switch to null
  useEffect(() => {
    if (state.currentMode === 'research' && hasUsedResearchMode) {
      setMode(null);
    }
  }, [hasUsedResearchMode, state.currentMode, setMode]);

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
    
    // Reset textarea height after clearing message
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        autoResizeTextarea();
      }
    }, 0);
    
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

  const handleVoiceClick = () => {
    if (!speechRecognition.supported) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (speechRecognition.isListening) {
      speechRecognition.stopListening();
    } else {
      speechRecognition.resetTranscript();
      speechRecognition.startListening();
    }
  };

  const handleModeSelect = (mode: ChatMode) => {
    // Check if trying to select research mode when it's already used
    if (mode === 'research' && hasUsedResearchMode) {
      setNotificationMessage('Research limit reached. Try creating a new chat.');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      setShowModeDropdown(false);
      return;
    }

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
        return Globe;
      case 'research':
        return Search;
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

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    focusAndSubmit: () => {
      // Focus the input first
      inputRef.current?.focus();
      
      // If there's content, submit it
      if (message.trim()) {
        handleSubmit(new Event('submit') as any);
      }
    },
    focus: () => {
      inputRef.current?.focus();
    }
  }), [message, handleSubmit]);

  return (
    <div className={`relative ${centered ? 'w-full max-w-2xl mx-auto' : 'w-full max-w-4xl mx-auto'}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div 
          className={`relative flex items-end gap-3 rounded-3xl transition-all duration-200 ease-out transform backdrop-blur-md ${
            centered ? 'px-3 py-2.5' : 'px-2 py-1.5'
          } ${
            isFocused
              ? 'bg-[hsl(var(--input-field-bg)/0.95)] border-2 border-brand-primary scale-[1.02]'
              : 'bg-[hsl(var(--input-field-bg)/0.85)] border border-input-border/50 scale-100'
          }`}
          style={{
            position: 'relative',
            transformOrigin: 'bottom center'
          }}
        >
          {/* Left Buttons */}
          <div className="flex items-center gap-2 self-center">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={handleAttachment}
              className="flex-shrink-0 p-2 rounded-full transition-all duration-300 ease-out transform hover:bg-button-secondary hover:scale-110 active:scale-95 text-text-secondary hover:text-text-primary flex items-center justify-center"
              aria-label="Attach file"
            >
              <Paperclip className="w-5 h-5 transition-all duration-300" />
            </button>

            {/* Mode Selection Button */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowModeDropdown(!showModeDropdown)}
                className={`flex-shrink-0 p-2 rounded-full transition-all duration-300 ease-out transform hover:bg-button-secondary hover:scale-110 active:scale-95 flex items-center justify-center ${getModeColor()} hover:text-text-primary ${
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
                    <Globe className="w-4 h-4 text-brand-primary" />
                    <span className="text-sm text-text-primary">Web Search</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleModeSelect('research')}
                    disabled={hasUsedResearchMode}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                      hasUsedResearchMode 
                        ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700' 
                        : 'hover:bg-button-secondary'
                    } ${
                      state.currentMode === 'research' ? 'bg-sidebar-item-active' : ''
                    }`}
                  >
                    <Search className={`w-4 h-4 ${hasUsedResearchMode ? 'text-gray-400' : 'text-brand-primary'}`} />
                    <span className={`text-sm ${hasUsedResearchMode ? 'text-gray-400' : 'text-text-primary'}`}>
                      Research {hasUsedResearchMode ? '(Used)' : ''}
                    </span>
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
              onChange={(e) => {
                setMessage(e.target.value);
                // Trigger auto-resize after state update
                setTimeout(autoResizeTextarea, 0);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Let's make it work"
              className={`w-full bg-transparent text-text-primary placeholder:text-text-muted resize-none outline-none overflow-y-auto transition-all duration-200 ease-out scrollbar-hide ${
                centered ? 'min-h-[36px] text-lg leading-relaxed py-1' : 'min-h-[24px] leading-6 py-0'
              } ${
                isFocused ? 'transform scale-[1.01]' : ''
              }`}
              rows={1}
              disabled={state.isTyping}
              style={{ 
                height: 'auto',
                overflowY: 'auto',
                scrollbarWidth: 'none', /* Firefox */
                msOverflowStyle: 'none' /* Internet Explorer and Edge */
              }}
            />
          </div>

          {/* Voice Button */}
          <button
            type="button"
            onClick={handleVoiceClick}
            disabled={!speechRecognition.supported}
            className={`flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ease-out group ${
              centered ? 'w-12 h-12' : 'w-10 h-10'
            } ${
              speechRecognition.isListening
                ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg animate-pulse'
                : speechRecognition.supported
                ? 'bg-button-secondary hover:bg-brand-primary text-text-secondary hover:text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            } shadow-md hover:shadow-xl transform hover:scale-110 active:scale-95 ${
              !speechRecognition.supported ? 'hover:scale-100' : ''
            }`}
            aria-label={
              speechRecognition.isListening 
                ? "Stop voice input" 
                : speechRecognition.supported 
                ? "Start voice input"
                : "Voice input not supported"
            }
            title={
              !speechRecognition.supported 
                ? "Speech recognition not supported in this browser"
                : speechRecognition.isListening
                ? "Click to stop recording"
                : "Click to start voice input"
            }
          >
            {speechRecognition.isListening ? (
              <MicOff className={`${centered ? 'w-5 h-5' : 'w-4 h-4'} transition-all duration-300 group-hover:scale-110`} />
            ) : (
              <Mic className={`${centered ? 'w-5 h-5' : 'w-4 h-4'} transition-all duration-300 group-hover:scale-110`} />
            )}
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

      {/* Notifications */}
      {showNotification && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in ${
          notificationMessage.includes('error') || notificationMessage.includes('Error')
            ? 'bg-red-500 text-white'
            : 'bg-blue-500 text-white'
        }`}>
          {notificationMessage || 'Research limit reached. Try creating a new chat.'}
        </div>
      )}

      {/* Voice Recognition Status */}
      {speechRecognition.isListening && (
        <div className="fixed top-16 right-4 bg-red-500 text-white px-3 py-1 rounded-full shadow-lg z-50 flex items-center gap-2 animate-fade-in">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-sm">Listening...</span>
        </div>
      )}
    </div>
  );
});

// Add display name for better debugging
ChatInput.displayName = 'ChatInput';
