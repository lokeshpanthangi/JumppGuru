import React, { useState } from "react";
import {
  MessageSquarePlus,
  MessageSquare,
  Grid3X3,
  Trash2,
  Settings,
  ChevronLeft,
  User,
  Circle,
  Menu,
  LogOut,
  UserCircle,
  Brain,
  UserPlus,
  Users,
  Volume2,
  Sun,
  Moon,
} from "lucide-react";
import { useChatContext } from "../contexts/ChatContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CreateUserModal } from "./ui/CreateUserModal";
import { SwitchUserModal } from "./ui/SwitchUserModal";

const formatChatDate = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const chatDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  if (chatDate.getTime() === today.getTime()) {
    return "Today";
  } else if (chatDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else {
    return chatDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        chatDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
};

const getTimeOfDayGreeting = (): string => {
  // Get current time in IST (Indian Standard Time - UTC+5:30)
  const now = new Date();
  const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000); // Add 5.5 hours to UTC
  const hour = istTime.getUTCHours();

  if (hour < 12) {
    const morningMessages = [
      "Coffee Time",
      "Sunny Start",
      "Let's Start",
      "Sun's Out",
    ];
    return morningMessages[Math.floor(Math.random() * morningMessages.length)];
  }

  if (hour < 17) {
    const afternoonMessages = ["Midday Vibes", "Sunny Noon", "Good Afternoon"];
    return afternoonMessages[
      Math.floor(Math.random() * afternoonMessages.length)
    ];
  }

  const eveningMessages = ["Hello Batman", "Evening, User", "Dream On, User"];
  return eveningMessages[Math.floor(Math.random() * eveningMessages.length)];
};

