import React, { createContext, useContext, useReducer, useEffect } from 'react';

export type Message = {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Date;
  mode?: 'web' | 'research';
  isStreaming?: boolean;
  isCurrentlyGenerating?: boolean;
};

export type Chat = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  backendChatId?: string;
  hasUsedResearchMode: boolean;
};

export type ChatMode = 'web' | 'research' | null;

export type UserData = {
  name: string;
  username: string;
};

type Theme = 'light' | 'dark';

type ChatState = {
  chats: Chat[];
  currentChatId: string | null;
  currentChat: Chat | null;
  theme: Theme;
  sidebarCollapsed: boolean;
  showDashboard: boolean;
  userName: string;
  currentUser: UserData;
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
  | { type: 'SET_MESSAGE_STREAMING'; chatId: string; messageId: string; isStreaming: boolean }
  | { type: 'SET_CURRENTLY_GENERATING'; chatId: string; messageId: string | null }
  | { type: 'SET_BACKEND_CHAT_ID'; chatId: string; backendChatId: string }
  | { type: 'SET_RESEARCH_MODE_USED'; chatId: string }
  | { type: 'SET_THEME'; theme: Theme }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_DASHBOARD'; show: boolean }
  | { type: 'SET_USER_NAME'; name: string }
  | { type: 'SET_CURRENT_USER'; user: UserData }
  | { type: 'SET_TYPING'; isTyping: boolean }
  | { type: 'SET_MODE'; mode: ChatMode }
  | { type: 'TOGGLE_AURORA' }
  | { type: 'TOGGLE_LIVE_MODE' }
  | { type: 'SET_LOADING_STATE'; loadingState: string | null };

const initialState: ChatState = {
  chats: [],
  currentChatId: null,
  currentChat: null,
  theme: 'dark',
  sidebarCollapsed: true,
  showDashboard: false,
  userName: 'User',
  currentUser: {
    name: 'User',
    username: 'frontend-user-12345'
  },
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
    
    case 'SET_MESSAGE_STREAMING': {
      const updatedChats = state.chats.map(chat => {
        if (chat.id === action.chatId) {
          const updatedMessages = chat.messages.map(message => {
            if (message.id === action.messageId) {
              return {
                ...message,
                isStreaming: action.isStreaming,
              };
            }
            return message;
          });
          
          return {
            ...chat,
            messages: updatedMessages,
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
    
    case 'SET_CURRENTLY_GENERATING': {
      const updatedChats = state.chats.map(chat => {
        if (chat.id === action.chatId) {
          const updatedMessages = chat.messages.map(message => ({
            ...message,
            isCurrentlyGenerating: message.id === action.messageId
          }));
          
          return {
            ...chat,
            messages: updatedMessages,
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
    
    case 'SET_BACKEND_CHAT_ID': {
      const updatedChats = state.chats.map(chat => {
        if (chat.id === action.chatId) {
          return {
            ...chat,
            backendChatId: action.backendChatId,
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

    case 'SET_RESEARCH_MODE_USED': {
      const updatedChats = state.chats.map(chat => {
        if (chat.id === action.chatId) {
          return {
            ...chat,
            hasUsedResearchMode: true,
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
    
    case 'SET_CURRENT_USER':
      return { 
        ...state, 
        currentUser: action.user,
        userName: action.user.name 
      };
    
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
  setMessageStreaming: (chatId: string, messageId: string, isStreaming: boolean) => void;
  setCurrentlyGenerating: (chatId: string, messageId: string | null) => void;
  setBackendChatId: (chatId: string, backendChatId: string) => void;
  setResearchModeUsed: (chatId: string) => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setDashboard: (show: boolean) => void;
  setUserName: (name: string) => void;
  setCurrentUser: (user: UserData) => void;
  createUser: (name: string) => Promise<UserData>;
  setMode: (mode: ChatMode) => void;
  toggleAurora: () => void;
  toggleLiveMode: () => void;
  setLoadingState: (loadingState: string | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Set theme on document when theme changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
  }, [state.theme]);

  // Load current user from localStorage on initialization
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const userData: UserData = JSON.parse(savedUser);
        dispatch({ type: 'SET_CURRENT_USER', user: userData });
      } catch (error) {
        console.error('Error loading user from localStorage:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  const createNewChat = (): string => {
    const chatId = `chat-${Date.now()}`;
    const newChat: Chat = {
      id: chatId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      hasUsedResearchMode: false,
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

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const userId = state.currentUser.username;
    const aiMessageId = `msg-${Date.now()}-ai`;

    try {
      // Only proceed with GenAI and YouTube API calls if mode is 'research'
      if (mode === 'research') {
        // Set initial loading state
        dispatch({ type: 'SET_LOADING_STATE', loadingState: 'Processing your research query...' });

        // Start both API calls immediately in parallel
        const genaiPromise = fetch(`${BACKEND_URL}/genai/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
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
        console.log('🔍 Full GenAI Response:', genaiResponse);
        
        // Extract chat_id from GenAI response
        let backendChatId = null;
        if (genaiResponse && genaiResponse.chat_id) {
          backendChatId = genaiResponse.chat_id;
          console.log('✅ Backend chat_id extracted:', backendChatId);
          // Store the backend chat_id in the current chat
          dispatch({ type: 'SET_BACKEND_CHAT_ID', chatId, backendChatId });
        } else {
          console.log('❌ No chat_id found in GenAI response');
          console.log('GenAI response keys:', Object.keys(genaiResponse || {}));
        }
        
        // Process and display GenAI content immediately using fast block rendering
        let genaiContent = '';
        if (genaiResponse.error) {
          console.error('GenAI API Error:', genaiResponse.error);
          genaiContent = '⚠️ Tutorial content temporarily unavailable.';
        } else if (genaiResponse.blocks && Array.isArray(genaiResponse.blocks)) {
          // Store blocks as JSON for fast rendering instead of converting to markdown
          genaiContent = `<BLOCKS_DATA>${JSON.stringify(genaiResponse.blocks)}</BLOCKS_DATA>`;
        }

        // Add GenAI message first - no streaming for research mode
        const genaiMessage: Message = {
          id: aiMessageId,
          content: genaiContent,
          type: 'ai',
          timestamp: new Date(),
          mode: 'research',
          isStreaming: false,
          isCurrentlyGenerating: false,
        };
        dispatch({ type: 'ADD_MESSAGE', chatId, message: genaiMessage });

        // Wait for YouTube response and update the existing message
        const youtubeResponse = await youtubePromise.catch(error => ({ error }));
        console.log('🎥 Full YouTube Response:', youtubeResponse);
        
        // Call YouTube update API if we have both chat_id and YouTube videos
        console.log('🔄 Checking conditions for update API call:');
        console.log('- backendChatId:', backendChatId);
        console.log('- youtubeResponse.videos exists:', !!youtubeResponse.videos);
        console.log('- youtubeResponse.videos is array:', Array.isArray(youtubeResponse.videos));
        
        console.log('Calling YouTube update API1...',backendChatId,youtubeResponse);
        if (backendChatId && youtubeResponse.videos && Array.isArray(youtubeResponse.videos)) {
          console.log('Calling YouTube update API2...');
          try {
            const updateResponse = await fetch(`${BACKEND_URL}/youtube/update_youtube_links`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                chat_id: backendChatId,
                videos: youtubeResponse.videos
              })
            });
            
            console.log('📡 Update API Response Status:', updateResponse.status);
            const responseData = await updateResponse.json();
            console.log('📡 Update API Response Data:', responseData);
            
            if (updateResponse.ok) {
              console.log('✅ YouTube links successfully stored in database');
            } else {
              console.error('❌ Failed to update YouTube links:', updateResponse.status);
            }
          } catch (error) {
            console.error('💥 Error calling YouTube update API:', error);
          }
        } else {
          console.log('⚠️ Skipping update API call - conditions not met');
        }
        
        let youtubeContent = '';
        if (youtubeResponse.error) {
          console.error('YouTube API Error:', youtubeResponse.error);
          youtubeContent = '\n\n## Related Videos\n\n⚠️ Video recommendations temporarily unavailable.';
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

        // Mark research mode as used for this chat
        dispatch({ type: 'SET_RESEARCH_MODE_USED', chatId });
      } else {
        // For non-research modes, use the /api/query endpoint
        try {
          // Get the current chat's backend chat_id if available
          const currentChat = state.chats.find(chat => chat.id === chatId);
          const backendChatId = currentChat?.backendChatId;
          
          // Prepare request body with optional chat_id
          const requestBody: any = {
            user_id: userId,
            query: content.trim(),
            mode: mode || 'general',
            lang: 'auto'
          };
          
          // Add chat_id if available
          if (backendChatId) {
            requestBody.chat_id = backendChatId;
          }

          const queryResponse = await fetch(`${BACKEND_URL}/query`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          });

          if (!queryResponse.ok) {
            throw new Error(`Query API failed: ${queryResponse.status}`);
          }

          const queryData = await queryResponse.json();
          console.log('🔍 Query API Response:', queryData);

          // Extract content from the response
          let responseContent = 'No response received.';
          if (queryData.lesson && queryData.lesson.length > 0 && queryData.lesson[0].script) {
            responseContent = queryData.lesson[0].script;
          }

          const apiMessage: Message = {
            id: aiMessageId,
            content: responseContent,
            type: 'ai',
            timestamp: new Date(),
            isStreaming: true,
            isCurrentlyGenerating: true,
          };
          dispatch({ type: 'ADD_MESSAGE', chatId, message: apiMessage });
        } catch (error) {
          console.error('Query API Error:', error);
          const errorMessage: Message = {
            id: aiMessageId,
            content: 'Sorry, I encountered an error while processing your request. Please make sure the backend server is running.',
            type: 'ai',
            timestamp: new Date(),
            isStreaming: true,
            isCurrentlyGenerating: true,
          };
          dispatch({ type: 'ADD_MESSAGE', chatId, message: errorMessage });
        }
      }

    } catch (error) {
      console.error('Backend API Error:', error);
      
      // Fallback response in case of complete failure
      const errorMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        content: 'Sorry, I encountered an error while processing your request. Please make sure the backend server is running on.',
        type: 'ai',
        timestamp: new Date(),
        isStreaming: true,
        isCurrentlyGenerating: true,
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

  const setCurrentUser = (user: UserData) => {
    dispatch({ type: 'SET_CURRENT_USER', user });
    // Save to localStorage
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const createUser = async (name: string): Promise<UserData> => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    
    try {
      const response = await fetch(`${BACKEND_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create user: ${response.status}`);
      }

      const userData: UserData = await response.json();
      
      // Save to localStorage and set as current user
      setCurrentUser(userData);
      
      return userData;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
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

  const setCurrentlyGenerating = (chatId: string, messageId: string | null) => {
    dispatch({ type: 'SET_CURRENTLY_GENERATING', chatId, messageId });
  };

  const setMessageStreaming = (chatId: string, messageId: string, isStreaming: boolean) => {
    dispatch({ type: 'SET_MESSAGE_STREAMING', chatId, messageId, isStreaming });
  };

  const setBackendChatId = (chatId: string, backendChatId: string) => {
    dispatch({ type: 'SET_BACKEND_CHAT_ID', chatId, backendChatId });
  };

  const setResearchModeUsed = (chatId: string) => {
    dispatch({ type: 'SET_RESEARCH_MODE_USED', chatId });
  };

  const value: ChatContextType = {
    state,
    createNewChat,
    selectChat,
    deleteChat,
    sendMessage,
    addAIMessage,
    setMessageStreaming,
    setCurrentlyGenerating,
    setBackendChatId,
    setResearchModeUsed,
    setTheme,
    toggleSidebar,
    setDashboard,
    setUserName,
    setCurrentUser,
    createUser,
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