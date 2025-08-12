import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Upload, FileText, Video, Image, Music, Plus, Play, Pause, Download, Share2, Settings, BarChart3, Brain, Zap, Eye, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

type DeepLearningEntry = {
  id: string;
  title: string;
  category?: string;
  date: string;
  sources?: number;
  summary?: string;
  tags?: string[];
  featured?: boolean;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  messageCount?: number;
  progress?: number;
  messages?: {
    chatId: string;
    messageId: string;
    content: string;
    chatTitle: string;
  }[];
};

interface Source {
  id: string;
  name: string;
  type: 'pdf' | 'video' | 'image' | 'audio' | 'text';
  size: string;
  uploadDate: string;
}

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const Notebook: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [notebook, setNotebook] = useState<DeepLearningEntry | null>(null);

  useEffect(() => {
    if (id) {
      // Fetch notebook data from localStorage
      const raw = localStorage.getItem('deep-learning-history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const foundNotebook = parsed.find((item: DeepLearningEntry) => item.id === id);
          setNotebook(foundNotebook || null);
        }
      } else {
        // Sample data fallback
        const sampleData: DeepLearningEntry[] = [
          {
            id: '1',
            title: 'How To Build A Neural Network from Scratch',
            category: 'Neural Networks',
            date: '2025-01-15T10:30:00Z',
            sources: 46,
            summary: 'A comprehensive guide to building neural networks from the ground up, covering fundamental concepts and practical implementation.',
            tags: ['neural-networks', 'machine-learning', 'deep-learning'],
            featured: true
          },
          {
            id: '2',
            title: 'Transformer Architecture: The Complete Guide',
            category: 'Deep Learning',
            date: '2025-01-10T14:20:00Z',
            sources: 45,
            summary: 'Understanding the transformer architecture that revolutionized natural language processing and computer vision.',
            tags: ['transformers', 'attention', 'nlp'],
            featured: true
          },
          {
            id: '3',
            title: 'Computer Vision with Convolutional Networks',
            category: 'Computer Vision',
            date: '2025-01-08T09:15:00Z',
            sources: 24,
            summary: 'Exploring CNNs and their applications in image recognition, object detection, and computer vision tasks.',
            tags: ['cnn', 'computer-vision', 'image-processing'],
            featured: true
          }
        ];
        const foundNotebook = sampleData.find(item => item.id === id);
        setNotebook(foundNotebook || null);
      }
    }
  }, [id]);
  const [sources, setSources] = useState<Source[]>([
    {
      id: '1',
      name: 'Neural Networks Fundamentals.pdf',
      type: 'pdf',
      size: '2.4 MB',
      uploadDate: '2025-01-15'
    },
    {
      id: '2', 
      name: 'Deep Learning Lecture.mp4',
      type: 'video',
      size: '156 MB',
      uploadDate: '2025-01-14'
    },
    {
      id: '3',
      name: 'CNN Architecture.png',
      type: 'image', 
      size: '890 KB',
      uploadDate: '2025-01-13'
    }
  ]);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m ready to help you with questions about your uploaded sources. What would you like to know?',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isSourcesCollapsed, setIsSourcesCollapsed] = useState(false);

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'pdf': return FileText;
      case 'video': return Video;
      case 'image': return Image;
      case 'audio': return Music;
      default: return FileText;
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: `Based on your sources, I can help you with that. Let me analyze the content from your uploaded materials...`,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <>
      <Helmet>
        <title>{notebook?.title || 'Notebook'} - JumpApp</title>
        <meta name="description" content="Interactive notebook for deep learning exploration" />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-background px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/deep-learning')}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-hover transition-colors"
              >
                <img 
                  src="/logo.png" 
                  alt="JumpApp Logo" 
                  className="w-8 h-8 object-contain"
                />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-text-primary">
                  {notebook?.title || 'Loading...'}
                </h1>
                {notebook?.category && (
                  <p className="text-sm text-text-muted">{notebook.category}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-7rem)] max-h-[calc(100vh-7rem)] overflow-hidden">
            {/* Sources Panel - Left */}
            <div className={`${isSourcesCollapsed ? 'lg:col-span-1 lg:w-16' : 'lg:col-span-3'} bg-surface-elevated rounded-xl border border-input-border flex flex-col h-full max-h-full overflow-hidden transition-all duration-500 ease-in-out`}>
            <div className="p-3 border-b border-input-border flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                {!isSourcesCollapsed && <h2 className="text-lg font-semibold text-text-primary">Sources</h2>}
                <button 
                  onClick={() => setIsSourcesCollapsed(!isSourcesCollapsed)}
                  className="p-2 rounded-lg bg-brand-primary text-white hover:bg-brand-primary-hover transition-colors"
                  title={isSourcesCollapsed ? 'Expand Sources' : 'Collapse Sources'}
                >
                  {isSourcesCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
              </div>
              {!isSourcesCollapsed && (
                <p className="text-sm text-text-secondary">
                  Saved sources will appear here. Click Add source above to add PDFs, websites, text, videos, or audio files.
                </p>
              )}
            </div>
            
            {isSourcesCollapsed ? (
              <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
                {sources.map((source) => {
                  const IconComponent = getSourceIcon(source.type);
                  return (
                    <motion.div
                      key={source.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-2 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 transition-colors cursor-pointer flex items-center justify-center"
                      title={source.name}
                    >
                      <IconComponent className="w-4 h-4 text-brand-primary" />
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                {sources.map((source) => {
                  const IconComponent = getSourceIcon(source.type);
                  return (
                    <motion.div
                      key={source.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg bg-background border border-input-border hover:bg-surface-hover transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-brand-primary/10">
                          <IconComponent className="w-4 h-4 text-brand-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-text-primary truncate">
                            {source.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                            <span>{source.size}</span>
                            <span>•</span>
                            <span>{source.uploadDate}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

            {/* Chat Panel - Middle */}
            <div className={`${isSourcesCollapsed ? 'lg:col-span-8' : 'lg:col-span-6'} bg-surface-elevated rounded-xl border border-input-border flex flex-col h-full max-h-full overflow-hidden transition-all duration-500 ease-in-out`}>
            <div className="p-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-brand-primary" />
                <h2 className="text-lg font-semibold text-text-primary">AI Assistant</h2>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 max-h-full">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${
                    message.isUser 
                      ? 'p-3 rounded-lg bg-brand-primary text-white' 
                      : 'text-text-primary'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 opacity-70`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="p-3 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask a question about your sources..."
                  className="flex-1 px-3 py-2 rounded-lg bg-surface-elevated border border-input-border text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 rounded-lg bg-brand-primary text-white hover:bg-brand-primary-hover transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>

            {/* Studio Panel - Right */}
            <div className="lg:col-span-3 bg-surface-elevated rounded-xl border border-input-border flex flex-col h-full max-h-full overflow-hidden">
            <div className="p-3 border-b border-input-border flex-shrink-0">
              <h2 className="text-lg font-semibold text-text-primary">Studio</h2>
              <p className="text-sm text-text-secondary mt-1">
                Studio output will be saved here. After adding sources, click to add Audio Overview, Study Guide, Mind Map, and more!
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 min-h-0">
              <div className="grid grid-cols-2 gap-2">
                <button className="p-3 rounded-lg bg-background border border-input-border hover:bg-surface-hover transition-colors text-center">
                  <div className="w-6 h-6 mx-auto mb-2 p-1 rounded-lg bg-blue-500/10">
                    <Music className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-xs text-text-primary font-medium">Audio Overview</span>
                </button>
                
                <button className="p-3 rounded-lg bg-background border border-input-border hover:bg-surface-hover transition-colors text-center">
                  <div className="w-6 h-6 mx-auto mb-2 p-1 rounded-lg bg-green-500/10">
                    <FileText className="w-4 h-4 text-green-500" />
                  </div>
                  <span className="text-xs text-text-primary font-medium">Study Guide</span>
                </button>
                
                <button className="p-3 rounded-lg bg-background border border-input-border hover:bg-surface-hover transition-colors text-center">
                  <div className="w-6 h-6 mx-auto mb-2 p-1 rounded-lg bg-purple-500/10">
                    <Brain className="w-4 h-4 text-purple-500" />
                  </div>
                  <span className="text-xs text-text-primary font-medium">Mind Map</span>
                </button>
                
                <button className="p-3 rounded-lg bg-background border border-input-border hover:bg-surface-hover transition-colors text-center">
                  <div className="w-6 h-6 mx-auto mb-2 p-1 rounded-lg bg-orange-500/10">
                    <BarChart3 className="w-4 h-4 text-orange-500" />
                  </div>
                  <span className="text-xs text-text-primary font-medium">Reports</span>
                </button>
                
                <button className="p-3 rounded-lg bg-background border border-input-border hover:bg-surface-hover transition-colors text-center">
                  <div className="w-6 h-6 mx-auto mb-2 p-1 rounded-lg bg-pink-500/10">
                    <Zap className="w-4 h-4 text-pink-500" />
                  </div>
                  <span className="text-xs text-text-primary font-medium">Quick Actions</span>
                </button>
                
                <button className="p-3 rounded-lg bg-background border border-input-border hover:bg-surface-hover transition-colors text-center">
                  <div className="w-6 h-6 mx-auto mb-2 p-1 rounded-lg bg-indigo-500/10">
                    <Settings className="w-4 h-4 text-indigo-500" />
                  </div>
                  <span className="text-xs text-text-primary font-medium">Settings</span>
                </button>
              </div>
              
              <div className="mt-4 p-3 rounded-lg bg-background border border-input-border">
                <h3 className="text-sm font-medium text-text-primary mb-2">Recent Outputs</h3>
                <p className="text-xs text-text-muted">No outputs generated yet. Use the tools above to create study materials.</p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Notebook;