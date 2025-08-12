import React from 'react';
import { useTextStreaming } from '../../hooks/useTextStreaming';
import { useChatContext } from '../../contexts/ChatContext';

interface StreamingMessageProps {
  content: string;
  messageId: string;
  chatId: string;
  className?: string;
  children: (displayedContent: string) => React.ReactNode;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({
  content,
  messageId,
  chatId,
  className,
  children
}) => {
  const { setMessageStreaming, setCurrentlyGenerating } = useChatContext();
  
  const { displayedText, isStreaming } = useTextStreaming(content, {
    speed: 25,
    enabled: true
  });

  // Update streaming state in context
  React.useEffect(() => {
    setMessageStreaming(chatId, messageId, isStreaming);
    
    // When streaming finishes, mark as no longer currently generating
    if (!isStreaming && content && displayedText === content) {
      setCurrentlyGenerating(chatId, null);
    }
  }, [isStreaming, chatId, messageId, setMessageStreaming, setCurrentlyGenerating, content, displayedText]);

  return (
    <div className={className}>
      {children(displayedText)}
    </div>
  );
};
