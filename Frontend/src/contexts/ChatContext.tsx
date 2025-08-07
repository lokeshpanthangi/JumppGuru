import React, { createContext, useContext, useReducer, useEffect } from 'react';

export type Message = {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Date;
  mode?: 'web' | 'research';
};

export type Chat = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
};

export type ChatMode = 'web' | 'research' | null;

type Theme = 'light' | 'dark';

type ChatState = {
  chats: Chat[];
  currentChatId: string | null;
  currentChat: Chat | null;
  theme: Theme;
  sidebarCollapsed: boolean;
  showDashboard: boolean;
  userName: string;
  isTyping: boolean;
  currentMode: ChatMode;
};

type ChatAction =
  | { type: 'CREATE_CHAT'; chat: Chat }
  | { type: 'SELECT_CHAT'; chatId: string }
  | { type: 'DELETE_CHAT'; chatId: string }
  | { type: 'ADD_MESSAGE'; chatId: string; message: Message }
  | { type: 'SET_THEME'; theme: Theme }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_DASHBOARD'; show: boolean }
  | { type: 'SET_USER_NAME'; name: string }
  | { type: 'SET_TYPING'; isTyping: boolean }
  | { type: 'SET_MODE'; mode: ChatMode }
  | { type: 'LOAD_STATE'; state: Partial<ChatState> };

const initialState: ChatState = {
  chats: [],
  currentChatId: null,
  currentChat: null,
  theme: 'light',
  sidebarCollapsed: false,
  showDashboard: false,
  userName: 'User',
  isTyping: false,
  currentMode: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'CREATE_CHAT': {
      const newChats = [action.chat, ...state.chats];
      return {
        ...state,
        chats: newChats,
        currentChatId: action.chat.id,
        currentChat: action.chat,
        showDashboard: false,
      };
    }
    
    case 'SELECT_CHAT': {
      const chat = state.chats.find(c => c.id === action.chatId);
      return {
        ...state,
        currentChatId: action.chatId,
        currentChat: chat || null,
        showDashboard: false,
      };
    }
    
    case 'DELETE_CHAT': {
      const newChats = state.chats.filter(c => c.id !== action.chatId);
      const isCurrentChat = state.currentChatId === action.chatId;
      return {
        ...state,
        chats: newChats,
        currentChatId: isCurrentChat ? null : state.currentChatId,
        currentChat: isCurrentChat ? null : state.currentChat,
      };
    }
    
    case 'ADD_MESSAGE': {
      const updatedChats = state.chats.map(chat => {
        if (chat.id === action.chatId) {
          const updatedChat = {
            ...chat,
            messages: [...chat.messages, action.message],
            updatedAt: new Date(),
            title: chat.messages.length === 0 ? action.message.content.slice(0, 50) + '...' : chat.title,
          };
          return updatedChat;
        }
        return chat;
      });
      
      const currentChat = state.currentChatId === action.chatId 
        ? updatedChats.find(c => c.id === action.chatId) || null
        : state.currentChat;
      
      return {
        ...state,
        chats: updatedChats,
        currentChat,
      };
    }
    
    case 'SET_THEME':
      return { ...state, theme: action.theme };
    
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    
    case 'SET_DASHBOARD':
      return { ...state, showDashboard: action.show };
    
    case 'SET_USER_NAME':
      return { ...state, userName: action.name };
    
    case 'SET_TYPING':
      return { ...state, isTyping: action.isTyping };
    
    case 'SET_MODE':
      return { ...state, currentMode: action.mode };
    
    case 'LOAD_STATE':
      return { ...state, ...action.state };
    
    default:
      return state;
  }
}

type ChatContextType = {
  state: ChatState;
  createNewChat: () => string;
  selectChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  sendMessage: (content: string, mode?: ChatMode) => Promise<void>;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setDashboard: (show: boolean) => void;
  setUserName: (name: string) => void;
  setMode: (mode: ChatMode) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Load initial state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('jumppguru-state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // Convert date strings back to Date objects
        const processedState = {
          ...parsed,
          chats: parsed.chats?.map((chat: any) => ({
            ...chat,
            createdAt: new Date(chat.createdAt),
            updatedAt: new Date(chat.updatedAt),
            messages: chat.messages?.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })) || [],
          })) || [],
        };
        dispatch({ type: 'LOAD_STATE', state: processedState });
      } catch (error) {
        console.error('Failed to load saved state:', error);
      }
    }
    
    // Set theme on document
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('jumppguru-state', JSON.stringify(state));
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
  }, [state]);

  const createNewChat = (): string => {
    const chatId = `chat-${Date.now()}`;
    const newChat: Chat = {
      id: chatId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dispatch({ type: 'CREATE_CHAT', chat: newChat });
    return chatId;
  };

  const selectChat = (chatId: string) => {
    dispatch({ type: 'SELECT_CHAT', chatId });
  };

  const deleteChat = (chatId: string) => {
    dispatch({ type: 'DELETE_CHAT', chatId });
  };

  const sendMessage = async (content: string, mode?: ChatMode) => {
    if (!content.trim()) return;

    let chatId = state.currentChatId;
    if (!chatId) {
      chatId = createNewChat();
    }

    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      content: content.trim(),
      type: 'user',
      timestamp: new Date(),
      mode,
    };

    dispatch({ type: 'ADD_MESSAGE', chatId, message: userMessage });
    dispatch({ type: 'SET_TYPING', isTyping: true });

    // Simulate AI response
    setTimeout(() => {
      const aiResponses = [
        "I understand your question. Let me help you with that.",
        "That's an interesting point. Here's what I think...",
        "Based on your query, I can provide the following insights:",
        "Great question! Let me break this down for you.",
        "I'd be happy to help you explore this topic further.",
      ];

      const modePrefix = mode === 'web' ? '[Web Search] ' : mode === 'research' ? '[Research] ' : '';
      const aiMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        content: modePrefix + aiResponses[Math.floor(Math.random() * aiResponses.length)],
        type: 'ai',
        timestamp: new Date(),
      };

      dispatch({ type: 'ADD_MESSAGE', chatId, message: aiMessage });
      dispatch({ type: 'SET_TYPING', isTyping: false });
    }, 1500);
  };

  const setTheme = (theme: Theme) => {
    dispatch({ type: 'SET_THEME', theme });
  };

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  const setDashboard = (show: boolean) => {
    dispatch({ type: 'SET_DASHBOARD', show });
  };

  const setUserName = (name: string) => {
    dispatch({ type: 'SET_USER_NAME', name });
  };

  const setMode = (mode: ChatMode) => {
    dispatch({ type: 'SET_MODE', mode });
  };

  const value: ChatContextType = {
    state,
    createNewChat,
    selectChat,
    deleteChat,
    sendMessage,
    setTheme,
    toggleSidebar,
    setDashboard,
    setUserName,
    setMode,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}