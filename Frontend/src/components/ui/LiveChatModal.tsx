import React, { useState } from 'react';
import { X, Mic, Waves } from 'lucide-react';
import AudioChat from './Gemini/AudioChat'; // Adjust the import path as necessary
export const LiveChatModal = ({ isOpen, onClose }) => {
  const [isChatActive, setIsChatActive] = useState(false);

  // This function will be passed to the child to handle closing
  const handleEndChat = () => {
    setIsChatActive(false); // Reset the state to show the "Start" screen next time
    onClose(); // Call the original onClose prop to close the modal
  };

  const handleStartChat = () => {
    setIsChatActive(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md h-[600px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Waves className="w-6 h-6 text-brand-primary" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Live Chat</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isChatActive ? 'Session active' : 'Ready to start'}
              </p>
            </div>
          </div>
          <button
            onClick={handleEndChat}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content Area: Conditionally renders the start screen or the active chat */}
        <div className="flex-1 overflow-y-auto p-4">
          {!isChatActive ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mb-4">
                <Mic className="w-8 h-8 text-brand-primary" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Start Voice Conversation
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Click the button below to begin your voice chat session.
              </p>
              <button
                onClick={handleStartChat}
                className="px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors"
              >
                Start Chat
              </button>
            </div>
          ) : (
            <AudioChat/>
          )}
        </div>
      </div>
    </div>
  );
};