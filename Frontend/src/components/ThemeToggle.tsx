import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useChatContext } from '../contexts/ChatContext';

export const ThemeToggle: React.FC = () => {
  const { state, setTheme } = useChatContext();

  const toggleTheme = () => {
    setTheme(state.theme === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 p-3 bg-surface-elevated border border-input-border rounded-lg shadow-md hover:shadow-lg transition-all duration-normal group"
      aria-label="Toggle theme"
    >
      <div className="relative w-5 h-5">
        <Sun 
          className={`absolute inset-0 w-5 h-5 text-text-primary transition-all duration-normal ${
            state.theme === 'light' 
              ? 'opacity-100 rotate-0' 
              : 'opacity-0 rotate-90'
          }`} 
        />
        <Moon 
          className={`absolute inset-0 w-5 h-5 text-text-primary transition-all duration-normal ${
            state.theme === 'dark' 
              ? 'opacity-100 rotate-0' 
              : 'opacity-0 -rotate-90'
          }`} 
        />
      </div>
    </button>
  );
};