import React, { createContext, useContext, useReducer, useEffect } from "react";

export type Message = {
  id: string;
  content: string;
  type: "user" | "ai";
  timestamp: Date;
  mode?: "web" | "research";
  isStreaming?: boolean;
  isCurrentlyGenerating?: boolean;
  page?: number;
  chat_id?: string;
  hasAutoTTSPlayed?: boolean;
  isAutoTTSMessage?: boolean; // Track if message was processed through Auto TTS
};

export type Chat = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  backendChatId?: string;
  hasUsedResearchMode: boolean;
  page: number;
};

export type ChatMode = "web" | "research" | null;

export type UserData = {
  name: string;
  username: string;
};

type Theme = "light" | "dark";

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
  currentPage: number;
  hasInitializedUser: boolean; // Track if user has been initialized
  autoTTS: boolean;
  pendingAutoTTSResponse?: {
    chatId: string;
    content: string;
    messageId: string;
  };
};

type ChatAction =
  | { type: "CREATE_CHAT"; chat: Chat }
  | { type: "SELECT_CHAT"; chatId: string }
  | { type: "DELETE_CHAT"; chatId: string }
  | { type: "ADD_MESSAGE"; chatId: string; message: Message }
  | {
      type: "UPDATE_MESSAGE";
      chatId: string;
      messageId: string;
      content: string;
    }
  | {
      type: "SET_MESSAGE_STREAMING";
      chatId: string;
      messageId: string;
      isStreaming: boolean;
    }
  | {
      type: "SET_CURRENTLY_GENERATING";
      chatId: string;
      messageId: string | null;
    }
  | { type: "SET_BACKEND_CHAT_ID"; chatId: string; backendChatId: string }
  | { type: "SET_MESSAGE_CHAT_ID"; chatId: string; messageId: string; messageChatId: string }
  | { type: "SET_RESEARCH_MODE_USED"; chatId: string }
  | { type: "SET_THEME"; theme: Theme }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "SET_DASHBOARD"; show: boolean }
  | { type: "SET_USER_NAME"; name: string }
  | { type: "SET_CURRENT_USER"; user: UserData }
  | { type: "SET_USER_INITIALIZED"; initialized: boolean }
  | { type: "SET_TYPING"; isTyping: boolean }
  | { type: "SET_MODE"; mode: ChatMode }
  | { type: "TOGGLE_AURORA" }
  | { type: "TOGGLE_LIVE_MODE" }
  | { type: "SET_LOADING_STATE"; loadingState: string | null }
  | { type: "SET_CURRENT_PAGE"; page: number }
  | { type: "LOAD_HISTORY"; chats: Chat[] }
  | { type: "TOGGLE_AUTO_TTS" }
  | { type: "MARK_MESSAGE_AUTO_TTS_PLAYED"; chatId: string; messageId: string }
  | { type: "HANDLE_AUTO_TTS_RESPONSE"; chatId: string; content: string; messageId: string };

