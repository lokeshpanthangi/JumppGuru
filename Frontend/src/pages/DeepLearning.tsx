import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useChatContext } from '@/contexts/ChatContext';
import { Grid3X3, List, PlusCircle, Brain, Eye, Zap, Cpu, Sparkles, Network } from 'lucide-react';
import { NotebookCreationModal } from '@/components/NotebookCreationModal';
import { TextRotate } from '@/components/ui/text-rotate';
import { LayoutGroup, motion } from 'motion/react';

// Types for deep learning history entries
export type DeepLearningEntry = {
  id: string;
  title: string;
  category?: string;
  date: string; // ISO string
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

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getCategoryIcon = (category?: string) => {
  if (!category) return Brain;
  
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('neural') || categoryLower.includes('network')) {
    return Network;
  }
  if (categoryLower.includes('computer vision') || categoryLower.includes('vision')) {
    return Eye;
  }
  if (categoryLower.includes('reinforcement') || categoryLower.includes('rl')) {
    return Zap;
  }
  if (categoryLower.includes('generative') || categoryLower.includes('gan')) {
    return Sparkles;
  }
  if (categoryLower.includes('deep learning') || categoryLower.includes('transformer')) {
    return Cpu;
  }
  
  return Brain; // Default icon
};

const getCategoryColor = (category?: string) => {
  if (!category) return 'from-blue-500 to-blue-600';
  
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('neural') || categoryLower.includes('network')) {
    return 'from-purple-500 to-purple-600';
  }
  if (categoryLower.includes('computer vision') || categoryLower.includes('vision')) {
    return 'from-green-500 to-green-600';
  }
  if (categoryLower.includes('reinforcement') || categoryLower.includes('rl')) {
    return 'from-yellow-500 to-yellow-600';
  }
  if (categoryLower.includes('generative') || categoryLower.includes('gan')) {
    return 'from-pink-500 to-pink-600';
  }
  if (categoryLower.includes('deep learning') || categoryLower.includes('transformer')) {
    return 'from-indigo-500 to-indigo-600';
  }
  
  return 'from-blue-500 to-blue-600'; // Default color
};

const useDeepLearningHistory = () => {
  const [items, setItems] = useState<DeepLearningEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('deep-learning-history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      } else {
        // Sample data for demonstration
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
          },
          {
            id: '4',
            title: 'Reinforcement Learning Fundamentals',
            category: 'Reinforcement Learning',
            date: '2025-01-05T16:45:00Z',
            sources: 32,
            summary: 'Introduction to reinforcement learning algorithms, Q-learning, and policy gradient methods.',
            tags: ['rl', 'q-learning', 'policy-gradient'],
            featured: false
          },
          {
            id: '5',
            title: 'Generative Adversarial Networks',
            category: 'Generative AI',
            date: '2025-01-03T11:30:00Z',
            sources: 28,
            summary: 'Understanding GANs and their applications in generating realistic images, text, and other data.',
            tags: ['gan', 'generative-ai', 'synthetic-data'],
            featured: false
          }
        ];
        setItems(sampleData);
        localStorage.setItem('deep-learning-history', JSON.stringify(sampleData));
      }
    } catch (e) {
      console.error('Failed to parse deep-learning-history');
    }
  }, []);

  return { items };
};

