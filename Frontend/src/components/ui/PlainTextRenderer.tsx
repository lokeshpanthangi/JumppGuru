import React from 'react';

interface PlainTextRendererProps {
  content: string;
  className?: string;
}

export const PlainTextRenderer: React.FC<PlainTextRendererProps> = ({ content, className }) => {
  // Function to strip markdown and clean up text
  const stripMarkdown = (text: string): string => {
    return text
      // Remove headers (# ## ### etc.)
      .replace(/^#+\s+/gm, '')
      // Remove bold/italic markers (* ** *** _ __ ___)
      .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, '$2')
      // Remove code blocks and inline code
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Remove links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove images ![alt](url)
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // Remove horizontal rules
      .replace(/^[-*_]{3,}$/gm, '')
      // Remove blockquotes
      .replace(/^>\s+/gm, '')
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, '• ')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // Clean up excessive whitespace and line breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n')  // Max 2 consecutive line breaks
      .replace(/^\s+|\s+$/g, '')  // Trim start and end
      // Replace \n with actual line breaks for display
      .replace(/\\n/g, '\n')
      .trim();
  };

  const cleanText = stripMarkdown(content);
  
  // Split by line breaks and render each line as a paragraph
  const lines = cleanText.split('\n').filter(line => line.trim() !== '');
  
  return (
    <div className={className}>
      {lines.map((line, index) => (
        <p key={index} className="mb-2 last:mb-0 leading-relaxed text-text-primary">
          {line}
        </p>
      ))}
    </div>
  );
};
