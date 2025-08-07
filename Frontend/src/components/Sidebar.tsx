import React, { useState } from 'react';
import { 
  MessageSquarePlus, 
  Grid3X3, 
  Trash2, 
  Settings, 
  ChevronLeft,
  User,
  Circle,
  Menu,
  LogOut,
  UserCircle
} from 'lucide-react';
import { useChatContext } from '../contexts/ChatContext';

const formatChatDate = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const chatDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (chatDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (chatDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return chatDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: chatDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
};

const getTimeOfDayGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const Sidebar: React.FC = () => {
  const { 
    state, 
    createNewChat, 
    selectChat, 
    deleteChat, 
    toggleSidebar, 
    setDashboard 
  } = useChatContext();
  
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const handleNewChat = () => {
    createNewChat();
  };

  const handleChatSelect = (chatId: string) => {
    selectChat(chatId);
  };

  const handleChatDelete = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    deleteChat(chatId);
  };

  const handleDashboard = () => {
    setDashboard(true);
  };

  const handleLogout = () => {
    // Add logout logic here
    console.log('Logout clicked');
    setShowSettingsMenu(false);
  };

  const handleProfile = () => {
    // Add profile logic here
    console.log('Profile clicked');
    setShowSettingsMenu(false);
  };

  return (
    <>
      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full bg-sidebar-bg border-r border-sidebar-border transition-all duration-sidebar z-40 ${
          state.sidebarCollapsed ? 'w-16' : 'w-80'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`border-b border-sidebar-border ${state.sidebarCollapsed ? 'p-3' : 'p-6'}`}>
            <div className={`flex items-center gap-3 ${state.sidebarCollapsed ? 'justify-center mb-3' : 'justify-between mb-6'}`}>
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer"
                  onClick={state.sidebarCollapsed ? toggleSidebar : undefined}
                >
                  <img src="/logo.png" alt="JumppGuru Logo" className="w-full h-full object-contain" />
                </div>
                {!state.sidebarCollapsed && (
                  <h1 className="text-xl font-bold text-text-primary">JumppGuru</h1>
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
                className={`w-full flex items-center ${state.sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'} rounded-lg transition-all duration-fast text-left ${
                  state.showDashboard
                    ? 'bg-[hsl(var(--input-mint-bg))] border border-[hsl(var(--input-mint-border))] shadow-[0_0_8px_hsl(var(--input-mint-glow))]'
                    : 'bg-button-secondary hover:bg-button-secondary-hover'
                }`}
                title={state.sidebarCollapsed ? 'Dashboard' : ''}
              >
                <Grid3X3 className={`w-5 h-5 ${state.showDashboard ? 'text-brand-primary' : 'text-text-secondary'}`} />
                {!state.sidebarCollapsed && (
                  <span className={`font-medium ${state.showDashboard ? 'text-brand-primary' : 'text-text-primary'}`}>Dashboard</span>
                )}
              </button>
              
              <button
                onClick={handleNewChat}
                className={`w-full flex items-center ${state.sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'} rounded-lg transition-all duration-fast ${
                  !state.showDashboard && !state.currentChatId
                    ? 'bg-[hsl(var(--input-mint-bg))] border border-[hsl(var(--input-mint-border))] shadow-[0_0_8px_hsl(var(--input-mint-glow))] text-brand-primary'
                    : 'bg-brand-primary hover:bg-brand-primary-hover text-white'
                }`}
                title={state.sidebarCollapsed ? 'New Chat' : ''}
              >
                <MessageSquarePlus className="w-5 h-5" />
                {!state.sidebarCollapsed && (
                  <span className="font-medium">New Chat</span>
                )}
              </button>
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-hidden">
            {!state.sidebarCollapsed && (
              <div className="p-4">
                <h3 className="text-sm font-medium text-text-secondary mb-3">Chat History</h3>
              </div>
            )}
            
            <div className={`flex-1 overflow-y-auto scrollbar-thin pb-4 ${state.sidebarCollapsed ? 'px-2' : 'px-4'}`}>
              {state.chats.length === 0 ? (
                !state.sidebarCollapsed && (
                  <div className="text-center py-8">
                    <p className="text-text-muted text-sm">No chats yet</p>
                    <p className="text-text-muted text-xs mt-1">Start a new conversation</p>
                  </div>
                )
              ) : (
                <div className="space-y-1">
                  {state.chats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => handleChatSelect(chat.id)}
                      className={`group relative ${state.sidebarCollapsed ? 'p-2' : 'p-3'} rounded-lg cursor-pointer transition-colors duration-fast ${
                        state.currentChatId === chat.id
                          ? 'bg-sidebar-item-active'
                          : 'hover:bg-sidebar-item-hover'
                      }`}
                      title={state.sidebarCollapsed ? chat.title : ''}
                    >
                      {state.sidebarCollapsed ? (
                        <div className="flex justify-center">
                          <Menu className="w-4 h-4 text-text-secondary" />
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
          <div className={`border-t border-sidebar-border ${state.sidebarCollapsed ? 'p-3' : 'p-4'}`}>
            <div className={`flex items-center ${state.sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
              <div className={`flex items-center ${state.sidebarCollapsed ? 'flex-col gap-1' : 'gap-3'}`}>
                <div className="relative">
                  <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <Circle className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-brand-primary fill-current" />
                </div>
                {!state.sidebarCollapsed && (
                  <div>
                    <p className="text-sm font-medium text-text-primary">{state.userName}</p>
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
                        onClick={handleProfile}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-button-secondary transition-colors duration-fast"
                      >
                        <UserCircle className="w-4 h-4 text-text-secondary" />
                        <span className="text-sm text-text-primary">Profile</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-button-secondary transition-colors duration-fast"
                      >
                        <LogOut className="w-4 h-4 text-danger" />
                        <span className="text-sm text-danger">Logout</span>
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

    </>
  );
};