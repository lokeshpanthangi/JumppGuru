import React from 'react';
import ReactMarkdown from 'react-markdown';
import { CodeBlock } from './CodeBlock';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div className={`prose max-w-none ${className || ''}`}>
      <ReactMarkdown
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
          ol({ children }) {
            return (
              <ol className="list-decimal list-inside text-text-primary mb-4 space-y-1">
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};