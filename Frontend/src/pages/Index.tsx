import React from 'react';
import { useChatContext } from '../contexts/ChatContext';
import { ChatArea } from '../components/ChatArea';
import { Dashboard } from '../components/Dashboard';

const Index: React.FC = () => {
  const { state } = useChatContext();

  return (
    <>
      {state.showDashboard ? (
        <div className="animate-fade-in">
          <Dashboard />
        </div>
      ) : (
        <div className="animate-fade-in">
          <ChatArea />
        </div>
      )}
    </>
  );
};

export default Index;
