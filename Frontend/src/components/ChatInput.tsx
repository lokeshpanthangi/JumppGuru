import React, { useState, useRef, useEffect } from 'react';
import { Send, Pin, Search, Globe, X, Zap } from 'lucide-react';
import { useChatContext, type ChatMode } from '../contexts/ChatContext';

interface ChatInputProps {
  centered?: boolean;
  onMessageSent?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ centered = false, onMessageSent }) => {
  const { state, sendMessage, setMode } = useChatContext();
  const [message, setMessage] = useState('');
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
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

  const getPlaceholder = () => {
    switch (state.currentMode) {
      case 'web':
        return 'Search the web...';
      case 'research':
        return 'Research a topic...';
      default:
        return 'Type your message...';
    }
  };

  const ModeIcon = getModeIcon();

  return (
    <div className={`relative ${centered ? 'w-full max-w-2xl mx-auto' : 'w-full'}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className={`relative flex items-end gap-3 p-4 transition-all duration-300 rounded-xl shadow-md ${
          centered ? 'shadow-elevated' : ''
        } ${
          isFocused || message.trim() 
            ? 'bg-surface-elevated border-2 border-brand-primary' 
            : 'bg-surface-elevated border border-input-border'
        }`}>
          {/* Mode Selection Button */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className={`flex-shrink-0 p-2 rounded-lg transition-colors duration-fast hover:bg-button-secondary ${getModeColor()}`}
              aria-label="Select mode"
            >
              <ModeIcon className="w-5 h-5" />
            </button>

            {/* Mode Dropdown */}
            {showModeDropdown && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-surface-elevated border border-input-border rounded-lg shadow-lg overflow-hidden z-10">
                <button
                  type="button"
                  onClick={() => handleModeSelect('web')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-button-secondary transition-colors duration-fast ${
                    state.currentMode === 'web' ? 'bg-sidebar-item-active' : ''
                  }`}
                >
                  <Search className="w-4 h-4 text-brand-primary" />
                  <div>
                    <div className="text-sm font-medium text-text-primary">Web Search</div>
                    <div className="text-xs text-text-muted">Search across the internet</div>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleModeSelect('research')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-button-secondary transition-colors duration-fast ${
                    state.currentMode === 'research' ? 'bg-sidebar-item-active' : ''
                  }`}
                >
                  <Globe className="w-4 h-4 text-brand-primary" />
                  <div>
                    <div className="text-sm font-medium text-text-primary">Research</div>
                    <div className="text-xs text-text-muted">Deep research and analysis</div>
                  </div>
                </button>
              </div>
            )}
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
              placeholder={getPlaceholder()}
              className="w-full bg-transparent text-text-primary placeholder:text-text-muted resize-none outline-none min-h-[24px] max-h-32 overflow-y-auto scrollbar-thin"
              rows={1}
              disabled={state.isTyping}
            />
            
            {/* Clear Mode Button */}
            {state.currentMode && (
              <button
                type="button"
                onClick={() => setMode(null)}
                className="absolute top-1 right-1 p-1 text-text-muted hover:text-text-secondary transition-colors duration-fast"
                aria-label="Clear mode"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!message.trim() || state.isTyping}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
              message.trim() && !state.isTyping
                ? 'bg-brand-primary hover:bg-brand-primary-hover text-white shadow-md hover:shadow-lg transform hover:scale-105 hover:rotate-12'
                : 'bg-button-secondary text-text-muted cursor-not-allowed'
            }`}
            aria-label="Send message"
          >
            <Zap className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Indicator */}
        {state.currentMode && (
          <div className="absolute -top-8 left-4 flex items-center gap-2 px-3 py-1 bg-surface-elevated border border-input-border rounded-full text-xs">
            <ModeIcon className="w-3 h-3 text-brand-primary" />
            <span className="text-text-secondary">
              {state.currentMode === 'web' ? 'Web Search' : 'Research'} mode
            </span>
          </div>
        )}
      </form>
    </div>
  );
};