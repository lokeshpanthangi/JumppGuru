import React, { useEffect, useState } from 'react';
import { ArrowLeft, MessageSquare, Send, Calendar, Flame, TrendingUp, Clock, Users } from 'lucide-react';
import { useChatContext } from '../contexts/ChatContext';

const FloatingOrb: React.FC<{ className?: string; delay?: number }> = ({ 
  className = '', 
  delay = 0 
}) => (
  <div 
    className={`absolute rounded-full animate-float ${className}`}
    style={{ animationDelay: `${delay}s` }}
  />
);

export const Dashboard: React.FC = () => {
  const { state, setDashboard } = useChatContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalMessages = state.chats.reduce((acc, chat) => acc + chat.messages.length, 0);
  const userMessages = state.chats.reduce(
    (acc, chat) => acc + chat.messages.filter(m => m.type === 'user').length, 
    0
  );
  
  const today = new Date();
  const todayChats = state.chats.filter(chat => {
    const chatDate = new Date(chat.createdAt);
    return chatDate.toDateString() === today.toDateString();
  }).length;

  const stats = [
    {
      title: 'Total Conversations',
      value: state.chats.length.toString(),
      icon: MessageSquare,
      change: '+12%',
      changeType: 'positive' as const,
    },
    {
      title: 'Messages Sent',
      value: userMessages.toString(),
      icon: Send,
      change: '+8%',
      changeType: 'positive' as const,
    },
    {
      title: "Today's Sessions",
      value: todayChats.toString(),
      icon: Calendar,
      change: todayChats > 0 ? '+100%' : '0%',
      changeType: todayChats > 0 ? 'positive' : 'neutral' as const,
    },
    {
      title: 'Learning Streak',
      value: '7 days',
      icon: Flame,
      change: '+1 day',
      changeType: 'positive' as const,
    },
  ];

  const recentActivity = [
    {
      action: 'Started a new conversation',
      time: '2 minutes ago',
      icon: MessageSquare,
    },
    {
      action: 'Completed research session',
      time: '1 hour ago',
      icon: TrendingUp,
    },
    {
      action: 'Used Web Search mode',
      time: '3 hours ago',
      icon: Calendar,
    },
    {
      action: 'Joined JumpApp',
      time: '7 days ago',
      icon: Users,
    },
  ];

  const insights = [
    {
      title: 'Most Active Hour',
      value: '2:00 PM - 3:00 PM',
      description: 'You tend to be most productive in the afternoon',
      icon: Clock,
    },
    {
      title: 'Preferred Mode',
      value: 'Research',
      description: '67% of your queries use research mode',
      icon: TrendingUp,
    },
    {
      title: 'Average Session',
      value: '15 minutes',
      description: 'Perfect length for focused learning',
      icon: MessageSquare,
    },
  ];

  return (
    <div 
      className="flex-1 bg-chat-bg transition-all duration-500 ease-in-out relative"
    >
      <div className="relative z-10 p-8">
        {/* Header */}
        <div className={`mb-8 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <button
            onClick={() => setDashboard(false)}
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors duration-fast mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Chat</span>
          </button>
          
          <h1 className="text-4xl font-bold mb-2">
            <span className="gradient-welcome">Dashboard</span>
          </h1>
          <p className="text-xl text-text-secondary">
            Welcome back, {state.userName}! Here's your learning overview.
          </p>
        </div>

        {/* Stats Grid */}
        <div 
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 ${
            mounted ? 'animate-fade-in-up' : 'opacity-0'
          }`}
          style={{ animationDelay: '0.1s' }}
        >
          {stats.map((stat, index) => (
            <div
              key={stat.title}
              className="bg-surface-elevated border border-input-border rounded-xl p-6 shadow-elevated hover:shadow-xl hover:border-brand-primary/20 transition-all duration-300 group cursor-pointer"
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-surface border border-input-border group-hover:border-brand-primary/30 group-hover:bg-brand-primary/5 transition-all duration-300">
                  <stat.icon className="w-5 h-5 text-brand-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className={`text-xs px-2 py-1 rounded-full transition-all duration-300 ${
                  stat.changeType === 'positive' 
                    ? 'bg-brand-primary/10 text-brand-primary group-hover:bg-brand-primary/20' 
                    : 'bg-button-secondary text-text-muted'
                }`}>
                  {stat.change}
                </div>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-text-primary">{stat.value}</h3>
                <p className="text-sm text-text-secondary">{stat.title}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div 
            className={`bg-surface-elevated border border-input-border rounded-xl p-6 shadow-elevated ${
              mounted ? 'animate-fade-in-up' : 'opacity-0'
            }`}
            style={{ animationDelay: '0.3s' }}
          >
            <h2 className="text-xl font-bold text-text-primary mb-6">Recent Activity</h2>
            
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg hover:bg-button-secondary transition-all duration-300 group cursor-pointer">
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-full flex items-center justify-center group-hover:bg-brand-primary/20 transition-all duration-300">
                    <activity.icon className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{activity.action}</p>
                    <p className="text-xs text-text-muted">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Learning Insights */}
          <div 
            className={`bg-surface-elevated border border-input-border rounded-xl p-6 shadow-elevated ${
              mounted ? 'animate-fade-in-up' : 'opacity-0'
            }`}
            style={{ animationDelay: '0.4s' }}
          >
            <h2 className="text-xl font-bold text-text-primary mb-6">Learning Insights</h2>
            
            <div className="space-y-6">
              {insights.map((insight, index) => (
                <div key={index} className="space-y-2 p-3 rounded-lg hover:bg-button-secondary/50 transition-all duration-300 group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <insight.icon className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform duration-300" />
                    <h3 className="font-medium text-text-primary">{insight.title}</h3>
                  </div>
                  <p className="text-lg font-semibold text-text-primary ml-7">{insight.value}</p>
                  <p className="text-sm text-text-muted ml-7">{insight.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};