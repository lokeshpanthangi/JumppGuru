import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { CodeBlock } from './CodeBlock';
import { YouTubeCards, parseYouTubeCards } from './YouTubeCards';

// New ImageRenderer component for proper base64 and URL image handling
interface ImageRendererProps {
  src?: string;
  alt?: string;
  title?: string;
}

const ImageRenderer: React.FC<ImageRendererProps> = ({ src, alt, title }) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [processedSrc, setProcessedSrc] = useState<string>('');

  useEffect(() => {
    // Debug logging to understand what we're receiving
    console.log('🖼️ ImageRenderer received:', { src, alt, title });
    
    if (!src) {
      console.log('❌ No src provided to ImageRenderer');
      setImageState('error');
      setProcessedSrc('');
      return;
    }

    // Process the image source
    let finalSrc = src;
    
    // Handle different image source types
    if (src.startsWith('http://') || src.startsWith('https://')) {
      // Regular URL - use as is
      finalSrc = src;
      console.log('🌐 Detected HTTP/HTTPS URL:', finalSrc);
    } else if (src.startsWith('data:image/')) {
      // Already a proper data URL - use as is
      finalSrc = src;
      console.log('📷 Detected data URL:', finalSrc.substring(0, 50) + '...');
    } else {
      // Assume it's base64 data without prefix
      const base64Data = src.replace(/^data:image\/[a-z]+;base64,/, '');
      finalSrc = `data:image/png;base64,${base64Data}`;
      console.log('🔧 Processed base64 data:', {
        originalLength: src.length,
        processedLength: finalSrc.length,
        preview: finalSrc.substring(0, 50) + '...'
      });
    }

    console.log('✅ Final processed src:', finalSrc.substring(0, 100) + '...');
    setProcessedSrc(finalSrc);
    setImageState('loading');
  }, [src]);

  const handleImageLoad = () => {
    console.log('🎉 Image loaded successfully!', processedSrc.substring(0, 50) + '...');
    setImageState('loaded');
  };

  const handleImageError = (e: any) => {
    console.error('💥 Failed to load image:', { 
      originalSrc: src, 
      processedSrc: processedSrc.substring(0, 100) + '...', 
      error: e,
      errorType: e.type,
      target: e.target
    });
    setImageState('error');
  };

  if (!src) {
    return (
      <div className="my-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400 text-sm">❌ No image source provided</p>
      </div>
    );
  }

  return (
    <div className="my-6 flex flex-col items-center space-y-3">
      {/* Debug info */}
      <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 p-2 rounded max-w-md overflow-hidden">
        <div>State: {imageState}</div>
        <div>Src: {src ? src.substring(0, 50) + '...' : 'None'}</div>
        <div>Processed: {processedSrc ? processedSrc.substring(0, 50) + '...' : 'None'}</div>
      </div>
      
      <div className="relative max-w-full">
        {imageState === 'loading' && (
          <div className="flex items-center justify-center w-64 h-32 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading image...</p>
            </div>
          </div>
        )}
        
        {imageState === 'error' && (
          <div className="flex items-center justify-center w-64 h-32 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex flex-col items-center space-y-2">
              <div className="text-red-500 text-2xl">🖼️</div>
              <p className="text-sm text-red-600 dark:text-red-400 text-center px-2">
                Failed to load image
              </p>
            </div>
          </div>
        )}
        
        {processedSrc && (
          <img 
            src={processedSrc}
            alt={alt || 'Generated image'}
            title={title}
            loading="lazy"
            className={`max-w-[50%] h-auto rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 transition-opacity duration-300 ${
              imageState === 'loaded' ? 'opacity-100' : 'opacity-0 absolute inset-0'
            }`}
            style={{ 
              maxHeight: '600px', 
              maxWidth: '50%',
              minWidth: '200px'
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
      </div>
      
      {imageState === 'loaded' && alt && (
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 italic max-w-md">
            {alt}
          </p>
        </div>
      )}
      
      {imageState === 'loaded' && (
        <div className="text-xs text-gray-400 dark:text-gray-500">
          🖼️ Image loaded successfully
        </div>
      )}
    </div>
  );
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  // Parse YouTube cards from content
  const { content: cleanedContent, videos, remainingVideos } = parseYouTubeCards(content);

  return (
    <div className={`prose max-w-none ${className || ''}`}>
      <ReactMarkdown
        urlTransform={(url: string) => {
          // Allow data URLs for base64 images
          if (url.startsWith('data:image/')) {
            return url;
          }
          // Default URL transform for other URLs
          return url;
        }}
        components={{
          // Custom code block renderer
          code({ node, inline, className, children, ...props }: { node: any; inline?: boolean; className?: string; children: React.ReactNode; [key: string]: any }) {
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
          // Custom paragraph renderer
          p({ children }) {
            return (
              <p className="text-text-primary leading-relaxed mb-4 last:mb-0">
                {children}
              </p>
            );
          },
          // Custom heading renderers
          h1({ children }) {
            return (
              <h1 className="text-2xl font-bold text-text-primary mb-4 mt-6 first:mt-0">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-xl font-semibold text-text-primary mb-3 mt-5 first:mt-0">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-lg font-medium text-text-primary mb-2 mt-4 first:mt-0">
                {children}
              </h3>
            );
          },
          // Custom list renderers
          ul({ children }) {
            return (
              <ul className="list-disc list-inside text-text-primary mb-4 space-y-1">
                {children}
              </ul>
            );
          },
          ol({ children, start }) {
            return (
              <ol 
                className="text-text-primary mb-4 space-y-1 pl-6" 
                style={{ 
                  listStyleType: 'decimal',
                  listStylePosition: 'outside'
                }}
                start={start}
              >
                {children}
              </ol>
            );
          },
          li({ children }) {
            return (
              <li className="text-text-primary">
                {children}
              </li>
            );
          },
          // Custom blockquote renderer
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-text-secondary mb-4">
                {children}
              </blockquote>
            );
          },
          // Custom strong/bold renderer
          strong({ children }) {
            return (
              <strong className="font-semibold text-text-primary">
                {children}
              </strong>
            );
          },
          // Custom emphasis/italic renderer
          em({ children }) {
            return (
              <em className="italic text-text-primary">
                {children}
              </em>
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
                {children}
              </a>
            );
          },
          // Custom horizontal rule renderer
          hr() {
            return (
              <hr className="border-gray-300 dark:border-gray-600 my-6" />
            );
          },
          // Custom image renderer - completely rebuilt for proper base64 and URL image handling
          img({ src, alt, title }) {
            // Ensure src is a string; ReactMarkdown might pass null/undefined in some cases
            const safeSrc = typeof src === 'string' ? src : '';
            return <ImageRenderer src={safeSrc} alt={alt} title={title} />;
          },
        }}
      >
        {cleanedContent}
      </ReactMarkdown>
      
      {/* Render YouTube cards if present */}
      {videos && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-text-primary mb-3">📺 Related Videos</h3>
          <YouTubeCards videos={videos} remainingVideos={remainingVideos} />
        </div>
      )}
    </div>
  );
};