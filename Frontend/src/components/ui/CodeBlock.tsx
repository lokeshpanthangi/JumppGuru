import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Code2, Terminal } from 'lucide-react';

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

  // Get language display name and icon
  const getLanguageInfo = (lang: string) => {
    const langMap: { [key: string]: { name: string; icon: React.ReactNode; color: string } } = {
      javascript: { name: 'JavaScript', icon: <Code2 className="w-3 h-3" />, color: 'bg-yellow-500' },
      typescript: { name: 'TypeScript', icon: <Code2 className="w-3 h-3" />, color: 'bg-blue-500' },
      python: { name: 'Python', icon: <Code2 className="w-3 h-3" />, color: 'bg-green-500' },
      jsx: { name: 'React JSX', icon: <Code2 className="w-3 h-3" />, color: 'bg-cyan-500' },
      tsx: { name: 'React TSX', icon: <Code2 className="w-3 h-3" />, color: 'bg-cyan-600' },
      html: { name: 'HTML', icon: <Code2 className="w-3 h-3" />, color: 'bg-orange-500' },
      css: { name: 'CSS', icon: <Code2 className="w-3 h-3" />, color: 'bg-blue-400' },
      json: { name: 'JSON', icon: <Code2 className="w-3 h-3" />, color: 'bg-gray-500' },
      bash: { name: 'Bash', icon: <Terminal className="w-3 h-3" />, color: 'bg-gray-700' },
      sh: { name: 'Shell', icon: <Terminal className="w-3 h-3" />, color: 'bg-gray-700' },
      sql: { name: 'SQL', icon: <Code2 className="w-3 h-3" />, color: 'bg-indigo-500' },
      java: { name: 'Java', icon: <Code2 className="w-3 h-3" />, color: 'bg-red-500' },
      cpp: { name: 'C++', icon: <Code2 className="w-3 h-3" />, color: 'bg-blue-600' },
      c: { name: 'C', icon: <Code2 className="w-3 h-3" />, color: 'bg-blue-700' },
    };
    return langMap[lang.toLowerCase()] || { name: lang.toUpperCase(), icon: <Code2 className="w-3 h-3" />, color: 'bg-gray-500' };
  };

  const langInfo = getLanguageInfo(language);

  // Inline code styling - much improved
  if (inline) {
    return (
      <code className="relative inline-flex items-center bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1 rounded-md text-sm font-mono border border-slate-200 dark:border-slate-700 shadow-sm">
        {children}
      </code>
    );
  }

  // Block code styling - simplified design
  return (
    <div className="relative group my-4">
      {/* Simple header with language and copy button */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          {langInfo.name}
        </span>
        
        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
            copied 
              ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
              : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white border border-slate-600/30'
          }`}
          title={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      
      {/* Code content - clean and simple */}
      <div className="rounded-lg overflow-hidden">
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            background: '#1e1e1e',
            fontSize: '14px',
            lineHeight: '1.6',
            padding: '16px 20px',
            borderRadius: '8px',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          }}
          wrapLines={true}
          wrapLongLines={true}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};