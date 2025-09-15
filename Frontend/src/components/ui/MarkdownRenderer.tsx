import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { CodeBlock } from './CodeBlock';
import { YouTubeCards, parseYouTubeCards } from './YouTubeCards';
import { ImageModal } from './ImageModal';

// New ImageRenderer component for proper base64 and URL image handling
interface ImageRendererProps {
  src?: string;
  alt?: string;
  title?: string;
  onImageClick?: (src: string, alt: string) => void;
}

const ImageRenderer: React.FC<ImageRendererProps> = ({ src, alt, title, onImageClick }) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [processedSrc, setProcessedSrc] = useState<string>('');

  useEffect(() => {
    if (!src) {
      setImageState('error');
      setProcessedSrc('');
      return;
    }

    // Process the image source
    let finalSrc = src;
    
    // Handle different image source types
    if (src.startsWith('http://') || src.startsWith('https://')) {
      // Regular URL (including S3 URLs) - use as is
      finalSrc = src;
    } else if (src.startsWith('data:image/')) {
      // Already a proper data URL - use as is
      finalSrc = src;
    } else {
      // Assume it's base64 data without prefix
      const base64Data = src.replace(/^data:image\/[a-z]+;base64,/, '');
      finalSrc = `data:image/png;base64,${base64Data}`;
    }

    setProcessedSrc(finalSrc);
    setImageState('loading');
  }, [src]);

  const handleImageLoad = () => {
    setImageState('loaded');
  };

  const handleImageError = (e: any) => {
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
            className={`max-w-[50%] h-auto rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 transition-opacity duration-300 cursor-pointer hover:opacity-90 ${
              imageState === 'loaded' ? 'opacity-100' : 'opacity-0 absolute inset-0'
            }`}
            style={{ 
              maxHeight: '600px', 
              maxWidth: '50%',
              minWidth: '200px'
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
            onClick={() => onImageClick && onImageClick(processedSrc, alt || 'Generated image')}
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
      

    </div>
  );
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
  playgroundMode?: boolean;
  onVideoSelectForPlayground?: (video: any) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className, playgroundMode, onVideoSelectForPlayground }) => {
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);
  
  // Parse YouTube cards from content
  const { content: cleanedContent, videos, remainingVideos } = parseYouTubeCards(content);

  return (
    <div className={`prose max-w-none prose-slate dark:prose-invert ${className || ''}`}>
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
          // Custom paragraph renderer with better spacing
          p({ children }) {
            return (
              <p className="text-text-primary leading-relaxed mb-4 last:mb-0">
                {children}
              </p>
            );
          },
          // Custom heading renderers with enhanced styling
          h1({ children }) {
            return (
              <h1 className="text-3xl font-bold text-text-primary mb-6 mt-8 first:mt-0 border-b border-gray-200 dark:border-gray-700 pb-2">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-2xl font-semibold text-text-primary mb-4 mt-6 first:mt-0">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-xl font-medium text-text-primary mb-3 mt-5 first:mt-0">
                {children}
              </h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="text-lg font-medium text-text-primary mb-2 mt-4 first:mt-0">
                {children}
              </h4>
            );
          },
          h5({ children }) {
            return (
              <h5 className="text-base font-medium text-text-primary mb-2 mt-3 first:mt-0">
                {children}
              </h5>
            );
          },
          h6({ children }) {
            return (
              <h6 className="text-sm font-medium text-text-primary mb-2 mt-3 first:mt-0">
                {children}
              </h6>
            );
          },
          // Custom list renderers with inline formatting
          ul({ children }) {
            return (
              <ul className="list-disc text-text-primary mb-4" style={{ listStylePosition: 'inside', paddingLeft: 0, marginLeft: 0 }}>
                {children}
              </ul>
            );
          },
          ol({ children, start }) {
            return (
              <ol 
                className="text-text-primary mb-4" 
                style={{ 
                  listStyleType: 'decimal',
                  listStylePosition: 'inside',
                  paddingLeft: 0,
                  marginLeft: 0
                }}
                start={start}
              >
                {children}
              </ol>
            );
          },
          li({ children }) {
            return (
              <li className="text-text-primary leading-relaxed" style={{ marginLeft: 0, paddingLeft: 0, display: 'list-item' }}>
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
            return <ImageRenderer 
              src={safeSrc} 
              alt={alt} 
              title={title} 
              onImageClick={(imgSrc, imgAlt) => setSelectedImage({ src: imgSrc, alt: imgAlt })} 
            />;
          },
        }}
      >
        {cleanedContent}
      </ReactMarkdown>
      
      {/* Render YouTube cards if present */}
      {videos && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-text-primary mb-3">Related Videos</h3>
          <YouTubeCards 
            videos={videos} 
            remainingVideos={remainingVideos}
            playgroundMode={playgroundMode}
            onVideoSelectForPlayground={onVideoSelectForPlayground}
          />
        </div>
      )}
      
      {/* Image Modal */}
      <ImageModal
        isOpen={selectedImage !== null}
        onClose={() => setSelectedImage(null)}
        imageSrc={selectedImage?.src || ''}
        alt={selectedImage?.alt}
      />
    </div>
  );
};