const initialState: ChatState = {
  chats: [],
  currentChatId: null,
  currentChat: null,
  theme: "dark",
  sidebarCollapsed: true,
  showDashboard: false,
  userName: "User",
  currentUser: {
    name: "User",
    username: "", // Empty username initially - no API call until real user is set
  },
  isTyping: false,
  currentMode: null,
  showAurora: true,
  isLiveMode: false,
  loadingState: null,
  currentPage: 1,
  hasInitializedUser: false,
  autoTTS: false,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "CREATE_CHAT": {
      const newChats = [action.chat, ...state.chats];
      return {
        ...state,
        chats: newChats,
        currentChatId: action.chat.id,
        currentChat: action.chat,
        showDashboard: false,
        currentPage: action.chat.page,
      };
    }

    case "SELECT_CHAT": {
      const chat = state.chats.find((c) => c.id === action.chatId);
      return {
        ...state,
        currentChatId: action.chatId,
        currentChat: chat || null,
        showDashboard: false,
        currentPage: chat ? chat.page : state.currentPage,
      };
    }

    case "DELETE_CHAT": {
      const newChats = state.chats.filter((c) => c.id !== action.chatId);
      const isCurrentChat = state.currentChatId === action.chatId;
      return {
        ...state,
        chats: newChats,
        currentChatId: isCurrentChat ? null : state.currentChatId,
        currentChat: isCurrentChat ? null : state.currentChat,
      };
    }

    case "ADD_MESSAGE": {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === action.chatId) {
          const updatedChat = {
            ...chat,
            messages: [...chat.messages, action.message],
            updatedAt: new Date(),
            title:
              chat.messages.length === 0
                ? action.message.content.slice(0, 50) + "..."
                : chat.title,
          };
          return updatedChat;
        }
        return chat;
      });

      const currentChat =
        state.currentChatId === action.chatId
          ? updatedChats.find((c) => c.id === action.chatId) || null
          : state.currentChat;

      return {
        ...state,
        chats: updatedChats,
        currentChat,
      };
    }

    case "UPDATE_MESSAGE": {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === action.chatId) {
          const updatedMessages = chat.messages.map((message) => {
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

      const currentChat =
        state.currentChatId === action.chatId
          ? updatedChats.find((c) => c.id === action.chatId) || null
          : state.currentChat;

      return {
        ...state,
        chats: updatedChats,
        currentChat,
      };
    }

    case "SET_MESSAGE_STREAMING": {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === action.chatId) {
          const updatedMessages = chat.messages.map((message) => {
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

      const currentChat =
        state.currentChatId === action.chatId
          ? updatedChats.find((c) => c.id === action.chatId) || null
          : state.currentChat;

      return {
        ...state,
        chats: updatedChats,
        currentChat,
      };
    }

    case "SET_CURRENTLY_GENERATING": {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === action.chatId) {
          const updatedMessages = chat.messages.map((message) => ({
            ...message,
            isCurrentlyGenerating: message.id === action.messageId,
          }));

          return {
            ...chat,
            messages: updatedMessages,
          };
        }
        return chat;
      });

      const currentChat =
        state.currentChatId === action.chatId
          ? updatedChats.find((c) => c.id === action.chatId) || null
          : state.currentChat;

      return {
        ...state,
        chats: updatedChats,
        currentChat,
      };
    }

    case "SET_BACKEND_CHAT_ID": {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === action.chatId) {
          return {
            ...chat,
            backendChatId: action.backendChatId,
          };
        }
        return chat;
      });

      const currentChat =
        state.currentChatId === action.chatId
          ? updatedChats.find((c) => c.id === action.chatId) || null
          : state.currentChat;

      return {
        ...state,
        chats: updatedChats,
        currentChat,
      };
    }

    case "SET_MESSAGE_CHAT_ID": {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === action.chatId) {
          const updatedMessages = chat.messages.map((message) => {
            if (message.id === action.messageId) {
              return {
                ...message,
                chat_id: action.messageChatId,
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

      const currentChat =
        state.currentChatId === action.chatId
          ? updatedChats.find((c) => c.id === action.chatId) || null
          : state.currentChat;

      return {
        ...state,
        chats: updatedChats,
        currentChat,
      };
    }

    case "SET_RESEARCH_MODE_USED": {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === action.chatId) {
          return {
            ...chat,
            hasUsedResearchMode: true,
          };
        }
        return chat;
      });

      const currentChat =
        state.currentChatId === action.chatId
          ? updatedChats.find((c) => c.id === action.chatId) || null
          : state.currentChat;

      return {
        ...state,
        chats: updatedChats,
        currentChat,
      };
    }

    case "SET_THEME":
      return { ...state, theme: action.theme };

    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };

    case "SET_DASHBOARD":
      return { ...state, showDashboard: action.show };

    case "SET_USER_NAME":
      return { ...state, userName: action.name };

    case "SET_CURRENT_USER":
      return {
        ...state,
        currentUser: action.user,
        userName: action.user.name,
      };

    case "SET_USER_INITIALIZED":
      return {
        ...state,
        hasInitializedUser: action.initialized,
      };

    case "SET_TYPING":
      return { ...state, isTyping: action.isTyping };

    case "SET_MODE":
      return { ...state, currentMode: action.mode };

    case "TOGGLE_AURORA":
      return { ...state, showAurora: !state.showAurora };

    case "TOGGLE_LIVE_MODE":
      return { ...state, isLiveMode: !state.isLiveMode };

    case "SET_LOADING_STATE":
      return { ...state, loadingState: action.loadingState };

    case "SET_CURRENT_PAGE":
      return { ...state, currentPage: action.page };

    case "LOAD_HISTORY": {
      // Replace existing chats with historical chats
      // (We want to start fresh when loading history for a user)
      return {
        ...state,
        chats: action.chats,
        // Reset current chat selection since we're loading new history
        currentChatId: null,
        currentChat: null,
      };
    }

    case "TOGGLE_AUTO_TTS":
      return { ...state, autoTTS: !state.autoTTS };

    case "MARK_MESSAGE_AUTO_TTS_PLAYED": {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === action.chatId) {
          const updatedMessages = chat.messages.map((message) => {
            if (message.id === action.messageId) {
              return {
                ...message,
                hasAutoTTSPlayed: true,
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

      const currentChat =
        state.currentChatId === action.chatId
          ? updatedChats.find((c) => c.id === action.chatId) || null
          : state.currentChat;

      return {
        ...state,
        chats: updatedChats,
        currentChat,
      };
    }

    case "HANDLE_AUTO_TTS_RESPONSE": {
      // This action is used to store the AI response content for Auto TTS processing
      // without displaying it in the chat area initially
      return {
        ...state,
        pendingAutoTTSResponse: {
          chatId: action.chatId,
          content: action.content,
          messageId: action.messageId,
        },
      };
    }

    default:
      return state;
  }
}

type ChatContextType = {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  createNewChat: () => string;
  selectChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  sendMessage: (content: string, mode?: ChatMode) => Promise<void>;
  addAIMessage: (content: string) => void;
  setMessageStreaming: (
    chatId: string,
    messageId: string,
    isStreaming: boolean
  ) => void;
  setCurrentlyGenerating: (chatId: string, messageId: string | null) => void;
  setBackendChatId: (chatId: string, backendChatId: string) => void;
  setMessageChatId: (chatId: string, messageId: string, messageChatId: string) => void;
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
  setCurrentPage: (page: number) => void;
  loadChatHistory: () => Promise<void>;
  toggleAutoTTS: () => void;
  markMessageAutoTTSPlayed: (chatId: string, messageId: string) => void;
  handleAutoTTSResponse: (chatId: string, content: string, messageId: string) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Set theme on document when theme changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", state.theme === "dark");
  }, [state.theme]);

  // Load and persist autoTTS setting
  useEffect(() => {
    const savedAutoTTS = localStorage.getItem("autoTTS");
    if (savedAutoTTS !== null) {
      const savedValue = JSON.parse(savedAutoTTS);
      if (savedValue !== initialState.autoTTS) {
        dispatch({ type: "TOGGLE_AUTO_TTS" });
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("autoTTS", JSON.stringify(state.autoTTS));
  }, [state.autoTTS]);

  // Load current user from localStorage on initialization
  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      try {
        const userData: UserData = JSON.parse(savedUser);
        dispatch({ type: "SET_CURRENT_USER", user: userData });
        dispatch({ type: "SET_USER_INITIALIZED", initialized: true });
      } catch (error) {
        console.error("Error loading user from localStorage:", error);
        localStorage.removeItem("currentUser");
        dispatch({ type: "SET_USER_INITIALIZED", initialized: true });
      }
    } else {
      dispatch({ type: "SET_USER_INITIALIZED", initialized: true });
    }
  }, []);

  const loadChatHistory = async () => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const userId = state.currentUser.username;

    console.log("🚀 Fetching chat history for user:", userId);

    try {
      const response = await fetch(`${BACKEND_URL}/genai/history/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log("📭 No chat history found for user:", userId);
          return; // User has no history, that's okay
        }
        console.error("Failed to load chat history:", response.status);
        return;
      }

      const historyData = await response.json();
      console.log("📚 Chat History Response:", historyData);

      // Handle direct history array format
      if (
        !historyData.history ||
        !Array.isArray(historyData.history) ||
        historyData.history.length === 0
      ) {
        console.log("📭 User has no chat history");
        return;
      }

      const historicalChats: Chat[] = [];

      historyData.history.forEach((pageData: any) => {
        if (
          pageData.chats &&
          Array.isArray(pageData.chats) &&
          pageData.chats.length > 0
        ) {
          const pageMessages: Message[] = [];

          // Group all chats from this page into a single chat
          pageData.chats.forEach((chatData: any) => {
            // Add user message
            if (chatData.query) {
              pageMessages.push({
                id: `${chatData._id}-user`,
                content: chatData.query,
                type: "user",
                timestamp: new Date(chatData.timestamp),
                page: pageData.page,
                chat_id: typeof pageData.chat_id === 'object' && pageData.chat_id?._id ? pageData.chat_id._id : pageData.chat_id,
              });
            }

            // Add AI response
            if (chatData.response) {
              let responseContent = "";

              // Handle different response formats
              if (typeof chatData.response === "string") {
                responseContent = chatData.response;
              } else if (Array.isArray(chatData.response)) {
                // Convert block-based response to fast rendering format
                responseContent = `<BLOCKS_DATA>${JSON.stringify(
                  chatData.response
                )}</BLOCKS_DATA>`;
              }

              // Add YouTube links if present
              if (
                chatData.youtube_links &&
                Array.isArray(chatData.youtube_links) &&
                chatData.youtube_links.length > 0
              ) {
                const limitedVideos = chatData.youtube_links.slice(0, 3);
                const remainingVideos = chatData.youtube_links.slice(3);

                const youtubeContent = `\n\n<youtube-cards>${JSON.stringify({
                  videos: limitedVideos,
                  remainingVideos: remainingVideos,
                })}</youtube-cards>`;
                responseContent += youtubeContent;
              }

              pageMessages.push({
                id: `${chatData._id}-ai`,
                content: responseContent,
                type: "ai",
                timestamp: new Date(chatData.timestamp),
                mode: chatData.LLM_model === "gemini" ? "research" : "web",
                page: pageData.page,
                chat_id: typeof pageData.chat_id === 'object' && pageData.chat_id?._id ? pageData.chat_id._id : pageData.chat_id,
              });
            }
          });

          // Sort messages by timestamp to maintain chronological order
          pageMessages.sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
          );

          // Create a single chat for this entire page
          // console.log(pageData, "eeeeeeeeeeeeeeeee");
          const pageChat: Chat = {
            id: `history-page-${pageData.page}`,
            title: pageData.preview || `Page ${pageData.page}`,
            messages: pageMessages,
            createdAt:
              pageMessages.length > 0 ? pageMessages[0].timestamp : new Date(),
            updatedAt:
              pageMessages.length > 0
                ? pageMessages[pageMessages.length - 1].timestamp
                : new Date(),
            backendChatId: (() => {
              const chatWithId = pageData.chats.find((v) => v.chat_id);
              if (chatWithId && chatWithId.chat_id) {
                return typeof chatWithId.chat_id === 'object' && chatWithId.chat_id._id 
                  ? chatWithId.chat_id._id 
                  : chatWithId.chat_id;
              }
              return undefined;
            })(), // Extract the actual chat_id string
            hasUsedResearchMode: pageData.chats.some(
              (chat: any) => chat.LLM_model === "gemini"
            ),
            page: pageData.page,
          };

          historicalChats.push(pageChat);
        }
      });

      // Sort chats by page number in descending order (3, 2, 1)
      historicalChats.sort((a, b) => b.page - a.page);

      if (historicalChats.length > 0) {
        console.log(
          `✅ Loaded ${historicalChats.length} historical chats for user ${userId}`
        );

        // Load historical chats
        dispatch({ type: "LOAD_HISTORY", chats: historicalChats });

        // Update current page to the highest page number if we have history
        const maxPage = historicalChats.reduce(
          (max, chat) => Math.max(max, chat.page),
          0
        );
        dispatch({ type: "SET_CURRENT_PAGE", page: maxPage + 1 }); // +1 for the next new chat

        console.log(`📄 Set current page to: ${maxPage + 1}`);
      } else {
        console.log("📭 No valid chats found in history");
      }
    } catch (error) {
      console.error("❌ Error loading chat history:", error);
    }
  };

  // Load chat history whenever currentUser changes
  useEffect(() => {
    if (
      state.currentUser.username &&
      state.currentUser.username.trim() !== ""
    ) {
      console.log(
        "🔄 Loading chat history for user:",
        state.currentUser.username
      );
      loadChatHistory();
    }
  }, [state.currentUser.username]);

  const createNewChat = (): string => {
    const chatId = `chat-${Date.now()}`;
    // Calculate next page number - find the highest page number and add 1
    const maxPage = state.chats.reduce(
      (max, chat) => Math.max(max, chat.page),
      0
    );
    const nextPage = maxPage + 1;

    const newChat: Chat = {
      id: chatId,
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      hasUsedResearchMode: false,
      page: nextPage,
    };
    dispatch({ type: "CREATE_CHAT", chat: newChat });
    dispatch({ type: "SET_CURRENT_PAGE", page: nextPage });
    return chatId;
  };

  const selectChat = (chatId: string) => {
    dispatch({ type: "SELECT_CHAT", chatId });
  };

  const deleteChat = (chatId: string) => {
    dispatch({ type: "DELETE_CHAT", chatId });
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
      type: "user",
      timestamp: new Date(),
      mode,
      page: state.currentPage,
    };
    dispatch({ type: "ADD_MESSAGE", chatId, message: userMessage });
    dispatch({ type: "SET_TYPING", isTyping: true });
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const userId = state.currentUser.username;
    const aiMessageId = `msg-${Date.now()}-ai`;
    try {
      // Only proceed with GenAI and YouTube API calls if mode is 'research'
      if (mode === "research") {
        // Set initial loading state
        dispatch({
          type: "SET_LOADING_STATE",
          loadingState: "Processing your research query...",
        });
        // Create AI message for streaming
        const aiMessage: Message = {
          id: aiMessageId,
          content: "",
          type: "ai",
          timestamp: new Date(),
          mode: "research",
          isStreaming: true,
          isCurrentlyGenerating: true,
          page: state.currentPage,
        };
        dispatch({ type: "ADD_MESSAGE", chatId, message: aiMessage });
        // Start YouTube API call in parallel
        const youtubePromise = fetch(
          `${BACKEND_URL}/youtube/recommend?q=${encodeURIComponent(
            content.trim()
          )}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        ).then((res) => {
          if (!res.ok) throw new Error(`YouTube API failed: ${res.status}`);
          return res.json();
        });
        // Handle SSE streaming for GenAI
        try {
          const response = await fetch(`${BACKEND_URL}/genai/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: userId,
              query: content.trim(),
              lang: "auto",
              max_images: 3,
              page: state.currentPage,
            }),
          });
          if (!response.ok) {
            throw new Error(`GenAI API failed: ${response.status}`);
          }
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("Stream not available");
          }
          const decoder = new TextDecoder();
          let currentTextContent = "";
          let orderedBlocks: any[] = [];
          let backendChatId: string | null = null;
          let buffer = "";
          const processData = (data: any) => {
            console.log("📡 SSE Event:", data);

            switch (data.type) {
              case "init":
                backendChatId = data.chat_id;
                console.log("✅ Backend chat_id extracted:", backendChatId);
                if (backendChatId) {
                  dispatch({
                    type: "SET_BACKEND_CHAT_ID",
                    chatId,
                    backendChatId,
                  });
                  // Set the chat_id on the individual message
                  dispatch({
                    type: "SET_MESSAGE_CHAT_ID",
                    chatId,
                    messageId: aiMessageId,
                    messageChatId: backendChatId,
                  });
                }
                break;

              case "text_chunk":
                currentTextContent += data.content;
                // Update the last text block or create a new one
                const currentBlocks = [...orderedBlocks];

                // If the last block is text, update it; otherwise create a new text block
                if (
                  currentBlocks.length > 0 &&
                  currentBlocks[currentBlocks.length - 1].type === "text"
                ) {
                  currentBlocks[currentBlocks.length - 1].content =
                    currentTextContent;
                } else {
                  currentBlocks.push({
                    type: "text",
                    content: currentTextContent,
                    speak: data.content,
                  });
                }

                dispatch({
                  type: "UPDATE_MESSAGE",
                  chatId,
                  messageId: aiMessageId,
                  content: `<BLOCKS_DATA>${JSON.stringify(
                    currentBlocks
                  )}</BLOCKS_DATA>`,
                });
                break;

              case "image_loading":
                console.log("🖼️ Image loading:", data.message);
                break;

              case "image_complete":
                console.log("🖼️ Image complete:", data.content);

                // Add current text as a block if we have any
                if (currentTextContent.trim()) {
                  orderedBlocks.push({
                    type: "text",
                    content: currentTextContent,
                  });
                  currentTextContent = ""; // Reset for next text chunk
                }

                // Add the image block at the current position
                orderedBlocks.push(data.content);

                dispatch({
                  type: "UPDATE_MESSAGE",
                  chatId,
                  messageId: aiMessageId,
                  content: `<BLOCKS_DATA>${JSON.stringify(
                    orderedBlocks
                  )}</BLOCKS_DATA>`,
                });
                break;

              case "complete":
                console.log("✅ Streaming complete");
                // Finalize with text block if there's remaining content
                if (currentTextContent.trim()) {
                  orderedBlocks.push({
                    type: "text",
                    content: currentTextContent,
                  });
                }
                return true; // Signal completion

              case "error":
              case "fatal_error":
                console.error("❌ Streaming error:", data.message);
                currentTextContent += `\n\n⚠️ ${data.message}`;
                // Update with error message
                const errorBlocks = [
                  ...orderedBlocks,
                  { type: "text", content: currentTextContent },
                ];
                dispatch({
                  type: "UPDATE_MESSAGE",
                  chatId,
                  messageId: aiMessageId,
                  content: `<BLOCKS_DATA>${JSON.stringify(
                    errorBlocks
                  )}</BLOCKS_DATA>`,
                });

                if (data.type === "fatal_error") {
                  return true; // Signal completion
                }
                break;
            }
            return false;
          };
          // Process the stream
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              console.log("📡 Stream ended");
              break;
            }
            // Add new chunk to buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete lines
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim() === "") continue;

              if (line.startsWith("data: ")) {
                try {
                  const dataStr = line.slice(6).trim();
                  if (dataStr === "") continue;

                  const data = JSON.parse(dataStr);
                  const isComplete = processData(data);

                  if (isComplete) {
                    break;
                  }
                } catch (e) {
                  console.error("❌ Error parsing SSE data:", e, "Line:", line);
                }
              }
            }
          }
          // Wait for YouTube response and update the existing message
          const youtubeResponse = await youtubePromise.catch((error) => ({
            error,
          }));
          console.log("🎥 Full YouTube Response:", youtubeResponse);

          // Call YouTube update API if we have both chat_id and YouTube videos
          if (
            backendChatId &&
            youtubeResponse.videos &&
            Array.isArray(youtubeResponse.videos)
          ) {
            try {
              const updateResponse = await fetch(
                `${BACKEND_URL}/youtube/update_youtube_links`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    user_id: userId,
                    page: state.currentPage,
                    chat_id: backendChatId,
                    videos: youtubeResponse.videos,
                  }),
                }
              );

              if (updateResponse.ok) {
                console.log("✅ YouTube links successfully stored in database");
              } else {
                console.error(
                  "❌ Failed to update YouTube links:",
                  updateResponse.status
                );
              }
            } catch (error) {
              console.error("💥 Error calling YouTube update API:", error);
            }
          }

          let youtubeContent = "";
          if (youtubeResponse.error) {
            console.error("YouTube API Error:", youtubeResponse.error);
            youtubeContent =
              "\n\n## Related Videos\n\n⚠️ Video recommendations temporarily unavailable.";
          } else if (
            youtubeResponse.videos &&
            Array.isArray(youtubeResponse.videos)
          ) {
            // Show only first 3 videos by default
            const limitedVideos = youtubeResponse.videos.slice(0, 3);
            const remainingVideos = youtubeResponse.videos.slice(3);

            youtubeContent = `\n\n<youtube-cards>${JSON.stringify({
              videos: limitedVideos,
              remainingVideos: remainingVideos,
            })}</youtube-cards>`;
          }
          // Update the final message with YouTube content
          let finalContent = "";
          if (orderedBlocks.length > 0) {
            finalContent = `<BLOCKS_DATA>${JSON.stringify(
              orderedBlocks
            )}</BLOCKS_DATA>`;
          } else if (currentTextContent) {
            finalContent = currentTextContent;
          } else {
            finalContent = "⚠️ No content received from the server.";
          }
          dispatch({
            type: "UPDATE_MESSAGE",
            chatId,
            messageId: aiMessageId,
            content: finalContent + youtubeContent,
          });
          // Mark streaming as complete
          dispatch({
            type: "SET_MESSAGE_STREAMING",
            chatId,
            messageId: aiMessageId,
            isStreaming: false,
          });
          dispatch({
            type: "SET_CURRENTLY_GENERATING",
            chatId,
            messageId: null,
          });
        } catch (error) {
          console.error("GenAI Streaming Error:", error);
          dispatch({
            type: "UPDATE_MESSAGE",
            chatId,
            messageId: aiMessageId,
            content: "⚠️ Failed to generate content. Please try again.",
          });
          dispatch({
            type: "SET_MESSAGE_STREAMING",
            chatId,
            messageId: aiMessageId,
            isStreaming: false,
          });
          dispatch({
            type: "SET_CURRENTLY_GENERATING",
            chatId,
            messageId: null,
          });
        }
        // Mark research mode as used for this chat
        dispatch({ type: "SET_RESEARCH_MODE_USED", chatId });
      } else {
        // For non-research modes, use the /api/query endpoint
        try {
          // Get the current chat's backend chat_id if available
          const currentChat = state.chats.find((chat) => chat.id === chatId);
          const backendChatId = currentChat?.backendChatId;

          // Prepare request body with optional chat_id
          const requestBody: any = {
            user_id: userId,
            query: content.trim(),
            mode: mode || "general",
            lang: "auto",
            page: state.currentPage,
          };

          // Add chat_id if available
          if (backendChatId) {
            requestBody.chat_id = backendChatId;
          }
          const queryResponse = await fetch(`${BACKEND_URL}/query`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });
          if (!queryResponse.ok) {
            throw new Error(`Query API failed: ${queryResponse.status}`);
          }
          const queryData = await queryResponse.json();
          console.log("🔍 Query API Response:", queryData);
          // Extract content from the response
          let responseContent = "No response received.";
          if (
            queryData.lesson &&
            queryData.lesson.length > 0 &&
            queryData.lesson[0].script
          ) {
            responseContent = queryData.lesson[0].script;
          }
          // Check if Auto TTS is enabled and this is not research mode
          if (state.autoTTS && mode !== "research") {
            // Handle Auto TTS response without displaying the message
            handleAutoTTSResponse(chatId, responseContent, aiMessageId);
          } else {
            // Normal message display
            const apiMessage: Message = {
              id: aiMessageId,
              content: responseContent,
              type: "ai",
              timestamp: new Date(),
              isStreaming: true,
              isCurrentlyGenerating: true,
              page: state.currentPage,
            };
            dispatch({ type: "ADD_MESSAGE", chatId, message: apiMessage });
          }
        } catch (error) {
          console.error("Query API Error:", error);
          const errorMessage: Message = {
            id: aiMessageId,
            content:
              "Sorry, I encountered an error while processing your request. Please make sure the backend server is running.",
            type: "ai",
            timestamp: new Date(),
            isStreaming: true,
            isCurrentlyGenerating: true,
            page: state.currentPage,
          };
          dispatch({ type: "ADD_MESSAGE", chatId, message: errorMessage });
        }
      }
    } catch (error) {
      console.error("Backend API Error:", error);

      // Fallback response in case of complete failure
      const errorMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        content:
          "Sorry, I encountered an error while processing your request. Please make sure the backend server is running on.",
        type: "ai",
        timestamp: new Date(),
        isStreaming: true,
        isCurrentlyGenerating: true,
        page: state.currentPage,
      };
      dispatch({ type: "ADD_MESSAGE", chatId, message: errorMessage });
    } finally {
      dispatch({ type: "SET_TYPING", isTyping: false });
      dispatch({ type: "SET_LOADING_STATE", loadingState: null });
    }
  };
  const setTheme = (theme: Theme) => {
    dispatch({ type: "SET_THEME", theme });
  };

  const toggleSidebar = () => {
    dispatch({ type: "TOGGLE_SIDEBAR" });
  };

  const setDashboard = (show: boolean) => {
    dispatch({ type: "SET_DASHBOARD", show });
  };

  const setUserName = (name: string) => {
    dispatch({ type: "SET_USER_NAME", name });
  };

  const setCurrentUser = (user: UserData) => {
    // Check if we're switching to a different user (and the app has been initialized)
    const isUserChange =
      state.hasInitializedUser &&
      state.currentUser.username !== user.username &&
      state.currentUser.username !== "";

    dispatch({ type: "SET_CURRENT_USER", user });
    // Save to localStorage
    localStorage.setItem("currentUser", JSON.stringify(user));

    // Reload the page if switching to a different user (but not on initial load)
    if (isUserChange) {
      console.log(
        `🔄 User changed from "${state.currentUser.username}" to "${user.username}" - reloading page`
      );
      setTimeout(() => {
        window.location.reload();
      }, 500); // Small delay to show the switch notification
    }
  };

  const createUser = async (name: string): Promise<UserData> => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    try {
      const response = await fetch(`${BACKEND_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create user: ${response.status}`);
      }

      const userData: UserData = await response.json();

      // Check if we're creating a different user (not the initial empty user)
      const isNewUserCreation =
        state.hasInitializedUser &&
        state.currentUser.username !== userData.username &&
        state.currentUser.username !== "";

      // Save to localStorage and set as current user
      setCurrentUser(userData);

      // If this is a new user creation (not initial setup), reload the page
      if (isNewUserCreation) {
        console.log(
          `🔄 New user "${userData.username}" created - reloading page`
        );
        setTimeout(() => {
          window.location.reload();
        }, 1000); // Slightly longer delay to show the creation success message
      }

      return userData;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  };

  const setMode = (mode: ChatMode) => {
    dispatch({ type: "SET_MODE", mode });
  };

  const toggleAurora = () => {
    dispatch({ type: "TOGGLE_AURORA" });
  };

  const toggleLiveMode = () => {
    dispatch({ type: "TOGGLE_LIVE_MODE" });
  };

  const toggleAutoTTS = () => {
    dispatch({ type: "TOGGLE_AUTO_TTS" });
  };

  const setLoadingState = (loadingState: string | null) => {
    dispatch({ type: "SET_LOADING_STATE", loadingState });
  };

  const setCurrentPage = (page: number) => {
    dispatch({ type: "SET_CURRENT_PAGE", page });
  };

  const addAIMessage = (content: string) => {
    let chatId = state.currentChatId;
    if (!chatId) {
      chatId = createNewChat();
    }

    const aiMessage: Message = {
      id: `msg-${Date.now()}-ai`,
      content,
      type: "ai",
      timestamp: new Date(),
      page: state.currentPage,
    };

    dispatch({ type: "ADD_MESSAGE", chatId, message: aiMessage });
  };

  const setCurrentlyGenerating = (chatId: string, messageId: string | null) => {
    dispatch({ type: "SET_CURRENTLY_GENERATING", chatId, messageId });
  };

  const setMessageStreaming = (
    chatId: string,
    messageId: string,
    isStreaming: boolean
  ) => {
    dispatch({ type: "SET_MESSAGE_STREAMING", chatId, messageId, isStreaming });
  };

  const setBackendChatId = (chatId: string, backendChatId: string) => {
    dispatch({ type: "SET_BACKEND_CHAT_ID", chatId, backendChatId });
  };

  const setMessageChatId = (chatId: string, messageId: string, messageChatId: string) => {
    dispatch({ type: "SET_MESSAGE_CHAT_ID", chatId, messageId, messageChatId });
  };

  const setResearchModeUsed = (chatId: string) => {
    dispatch({ type: "SET_RESEARCH_MODE_USED", chatId });
  };

  const markMessageAutoTTSPlayed = (chatId: string, messageId: string) => {
    dispatch({ type: "MARK_MESSAGE_AUTO_TTS_PLAYED", chatId, messageId });
  };

  const handleAutoTTSResponse = (chatId: string, content: string, messageId: string) => {
    dispatch({ type: "HANDLE_AUTO_TTS_RESPONSE", chatId, content, messageId });
  };

  const value: ChatContextType = {
    state,
    dispatch,
    createNewChat,
    selectChat,
    deleteChat,
    sendMessage,
    addAIMessage,
    setMessageStreaming,
    setCurrentlyGenerating,
    setBackendChatId,
    setMessageChatId,
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
    toggleAutoTTS,
    setLoadingState,
    setCurrentPage,
    loadChatHistory,
    markMessageAutoTTSPlayed,
    handleAutoTTSResponse,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
