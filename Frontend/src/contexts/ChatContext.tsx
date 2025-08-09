import React, { createContext, useContext, useReducer, useEffect } from 'react';

export type Message = {
  id: string;
  content: string;
  type: 'user' | 'ai' | 'quiz';
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
  showAurora: boolean;
  isLiveMode: boolean;
  loadingState: string | null;
};

type ChatAction =
  | { type: 'CREATE_CHAT'; chat: Chat }
  | { type: 'SELECT_CHAT'; chatId: string }
  | { type: 'DELETE_CHAT'; chatId: string }
  | { type: 'ADD_MESSAGE'; chatId: string; message: Message }
  | { type: 'UPDATE_MESSAGE'; chatId: string; messageId: string; content: string }
  | { type: 'SET_THEME'; theme: Theme }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_DASHBOARD'; show: boolean }
  | { type: 'SET_USER_NAME'; name: string }
  | { type: 'SET_TYPING'; isTyping: boolean }
  | { type: 'SET_MODE'; mode: ChatMode }
  | { type: 'TOGGLE_AURORA' }
  | { type: 'TOGGLE_LIVE_MODE' }
  | { type: 'SET_LOADING_STATE'; loadingState: string | null };

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
  showAurora: false,
  isLiveMode: false,
  loadingState: null,
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
    
    case 'UPDATE_MESSAGE': {
      const updatedChats = state.chats.map(chat => {
        if (chat.id === action.chatId) {
          const updatedMessages = chat.messages.map(message => {
            if (message.id === action.messageId) {
              return {
                ...message,
                content: action.content,
                timestamp: new Date(),
              };
            }
            return message;
          });
          
          return {
            ...chat,
            messages: updatedMessages,
            updatedAt: new Date(),
          };
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
    
    case 'TOGGLE_AURORA':
      return { ...state, showAurora: !state.showAurora };
    
    case 'TOGGLE_LIVE_MODE':
      return { ...state, isLiveMode: !state.isLiveMode };
    
    case 'SET_LOADING_STATE':
      return { ...state, loadingState: action.loadingState };
    
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
  addAIMessage: (content: string) => void;
  addQuizMessage: (content: string) => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setDashboard: (show: boolean) => void;
  setUserName: (name: string) => void;
  setMode: (mode: ChatMode) => void;
  toggleAurora: () => void;
  toggleLiveMode: () => void;
  setLoadingState: (loadingState: string | null) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Set theme on document when theme changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
  }, [state.theme]);

  const createNewChat = (): string => {
    const chatId = `chat-${Date.now()}`;
    const newChat: Chat = {
      id: chatId,
      title: 'New Chatt',
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

    const BACKEND_URL = 'http://localhost:8000';
    const HARDCODED_USER_ID = 'frontend-user-12345';
    const aiMessageId = `msg-${Date.now()}-ai`;

    try {
      // Sequential loading states with 3-second intervals
      const loadingStates = [
        'Generating content...',
        'Generating images...',
        'Finding related videos...'
      ];

      // Show loading states sequentially
      for (let i = 0; i < loadingStates.length; i++) {
        dispatch({ type: 'SET_LOADING_STATE', loadingState: loadingStates[i] });
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Start both API calls in parallel
      const genaiPromise = fetch(`${BACKEND_URL}/genai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: HARDCODED_USER_ID,
          query: content.trim(),
          lang: 'auto',
          max_images: 3
        })
      }).then(res => {
        if (!res.ok) throw new Error(`GenAI API failed: ${res.status}`);
        return res.json();
      });

      const youtubePromise = fetch(`${BACKEND_URL}/youtube/recommend?q=${encodeURIComponent(content.trim())}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }).then(res => {
        if (!res.ok) throw new Error(`YouTube API failed: ${res.status}`);
        return res.json();
      });

      // Wait for GenAI response first
      const genaiResponse = await genaiPromise.catch(error => ({ error }));
      
      // Process and display GenAI content immediately using fast block rendering
      let genaiContent = '';
      if (genaiResponse.error) {
        console.error('GenAI API Error:', genaiResponse.error);
        genaiContent = '⚠️ Tutorial content temporarily unavailable.';
      } else if (genaiResponse.blocks && Array.isArray(genaiResponse.blocks)) {
        // Store blocks as JSON for fast rendering instead of converting to markdown
        genaiContent = `<BLOCKS_DATA>${JSON.stringify(genaiResponse.blocks)}</BLOCKS_DATA>`;
      }

      // Add GenAI message first
      const genaiMessage: Message = {
        id: aiMessageId,
        content: genaiContent,
        type: 'ai',
        timestamp: new Date(),
      };
      dispatch({ type: 'ADD_MESSAGE', chatId, message: genaiMessage });

      // Wait for YouTube response and update the existing message
      const youtubeResponse = await youtubePromise.catch(error => ({ error }));
      
      let youtubeContent = '';
      if (youtubeResponse.error) {
        console.error('YouTube API Error:', youtubeResponse.error);
        youtubeContent = '\n\n## 📺 Related Videos\n\n⚠️ Video recommendations temporarily unavailable.';
      } else if (youtubeResponse.videos && Array.isArray(youtubeResponse.videos)) {
        // Show only first 3 videos by default
        const limitedVideos = youtubeResponse.videos.slice(0, 3);
        const remainingVideos = youtubeResponse.videos.slice(3);
        
        youtubeContent = `\n\n<youtube-cards>${JSON.stringify({
          videos: limitedVideos,
          remainingVideos: remainingVideos
        })}</youtube-cards>`;
      }

      // Update the existing message with YouTube content (no duplicate message)
      dispatch({ 
        type: 'UPDATE_MESSAGE', 
        chatId, 
        messageId: aiMessageId,
        content: genaiContent + youtubeContent
      });

    } catch (error) {
      console.error('Backend API Error:', error);
      
      // Fallback response in case of complete failure
      const errorMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        content: 'Sorry, I encountered an error while processing your request. Please make sure the backend server is running on localhost:8000.',
        type: 'ai',
        timestamp: new Date(),
      };

      dispatch({ type: 'ADD_MESSAGE', chatId, message: errorMessage });
    } finally {
      dispatch({ type: 'SET_TYPING', isTyping: false });
      dispatch({ type: 'SET_LOADING_STATE', loadingState: null });
    }
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

  const toggleAurora = () => {
    dispatch({ type: 'TOGGLE_AURORA' });
  };

  const toggleLiveMode = () => {
    dispatch({ type: 'TOGGLE_LIVE_MODE' });
  };

  const setLoadingState = (loadingState: string | null) => {
    dispatch({ type: 'SET_LOADING_STATE', loadingState });
  };

  const addAIMessage = (content: string) => {
    let chatId = state.currentChatId;
    if (!chatId) {
      chatId = createNewChat();
    }

    const aiMessage: Message = {
      id: `msg-${Date.now()}-ai`,
      content,
      type: 'ai',
      timestamp: new Date(),
    };

    dispatch({ type: 'ADD_MESSAGE', chatId, message: aiMessage });
  };

  const addQuizMessage = (content: string) => {
    let chatId = state.currentChatId;
    if (!chatId) {
      chatId = createNewChat();
    }

    const quizMessage: Message = {
      id: `quiz-${Date.now()}`,
      content,
      type: 'quiz',
      timestamp: new Date(),
    };

    dispatch({ type: 'ADD_MESSAGE', chatId, message: quizMessage });
  };

  const value: ChatContextType = {
    state,
    createNewChat,
    selectChat,
    deleteChat,
    sendMessage,
    addAIMessage,
    addQuizMessage,
    setTheme,
    toggleSidebar,
    setDashboard,
    setUserName,
    setMode,
    toggleAurora,
    toggleLiveMode,
    setLoadingState,
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