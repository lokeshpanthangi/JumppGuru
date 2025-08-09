import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useChatContext } from '@/contexts/ChatContext';
import type { Chat, Message } from '@/contexts/ChatContext';

type Category = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

type SelectedMessage = {
  chatId: string;
  messageId: string;
  content: string;
  chatTitle: string;
};

interface NotebookCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: { category: Category; messages: SelectedMessage[]; name: string }) => void;
}

const categories: Category[] = [
  {
    id: 'coding',
    name: 'Coding',
    description: 'Programming, development, and technical discussions',
    icon: '💻'
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Financial analysis, investments, and market insights',
    icon: '💰'
  },
  {
    id: 'studying',
    name: 'Studying',
    description: 'Educational content, learning materials, and research',
    icon: '📚'
  },
  {
    id: 'general-knowledge',
    name: 'General Knowledge',
    description: 'Broad topics, facts, and general information',
    icon: '🧠'
  },
  {
    id: 'science',
    name: 'Science',
    description: 'Scientific research, experiments, and discoveries',
    icon: '🔬'
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Business strategy, entrepreneurship, and management',
    icon: '📊'
  },
  {
    id: 'health',
    name: 'Health & Wellness',
    description: 'Health tips, medical information, and wellness advice',
    icon: '🏥'
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Art, design, writing, and creative projects',
    icon: '🎨'
  }
];