const Content: React.FC = () => {
  const { state } = useChatContext();
  const { items } = useDeepLearningHistory();
  const navigate = useNavigate();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'featured'>('all');
  const [sort, setSort] = useState<'recent' | 'oldest'>('recent');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notebooks, setNotebooks] = useState<DeepLearningEntry[]>([]);

  useEffect(() => {
    setNotebooks(items);
  }, [items]);

  const filtered = useMemo(() => {
    let list = [...notebooks];
    if (filter === 'featured') list = list.filter(i => i.featured);
    list.sort((a, b) =>
      sort === 'recent'
        ? new Date(b.date).getTime() - new Date(a.date).getTime()
        : new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    return list;
  }, [notebooks, filter, sort]);

  // SEO structured data
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: filtered.map((it, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: typeof window !== 'undefined' ? window.location.href : 'https://jumpapp.app/deep-learning',
      name: it.title,
    })),
  };

  return (
    <div className="flex-1 overflow-y-auto bg-chat-bg animate-fade-in">
      <Helmet>
        <title>Deep Learning History | JumpApp</title>
        <meta name="description" content="Browse your deep learning history with summaries, tags, and sources." />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.origin + '/deep-learning' : 'https://jumpapp.app/deep-learning'} />
        <script type="application/ld+json">{JSON.stringify(itemListJsonLd)}</script>
      </Helmet>

      <main className="p-8">
        {/* Header controls */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm border ${
                filter === 'all'
                  ? 'bg-[hsl(var(--input-mint-bg))] border-[hsl(var(--input-mint-border))] text-brand-primary shadow-[0_0_8px_hsl(var(--input-mint-glow))]'
                  : 'bg-button-secondary hover:bg-button-secondary-hover border-input-border text-text-secondary'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('featured')}
              className={`px-4 py-2 rounded-full text-sm border ${
                filter === 'featured'
                  ? 'bg-[hsl(var(--input-mint-bg))] border-[hsl(var(--input-mint-border))] text-brand-primary shadow-[0_0_8px_hsl(var(--input-mint-glow))]'
                  : 'bg-button-secondary hover:bg-button-secondary-hover border-input-border text-text-secondary'
              }`}
            >
              Featured
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-button-secondary rounded-full p-1 border border-input-border">
              <button
                onClick={() => setView('grid')}
                className={`p-2 rounded-full ${
                  view === 'grid' ? 'bg-surface-elevated shadow-sm' : 'hover:bg-sidebar-item-hover'
                }`}
                aria-label="Grid view"
              >
                <Grid3X3 className="w-4 h-4 text-text-secondary" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2 rounded-full ${
                  view === 'list' ? 'bg-surface-elevated shadow-sm' : 'hover:bg-sidebar-item-hover'
                }`}
                aria-label="List view"
              >
                <List className="w-4 h-4 text-text-secondary" />
              </button>
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="text-sm bg-button-secondary border border-input-border rounded-full px-4 py-2 text-text-secondary focus:outline-none"
              aria-label="Sort by"
            >
              <option value="recent">Most recent</option>
              <option value="oldest">Oldest</option>
            </select>

            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary text-white hover:bg-brand-primary-hover transition"
            >
              <PlusCircle className="w-4 h-4" />
              Create new
            </button>
          </div>
        </header>

        <LayoutGroup>
          <motion.h1 className="text-3xl font-bold text-text-primary mb-6 flex whitespace-pre" layout>
            <motion.span
              className="pt-0.5"
              layout
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
            >
              Make it{" "}
            </motion.span>
            <TextRotate
              texts={[
                "work!",
                "fancy ✽",
                "right",
                "fast",
                "fun",
                "rock",
                "🕶️🕶️🕶️",
              ]}
              mainClassName="text-white px-2 bg-brand-primary overflow-hidden py-0.5 justify-center rounded-lg"
              staggerFrom={"last"}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-120%" }}
              staggerDuration={0.025}
              splitLevelClassName="overflow-hidden pb-0.5"
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              rotationInterval={2000}
            />
          </motion.h1>
        </LayoutGroup>

        {/* Content */}
        {filtered.length === 0 ? (
          <section className="bg-surface-elevated border border-input-border rounded-xl p-10 text-center animate-fade-in">
            <p className="text-text-secondary">No deep learning history yet.</p>
            <p className="text-text-muted text-sm mt-1">Entries saved to local storage under "deep-learning-history" will appear here.</p>
          </section>
        ) : view === 'grid' ? (
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((item, index) => (
              <article 
                key={item.id} 
                onClick={() => navigate(`/notebook/${item.id}`)}
                className="overflow-hidden rounded-xl bg-surface-elevated border border-input-border shadow-elevated cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
              >
                <div className={`h-32 bg-gradient-to-br ${getCategoryColor(item.category)} flex items-center justify-center`} aria-hidden="true">
                  {(() => {
                    const IconComponent = getCategoryIcon(item.category);
                    return <IconComponent className="w-12 h-12 text-white/80" />;
                  })()}
                </div>
                <div className="p-5 space-y-3">
                  {item.category && (
                    <span className="inline-flex text-xs px-2 py-1 rounded-full bg-brand-primary/10 text-brand-primary border border-[hsl(var(--input-mint-border))]">
                      {item.category}
                    </span>
                  )}
                  <h2 className="text-xl font-semibold text-text-primary">{item.title}</h2>
                  {item.summary && (
                    <p className="text-sm text-text-secondary line-clamp-3">{item.summary}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>{formatDate(item.date)}</span>
                    {typeof item.sources === 'number' && <span>• {item.sources} sources</span>}
                  </div>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {item.tags.map((t) => (
                        <span key={t} className="text-xs px-2 py-1 rounded-full bg-button-secondary text-text-secondary">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="divide-y divide-border rounded-xl overflow-hidden border border-input-border bg-surface-elevated">
            {filtered.map((item, index) => (
              <article 
                key={item.id} 
                onClick={() => navigate(`/notebook/${item.id}`)}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-surface-hover transition-colors duration-200"
              >
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-text-primary">{item.title}</h2>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    {item.category && <span>{item.category}</span>}
                    <span>{formatDate(item.date)}</span>
                    {typeof item.sources === 'number' && <span>• {item.sources} sources</span>}
                  </div>
                </div>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((t) => (
                      <span key={t} className="text-xs px-2 py-1 rounded-full bg-button-secondary text-text-secondary">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </section>
        )}
      </main>
      
      <NotebookCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplete={(data) => {
           // Create a new notebook entry
            const newNotebook: DeepLearningEntry = {
              id: `notebook-${Date.now()}`,
              title: data.name,
              summary: `A notebook containing ${data.messages.length} messages from your chats about ${data.category.name.toLowerCase()}.`,
              category: data.category.name,
              date: new Date().toISOString(),
              messageCount: data.messages.length,
              featured: false,
              tags: [data.category.name.toLowerCase(), 'custom'],
              messages: data.messages
            };
           
           // Add the new notebook to the list
           setNotebooks(prev => [newNotebook, ...prev]);
           
           console.log('Notebook created:', newNotebook);
         }}
      />
    </div>
  );
};

const DeepLearning: React.FC = () => {
  return <Content />;
};

export default DeepLearning;
