import React from 'react';
import { ChatProvider, useChatContext } from '../contexts/ChatContext';
import { Sidebar } from '../components/Sidebar';
import { ChatArea } from '../components/ChatArea';
import { Dashboard } from '../components/Dashboard';
import { ThemeToggle } from '../components/ThemeToggle';

const AppContent: React.FC = () => {
  const { state } = useChatContext();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        {state.showDashboard ? <Dashboard /> : <ChatArea />}
      </div>
      <ThemeToggle />
    </div>
  );
};

const Index = () => {
  return (
    <ChatProvider>
      <AppContent />
    </ChatProvider>
  );
};

export default Index;
