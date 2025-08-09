import React from 'react';
import { marked } from 'marked';
import { YouTubeCards, parseYouTubeCards } from './YouTubeCards';

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false
});

interface Block {
  type: 'text' | 'image';
  content?: string;
  data_url?: string;
  alt?: string;
  images?: Array<{
    data_url?: string;
    url?: string;
    src?: string;
    base64?: string;
    data?: string;
  }>;
}

interface FastBlockRendererProps {
  content: string;
  className?: string;
}

export const FastBlockRenderer: React.FC<FastBlockRendererProps> = ({ content, className }) => {
  // Parse YouTube cards from content
  const { content: cleanedContent, videos, remainingVideos } = parseYouTubeCards(content);
  
  // Check if content contains block data
  const blockDataMatch = cleanedContent.match(/<BLOCKS_DATA>(.*?)<\/BLOCKS_DATA>/);
  
  if (!blockDataMatch) {
    // Fallback to regular text content
    return (
      <div className={className}>
        <div 
          className="step prose prose-lg max-w-none" 
          style={{ 
            marginBottom: '24px',
            lineHeight: '1.7'
          }}
        >
          <div 
            dangerouslySetInnerHTML={{ __html: marked(cleanedContent) }}
            style={{
              '--tw-prose-headings': 'var(--text-primary)',
              '--tw-prose-body': 'var(--text-primary)',
              '--tw-prose-lists': 'var(--text-primary)'
            } as React.CSSProperties}
          />
        </div>
        {/* Render YouTube cards if present */}
        {videos && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '12px' }}>📺 Related Videos</h3>
            <YouTubeCards videos={videos} remainingVideos={remainingVideos} />
          </div>
        )}
      </div>
    );
  }

  try {
    const blocks: Block[] = JSON.parse(blockDataMatch[1]);
    
    return (
      <div className={className}>
        {blocks.map((block, index) => {
          if (block.type === 'text') {
            let content = block.content || '';
            
            // Process markdown content
            // If it's the first text block, ensure the first line is treated as a heading
            if (index === 0 && content && !content.startsWith('#')) {
              const lines = content.split('\n');
              if (lines.length > 0 && lines[0].trim()) {
                lines[0] = `# ${lines[0].trim()}`;
                content = lines.join('\n');
              }
            }
            
            const htmlContent = marked(content);
            
            return (
              <div 
                key={index} 
                className="step prose prose-lg max-w-none" 
                style={{ 
                  marginBottom: '24px',
                  lineHeight: '1.7'
                }}
              >
                <div 
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                  style={{
                    '--tw-prose-headings': 'var(--text-primary)',
                    '--tw-prose-body': 'var(--text-primary)',
                    '--tw-prose-lists': 'var(--text-primary)'
                  } as React.CSSProperties}
                />
              </div>
            );
          } else if (block.type === 'image') {
            // Handle array of images
            if (Array.isArray(block.images) && block.images.length > 0) {
              return (
                <div key={index} style={{ marginBottom: '20px' }}>
                  {block.images.map((img, imgIndex) => {
                    const src = img.data_url || img.url || img.src || img.base64 || img.data;
                    if (!src) return null;
                    
                    return (
                      <img
                        key={imgIndex}
                        src={src}
                        alt={block.alt || ''}
                        style={{ 
                          maxWidth: '50%', 
                          margin: '10px 0',
                          height: 'auto',
                          borderRadius: '8px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                        loading="lazy"
                      />
                    );
                  })}
                </div>
              );
            }
            
            // Handle single image
            const src = block.data_url;
            if (src) {
              return (
                <img
                  key={index}
                  src={src}
                  alt={block.alt || ''}
                  style={{ 
                    maxWidth: '50%', 
                    margin: '10px 0',
                    height: 'auto',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                  loading="lazy"
                />
              );
            }
          }
          return null;
        })}
        
        {/* Render YouTube cards if present */}
        {videos && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '12px' }}>📺 Related Videos</h3>
            <YouTubeCards videos={videos} remainingVideos={remainingVideos} />
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error parsing blocks data:', error);
    // Fallback to regular text content
    return (
      <div className={className}>
        <div 
          className="step prose prose-lg max-w-none" 
          style={{ 
            marginBottom: '24px',
            lineHeight: '1.7'
          }}
        >
          <div 
            dangerouslySetInnerHTML={{ __html: marked(cleanedContent.replace(/<BLOCKS_DATA>.*?<\/BLOCKS_DATA>/, '')) }}
            style={{
              '--tw-prose-headings': 'var(--text-primary)',
              '--tw-prose-body': 'var(--text-primary)',
              '--tw-prose-lists': 'var(--text-primary)'
            } as React.CSSProperties}
          />
        </div>
        {/* Render YouTube cards if present */}
        {videos && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '12px' }}>📺 Related Videos</h3>
            <YouTubeCards videos={videos} remainingVideos={remainingVideos} />
          </div>
        )}
      </div>
    );
  }
};