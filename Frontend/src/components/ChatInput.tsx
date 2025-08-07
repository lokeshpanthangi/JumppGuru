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
  const [isHovered, setIsHovered] = useState(false);
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
    <div className={`relative ${centered ? 'w-full max-w-4xl mx-auto' : 'w-full'}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div 
          className={`relative flex items-center gap-3 rounded-xl shadow-md transition-all duration-300 ease-out transform ${
            centered ? 'p-6 shadow-elevated' : 'p-4'
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
          {/* Mode Selection Button */}
          <div className="relative flex items-center" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className={`flex-shrink-0 p-2 rounded-lg transition-all duration-300 ease-out transform hover:bg-button-secondary hover:scale-110 hover:rotate-12 active:scale-95 ${getModeColor()} self-center ${
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

          {/* Input Field */}
          <div className="flex-1 relative flex items-center">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={getPlaceholder()}
              className={`w-full bg-transparent text-text-primary placeholder:text-text-muted resize-none outline-none overflow-y-auto scrollbar-thin transition-all duration-300 ease-out flex items-center ${
                centered ? 'min-h-[36px] max-h-48 text-lg leading-9' : 'min-h-[24px] max-h-32 leading-6'
              } ${
                isFocused ? 'transform scale-[1.01]' : ''
              }`}
              rows={centered ? 2 : 1}
              disabled={state.isTyping}
              style={{ paddingTop: centered ? '8px' : '4px', paddingBottom: centered ? '8px' : '4px' }}
            />
            
            {/* Clear Mode Button */}
            {state.currentMode && (
              <button
                type="button"
                onClick={() => setMode(null)}
                className="absolute top-1 right-1 p-1 text-text-muted hover:text-text-secondary transition-all duration-200 ease-out transform hover:scale-125 hover:rotate-90 active:scale-90 rounded-full hover:bg-button-secondary"
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
            className={`flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ease-out self-center group ${
              centered ? 'w-12 h-12' : 'w-10 h-10'
            } ${
              message.trim() && !state.isTyping
                ? 'bg-brand-primary hover:bg-brand-primary-hover text-white shadow-md hover:shadow-xl transform hover:scale-110 hover:rotate-12 active:scale-95 active:rotate-0'
                : 'bg-button-secondary text-text-muted cursor-not-allowed transform scale-90 opacity-60'
            }`}
            aria-label="Send message"
          >
            <Zap className={`${centered ? 'w-5 h-5' : 'w-4 h-4'} transition-all duration-300 ${
              message.trim() && !state.isTyping ? 'group-hover:scale-110' : ''
            }`} />
          </button>
        </div>


      </form>
    </div>
  );
};