export const Sidebar: React.FC = () => {
  const {
    state,
    createNewChat,
    selectChat,
    deleteChat,
    toggleSidebar,
    setDashboard,
    createUser,
    setCurrentUser,
    toggleAutoTTS,
    setTheme,
  } = useChatContext();
  const location = useLocation();
  const navigate = useNavigate();

  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showSwitchUserModal, setShowSwitchUserModal] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isSwitchingUser, setIsSwitchingUser] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const handleNewChat = () => {
    // If we're not on the main page, navigate there first
    if (location.pathname !== "/") {
      navigate("/");
    }
    createNewChat();
  };

  const handleChatSelect = (chatId: string) => {
    // If we're not on the main page, navigate there first
    if (location.pathname !== "/") {
      navigate("/");
    }
    selectChat(chatId);
  };

  const handleChatDelete = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    deleteChat(chatId);
  };

  const handleDashboard = () => {
    // Navigate to main page and show dashboard
    if (location.pathname !== "/") {
      navigate("/");
    }
    setDashboard(true);
  };

  const handleLogout = () => {
    // Add logout logic here
    console.log("Logout clicked");
    setShowSettingsMenu(false);
  };

  const handleProfile = () => {
    // Add profile logic here
    console.log("Profile clicked");
    setShowSettingsMenu(false);
  };

  const handleCreateUser = async (name: string) => {
    setIsCreatingUser(true);
    try {
      const userData = await createUser(name);
      setNotification(`User "${userData.name}" created successfully!`);
      setTimeout(() => setNotification(null), 3000);
      setShowCreateUserModal(false);
    } catch (error) {
      console.error("Failed to create user:", error);
      setNotification("Failed to create user. Please try again.");
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleSwitchUser = async (user: any) => {
    setIsSwitchingUser(true);
    try {
      setCurrentUser(user);
      setNotification(`Switched to user "${user.name}"`);
      setTimeout(() => setNotification(null), 3000);
      setShowSwitchUserModal(false);
    } catch (error) {
      console.error("Failed to switch user:", error);
      setNotification("Failed to switch user. Please try again.");
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsSwitchingUser(false);
    }
  };

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`h-full transition-all duration-sidebar ease-sidebar flex-shrink-0 border-r border-sidebar-border ${
          state.sidebarCollapsed ? "w-16 bg-chat-bg" : "w-80 bg-sidebar-bg"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div
            className={`transition-all duration-sidebar ease-sidebar ${
              state.sidebarCollapsed ? "p-3" : "p-6"
            }`}
          >
            <div
              className={`flex items-center gap-3 transition-all duration-sidebar ease-sidebar ${
                state.sidebarCollapsed
                  ? "justify-center mb-3"
                  : "justify-between mb-6"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer"
                  onClick={state.sidebarCollapsed ? toggleSidebar : undefined}
                >
                  <img
                    src="/logo.png"
                    alt="JumpApp Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                {!state.sidebarCollapsed && (
                  <h1 className="text-xl font-bold text-text-primary">
                    JumpApp
                  </h1>
                )}
              </div>
              {!state.sidebarCollapsed && (
                <button
                  onClick={toggleSidebar}
                  className="p-1 hover:bg-button-secondary-hover rounded transition-colors duration-fast"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft className="w-4 h-4 text-text-secondary" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={handleDashboard}
                className={`w-full flex items-center transition-all duration-sidebar ease-sidebar ${
                  state.sidebarCollapsed
                    ? "justify-center px-2 py-3"
                    : "gap-3 px-4 py-3"
                } rounded-lg text-left ${
                  state.showDashboard && location.pathname === "/"
                    ? "bg-[hsl(var(--input-mint-bg))] border border-[hsl(var(--input-mint-border))] shadow-[0_0_8px_hsl(var(--input-mint-glow))]"
                    : "bg-button-secondary hover:bg-button-secondary-hover"
                }`}
                title={state.sidebarCollapsed ? "Dashboard" : ""}
              >
                <Grid3X3
                  className={`w-5 h-5 ${
                    state.showDashboard && location.pathname === "/"
                      ? "text-brand-primary"
                      : "text-text-secondary"
                  }`}
                />
                {!state.sidebarCollapsed && (
                  <span
                    className={`font-medium ${
                      state.showDashboard && location.pathname === "/"
                        ? "text-brand-primary"
                        : "text-text-primary"
                    }`}
                  >
                    Dashboard
                  </span>
                )}
              </button>

              <Link
                to="/deep-learning"
                className={`w-full flex items-center transition-all duration-sidebar ease-sidebar ${
                  state.sidebarCollapsed
                    ? "justify-center px-2 py-3"
                    : "gap-3 px-4 py-3"
                } rounded-lg text-left ${
                  location.pathname === "/deep-learning"
                    ? "bg-[hsl(var(--input-mint-bg))] border border-[hsl(var(--input-mint-border))] shadow-[0_0_8px_hsl(var(--input-mint-glow))]"
                    : "bg-button-secondary hover:bg-button-secondary-hover"
                }`}
                title={state.sidebarCollapsed ? "Deep Learning" : ""}
              >
                <Brain
                  className={`w-5 h-5 ${
                    location.pathname === "/deep-learning"
                      ? "text-brand-primary"
                      : "text-text-secondary"
                  }`}
                />
                {!state.sidebarCollapsed && (
                  <span
                    className={`font-medium ${
                      location.pathname === "/deep-learning"
                        ? "text-brand-primary"
                        : "text-text-primary"
                    }`}
                  >
                    Deep Learning
                  </span>
                )}
              </Link>

              <button
                onClick={handleNewChat}
                className={`w-full flex items-center transition-all duration-sidebar ease-sidebar ${
                  state.sidebarCollapsed
                    ? "justify-center px-2 py-3"
                    : "gap-3 px-4 py-3"
                } rounded-lg ${
                  !state.showDashboard && !state.currentChatId
                    ? "bg-brand-primary hover:bg-brand-primary-hover text-[hsl(var(--button-secondary))]"
                    : "bg-brand-primary hover:bg-brand-primary-hover text-[hsl(var(--button-secondary))]"
                }`}
                title={state.sidebarCollapsed ? "New Chat" : ""}
              >
                <MessageSquarePlus className="w-5 h-5" />
                {!state.sidebarCollapsed && (
                  <span className="font-medium">New Chat</span>
                )}
              </button>

              {/* Auto TTS Toggle */}
              <div
                className={`flex items-center transition-all duration-sidebar ease-sidebar ${
                  state.sidebarCollapsed
                    ? "justify-center px-2 py-2"
                    : "justify-between px-4 py-2"
                } rounded-lg bg-button-secondary`}
              >
                {!state.sidebarCollapsed && (
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm text-text-primary">Auto TTS</span>
                  </div>
                )}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.autoTTS}
                    onChange={toggleAutoTTS}
                    className="sr-only peer"
                  />
                  <div
                    className={`relative w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary ${
                      state.sidebarCollapsed ? "scale-75" : ""
                    }`}
                  ></div>
                </label>
              </div>
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!state.sidebarCollapsed && (
              <div className="flex-shrink-0 p-4">
                <h3 className="text-sm font-medium text-text-secondary mb-3">
                  Chat History
                </h3>
              </div>
            )}

            <div
              className={`flex-1 overflow-y-auto scrollbar-thin pb-4 ${
                state.sidebarCollapsed ? "px-2" : "px-4"
              }`}
            >
              {state.chats.length === 0 ? (
                !state.sidebarCollapsed && (
                  <div className="text-center py-8">
                    <p className="text-text-muted text-sm">No chats yet</p>
                    <p className="text-text-muted text-xs mt-1">
                      Start a new conversation
                    </p>
                  </div>
                )
              ) : (
                <div className="space-y-1">
                  {state.chats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => handleChatSelect(chat.id)}
                      className={`group relative ${
                        state.sidebarCollapsed ? "p-2" : "p-3"
                      } rounded-lg cursor-pointer transition-colors duration-fast ${
                        state.currentChatId === chat.id
                          ? "bg-sidebar-item-active"
                          : "hover:bg-sidebar-item-hover"
                      }`}
                      title={state.sidebarCollapsed ? chat.title : ""}
                    >
                      {state.sidebarCollapsed ? (
                        <div className="flex flex-col items-center gap-1">
                          <MessageSquare className="w-4 h-4 text-text-secondary" />
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-text-primary truncate">
                              {chat.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-text-muted">
                                {formatChatDate(chat.updatedAt)}
                              </span>
                              {chat.messages.length > 0 && (
                                <span className="text-xs text-text-muted">
                                  • {chat.messages.length} messages
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={(e) => handleChatDelete(e, chat.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-button-secondary-hover rounded transition-all duration-fast"
                            aria-label="Delete chat"
                          >
                            <Trash2 className="w-4 h-4 text-danger" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* User Section */}
          <div
            className={`transition-all duration-sidebar ease-sidebar ${
              state.sidebarCollapsed ? "p-3" : "p-4"
            }`}
          >
            <div
              className={`flex items-center transition-all duration-sidebar ease-sidebar ${
                state.sidebarCollapsed ? "justify-center" : "justify-between"
              }`}
            >
              <div
                className={`flex items-center transition-all duration-sidebar ease-sidebar ${
                  state.sidebarCollapsed ? "flex-col gap-1" : "gap-3"
                }`}
              >
                <div className="relative">
                  <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <Circle className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-brand-primary fill-current" />
                </div>
                {!state.sidebarCollapsed && (
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {state.userName}
                    </p>
                    <p className="text-xs text-brand-primary">Online</p>
                  </div>
                )}
              </div>

              {!state.sidebarCollapsed && (
                <div className="relative">
                  <button
                    onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                    className="p-2 hover:bg-button-secondary-hover rounded-lg transition-colors duration-fast"
                    aria-label="Settings"
                  >
                    <Settings className="w-4 h-4 text-text-secondary" />
                  </button>

                  {/* Settings Dropdown */}
                  {showSettingsMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-surface-elevated border border-input-border rounded-lg shadow-lg overflow-hidden z-10">
                      <button
                        onClick={() => {
                          setShowCreateUserModal(true);
                          setShowSettingsMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-button-secondary transition-colors duration-fast"
                      >
                        <UserPlus className="w-4 h-4 text-text-secondary" />
                        <span className="text-sm text-text-primary">
                          Create New User
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setShowSwitchUserModal(true);
                          setShowSettingsMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-button-secondary transition-colors duration-fast"
                      >
                        <Users className="w-4 h-4 text-text-secondary" />
                        <span className="text-sm text-text-primary">
                          Switch User
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setTheme(state.theme === 'light' ? 'dark' : 'light');
                          setShowSettingsMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-button-secondary transition-colors duration-fast"
                      >
                        {state.theme === 'light' ? (
                          <Moon className="w-4 h-4 text-text-secondary" />
                        ) : (
                          <Sun className="w-4 h-4 text-text-secondary" />
                        )}
                        <span className="text-sm text-text-primary">
                          {state.theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {!state.sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 bg-brand-primary text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          {notification}
        </div>
      )}

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => !isCreatingUser && setShowCreateUserModal(false)}
        onCreateUser={handleCreateUser}
        isCreating={isCreatingUser}
      />

      {/* Switch User Modal */}
      <SwitchUserModal
        isOpen={showSwitchUserModal}
        onClose={() => !isSwitchingUser && setShowSwitchUserModal(false)}
        onSwitchUser={handleSwitchUser}
        currentUsername={state.currentUser.username}
        isLoading={isSwitchingUser}
      />
    </>
  );
};
