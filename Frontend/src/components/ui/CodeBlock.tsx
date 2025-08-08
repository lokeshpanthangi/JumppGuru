import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  children: string;
  className?: string;
  inline?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ children, className, inline }) => {
  const [copied, setCopied] = useState(false);
  
  // Extract language from className (format: "language-python")
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Inline code styling
  if (inline) {
    return (
      <code className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    );
  }

  // Block code styling
  return (
    <div className="relative group my-4">
      {/* Language label - positioned absolutely over the code */}
      <span className="absolute top-4 left-4 z-10 text-gray-400 text-xs font-medium uppercase tracking-wide opacity-60">
        {language}
      </span>
      
      {/* Copy button - positioned absolutely over the code */}
      <button
        onClick={handleCopy}
        className="absolute top-4 right-4 z-10 flex items-center justify-center w-8 h-8 bg-gray-700/80 hover:bg-gray-600/80 rounded transition-colors duration-200 opacity-0 group-hover:opacity-100"
        title={copied ? 'Copied!' : 'Copy code'}
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 text-gray-300" />
        )}
      </button>
      
      {/* Code content */}
      <div className="rounded-lg overflow-hidden">
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: '8px',
            background: '#1e1e1e',
            fontSize: '14px',
            lineHeight: '1.5',
            padding: '32px 16px 16px 16px',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            }
          }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};