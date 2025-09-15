import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { CodeBlock } from './CodeBlock';

interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

interface TTSHighlightRendererProps {
  content: string;
  isPlaying: boolean;
  audioElement: HTMLAudioElement | null;
  wordTimestamps?: WordTimestamp[] | null;
  className?: string;
}

export const TTSHighlightRenderer: React.FC<TTSHighlightRendererProps> = ({ 
  content, 
  isPlaying, 
  audioElement, 
  wordTimestamps,
  className 
}) => {
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
  const [words, setWords] = useState<string[]>([]);
  const wordsRef = useRef<string[]>([]);
  const totalWordsRef = useRef<number>(0);

  // Extract and split text content into words
  useEffect(() => {
    const extractTextFromMarkdown = (markdown: string): string => {
      // Remove code blocks
      let text = markdown.replace(/```[\s\S]*?```/g, '');
      // Remove inline code
      text = text.replace(/`([^`]+)`/g, '$1');
      // Remove headers
      text = text.replace(/^#+\s+/gm, '');
      // Remove bold/italic markers
      text = text.replace(/(\*{1,3}|_{1,3})(.*?)\1/g, '$2');
      // Remove links but keep text
      text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      // Remove images
      text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
      // Remove blockquotes
      text = text.replace(/^>\s+/gm, '');
      // Remove list markers
      text = text.replace(/^[\s]*[-*+]\s+/gm, '');
      text = text.replace(/^[\s]*\d+\.\s+/gm, '');
      // Clean up whitespace
      text = text.replace(/\s+/g, ' ').trim();
      return text;
    };

    const plainText = extractTextFromMarkdown(content);
    const wordArray = plainText.split(/\s+/).filter(word => word.length > 0);
    
    setWords(wordArray);
    wordsRef.current = wordArray;
    totalWordsRef.current = wordArray.length;
    setCurrentWordIndex(-1);
  }, [content]);

  // Track audio progress and update highlighted word using real timestamps
  useEffect(() => {
    if (!audioElement || !isPlaying || !wordTimestamps || wordTimestamps.length === 0) {
      setCurrentWordIndex(-1);
      return;
    }

    const updateHighlight = () => {
      const currentTime = audioElement.currentTime;
      
      // Find the current word based on timestamp data
      let currentWordIdx = -1;
      for (let i = 0; i < wordTimestamps.length; i++) {
        const timestamp = wordTimestamps[i];
        if (currentTime >= timestamp.start && currentTime <= timestamp.end) {
          currentWordIdx = i;
          break;
        }
      }
      
      setCurrentWordIndex(currentWordIdx);
    };

    const handleTimeUpdate = () => {
      updateHighlight();
    };

    const handleEnded = () => {
      setCurrentWordIndex(-1);
    };

    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('ended', handleEnded);

    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [audioElement, isPlaying, wordTimestamps]);

  // Custom component to render text with word highlighting
  const HighlightedText: React.FC<{ children: string }> = ({ children }) => {
    const text = children || '';
    const textWords = text.split(/\s+/).filter(word => word.length > 0);
    
    return (
      <span>
        {textWords.map((word, index) => {
          // Calculate global word index across all text nodes
          const globalIndex = wordsRef.current.indexOf(word, 
            wordsRef.current.slice(0, index).filter(w => w === word).length
          );
          
          const isHighlighted = isPlaying && globalIndex === currentWordIndex;
          
          return (
            <span
              key={`${index}-${word}`}
              className={`transition-all duration-200 ease-in-out ${
                isHighlighted 
                  ? 'bg-green-400/40 px-1 rounded-sm' 
                  : ''
              }`}
              style={{
                display: 'inline',
                marginRight: index < textWords.length - 1 ? '0.25rem' : '0'
              }}
            >
              {word}
            </span>
          );
        })}
      </span>
    );
  };

  // Enhanced word tracking for better sync
  const renderWithWordTracking = (text: string) => {
    const textWords = text.split(/\s+/).filter(word => word.length > 0);
    let wordOffset = 0;
    
    // Find the starting offset for this text segment
    const textStart = wordsRef.current.findIndex(w => w === textWords[0]);
    if (textStart !== -1) {
      wordOffset = textStart;
    }
    
    return (
      <span>
        {textWords.map((word, index) => {
          const globalIndex = wordOffset + index;
          const isHighlighted = isPlaying && globalIndex === currentWordIndex;
          
          return (
            <span
              key={`${globalIndex}-${word}`}
              className={`transition-all duration-150 ease-in-out ${
                isHighlighted 
                  ? 'bg-green-400/50 px-1 rounded-sm' 
                  : ''
              }`}
              style={{
                display: 'inline-block',
                marginRight: index < textWords.length - 1 ? '0.25rem' : '0'
              }}
            >
              {word}
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <div className={`prose max-w-none prose-slate dark:prose-invert ${className || ''}`}>
      <ReactMarkdown
        components={{
          // Custom code block renderer
          code({ node, inline, className, children, ...props }: { 
            node: any; 
            inline?: boolean; 
            className?: string; 
            children: React.ReactNode; 
            [key: string]: any 
          }) {
            return (
              <CodeBlock
                className={className}
                inline={inline}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </CodeBlock>
            );
          },
          // Custom paragraph renderer with word highlighting
          p({ children }) {
            return (
              <p className="text-text-primary leading-relaxed mb-4 last:mb-0">
                {React.Children.map(children, (child) => {
                  if (typeof child === 'string') {
                    return renderWithWordTracking(child);
                  }
                  return child;
                })}
              </p>
            );
          },
          // Custom heading renderers with word highlighting
          h1({ children }) {
            return (
              <h1 className="text-3xl font-bold text-text-primary mb-6 mt-8 first:mt-0 border-b border-gray-200 dark:border-gray-700 pb-2">
                {React.Children.map(children, (child) => {
                  if (typeof child === 'string') {
                    return renderWithWordTracking(child);
                  }
                  return child;
                })}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-2xl font-semibold text-text-primary mb-4 mt-6 first:mt-0">
                {React.Children.map(children, (child) => {
                  if (typeof child === 'string') {
                    return renderWithWordTracking(child);
                  }
                  return child;
                })}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-xl font-medium text-text-primary mb-3 mt-5 first:mt-0">
                {React.Children.map(children, (child) => {
                  if (typeof child === 'string') {
                    return renderWithWordTracking(child);
                  }
                  return child;
                })}
              </h3>
            );
          },
          // Custom list renderers with word highlighting
          ul({ children }) {
            return (
              <ul className="list-disc text-text-primary mb-4" style={{ listStylePosition: 'inside', paddingLeft: 0, marginLeft: 0 }}>
                {children}
              </ul>
            );
          },
          li({ children }) {
            return (
              <li className="text-text-primary leading-relaxed" style={{ marginLeft: 0, paddingLeft: 0, display: 'list-item' }}>
                {React.Children.map(children, (child) => {
                  if (typeof child === 'string') {
                    return renderWithWordTracking(child);
                  }
                  return child;
                })}
              </li>
            );
          },
          // Custom strong/bold renderer with word highlighting
          strong({ children }) {
            return (
              <strong className="font-semibold text-text-primary">
                {React.Children.map(children, (child) => {
                  if (typeof child === 'string') {
                    return renderWithWordTracking(child);
                  }
                  return child;
                })}
              </strong>
            );
          },
          // Custom emphasis/italic renderer with word highlighting
          em({ children }) {
            return (
              <em className="italic text-text-primary">
                {React.Children.map(children, (child) => {
                  if (typeof child === 'string') {
                    return renderWithWordTracking(child);
                  }
                  return child;
                })}
              </em>
            );
          },
          // Custom blockquote renderer with word highlighting
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-text-secondary mb-4">
                {React.Children.map(children, (child) => {
                  if (typeof child === 'string') {
                    return renderWithWordTracking(child);
                  }
                  return child;
                })}
              </blockquote>
            );
          },
          // Custom link renderer
          a({ href, children }) {
            return (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline"
              >
                {React.Children.map(children, (child) => {
                  if (typeof child === 'string') {
                    return renderWithWordTracking(child);
                  }
                  return child;
                })}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};