export const NotebookCreationModal: React.FC<NotebookCreationModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const { state } = useChatContext();
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<SelectedMessage[]>([]);
  const [notebookName, setNotebookName] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedCategory(null);
      setSelectedChat(null);
      setSelectedMessages([]);
      setNotebookName('');
    }
  }, [isOpen]);

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
  };

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    setStep(3); // Directly go to message selection
  };

  const handleMessageToggle = (message: Message) => {
    if (!selectedChat) return;

    const messageData: SelectedMessage = {
      chatId: selectedChat.id,
      messageId: message.id,
      content: message.content,
      chatTitle: selectedChat.title
    };

    const isSelected = selectedMessages.some(m => m.messageId === message.id);
    
    if (isSelected) {
      setSelectedMessages(prev => prev.filter(m => m.messageId !== message.id));
    } else if (selectedMessages.length < 10) {
      setSelectedMessages(prev => [...prev, messageData]);
    }
  };

  const handleNext = () => {
    if (step === 1 && selectedCategory) {
      setStep(2);
    } else if (step === 2 && selectedChat) {
      setStep(4);
      // Auto-generate name if not provided
      if (!notebookName) {
        setNotebookName(`${selectedCategory?.name} Notebook`);
      }
    } else if (step === 3 && selectedMessages.length > 0) {
      setStep(4);
      // Auto-generate name if not provided
      if (!notebookName) {
        setNotebookName(`${selectedCategory?.name} Notebook`);
      }
    }
  };

  const handleBack = () => {
    if (step === 4) {
      setStep(3);
    } else if (step === 3) {
      setStep(2);
      setSelectedChat(null);
    } else if (step === 2) {
      setStep(1);
    }
  };

  const handleComplete = () => {
    if (selectedCategory && selectedMessages.length > 0 && notebookName.trim()) {
      onComplete({
        category: selectedCategory,
        messages: selectedMessages,
        name: notebookName.trim()
      });
      onClose();
    }
  };

  const isMessageSelected = (messageId: string) => {
    return selectedMessages.some(m => m.messageId === messageId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-elevated rounded-xl border border-input-border shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-input-border">
          <div className="flex items-center gap-4">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-button-secondary rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-text-secondary" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                Create New Notebook
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                Step {step} of 4: {step === 1 ? 'Choose Category' : step === 2 ? 'Select Chat' : step === 3 ? 'Choose Messages' : 'Name Notebook'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-button-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {step === 1 && (
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-4">
                Select a category for your notebook
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      selectedCategory?.id === category.id
                        ? 'bg-[hsl(var(--input-mint-bg))] border-[hsl(var(--input-mint-border))] shadow-[0_0_8px_hsl(var(--input-mint-glow))]'
                        : 'bg-button-secondary hover:bg-button-secondary-hover border-input-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{category.icon}</span>
                      <div>
                        <h4 className={`font-medium ${
                          selectedCategory?.id === category.id ? 'text-brand-primary' : 'text-text-primary'
                        }`}>
                          {category.name}
                        </h4>
                        <p className="text-sm text-text-secondary mt-1">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-text-primary">
                  Select a chat to extract messages from
                </h3>
                <div className="bg-brand-primary/10 px-3 py-1 rounded-full">
                  <span className="text-sm font-medium text-brand-primary">
                    {selectedChat ? '1 chat selected' : '0 chats selected'}
                  </span>
                </div>
              </div>
              {state.chats.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-secondary">No chats available</p>
                  <p className="text-text-muted text-sm mt-1">Start a conversation first to create a notebook</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {state.chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => handleChatSelect(chat)}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        selectedChat?.id === chat.id
                          ? 'bg-[hsl(var(--input-mint-bg))] border-[hsl(var(--input-mint-border))] shadow-[0_0_8px_hsl(var(--input-mint-glow))]'
                          : 'bg-button-secondary hover:bg-button-secondary-hover border-input-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className={`font-medium ${
                            selectedChat?.id === chat.id ? 'text-brand-primary' : 'text-text-primary'
                          }`}>
                            {chat.title}
                          </h4>
                          <p className="text-sm text-text-secondary mt-1">
                            {chat.messages.length} messages • {new Date(chat.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        {selectedChat?.id === chat.id && (
                          <Check className="w-5 h-5 text-brand-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && selectedChat && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-text-primary">
                  Select messages from "{selectedChat.title}"
                </h3>
                <div className="flex items-center gap-4">
                  <div className="bg-brand-primary/10 px-3 py-1 rounded-full">
                    <span className="text-sm font-medium text-brand-primary">
                      {selectedMessages.length}/10 selected
                    </span>
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-brand-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(selectedMessages.length / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              {selectedChat.messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-secondary">No messages in this chat</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedChat.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        isMessageSelected(message.id)
                          ? 'bg-[hsl(var(--input-mint-bg))] border-[hsl(var(--input-mint-border))] shadow-[0_0_8px_hsl(var(--input-mint-glow))]'
                          : 'bg-button-secondary hover:bg-button-secondary-hover border-input-border'
                      } ${selectedMessages.length >= 10 && !isMessageSelected(message.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => handleMessageToggle(message)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                          isMessageSelected(message.id)
                            ? 'bg-brand-primary border-brand-primary'
                            : 'border-input-border'
                        }`}>
                          {isMessageSelected(message.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              message.type === 'user' 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {message.type === 'user' ? 'You' : 'AI'}
                            </span>
                            <span className="text-xs text-text-muted">
                              {new Date(message.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className={`text-sm line-clamp-3 ${
                            isMessageSelected(message.id) ? 'text-text-primary' : 'text-text-secondary'
                          }`}>
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-4">
                Name your notebook
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Notebook Name
                  </label>
                  <input
                    type="text"
                    value={notebookName}
                    onChange={(e) => setNotebookName(e.target.value)}
                    placeholder={`${selectedCategory?.name} Notebook`}
                    className="w-full px-4 py-3 bg-button-secondary border border-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-text-primary placeholder-text-muted"
                    autoFocus
                  />
                </div>
                <div className="bg-button-secondary rounded-lg p-4">
                  <h4 className="text-sm font-medium text-text-primary mb-2">Summary</h4>
                  <div className="space-y-2 text-sm text-text-secondary">
                    <p><span className="font-medium">Category:</span> {selectedCategory?.name}</p>
                    <p><span className="font-medium">Source Chat:</span> {selectedChat?.title}</p>
                    <p><span className="font-medium">Messages:</span> {selectedMessages.length} selected</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-input-border">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`w-2 h-2 rounded-full ${
                  stepNumber <= step ? 'bg-brand-primary' : 'bg-input-border'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            {step < 3 || step === 4 ? (
              step < 4 ? (
                <button
                  onClick={handleNext}
                  disabled={
                    step === 1 ? !selectedCategory : 
                    step === 2 ? !selectedChat : false
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {step === 2 ? 'Skip to Naming' : 'Next'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={!notebookName.trim()}
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create Notebook
                </button>
              )
            ) : step === 3 ? (
              <button
                onClick={() => {
                  setStep(4);
                  if (!notebookName) {
                    setNotebookName(`${selectedCategory?.name} Notebook`);
                  }
                }}
                disabled={selectedMessages.length === 0}
                className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue to Naming
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!notebookName.trim()}
                className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Notebook
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};