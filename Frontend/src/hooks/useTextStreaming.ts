import { useState, useEffect, useRef, useCallback } from 'react';

interface StreamingOptions {
  speed?: number; // milliseconds per word
  enabled?: boolean;
}

export const useTextStreaming = (fullText: string, options: StreamingOptions = {}) => {
  const { speed = 25, enabled = true } = options;
  
  const [displayedText, setDisplayedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef(0);
  const wordsRef = useRef<string[]>([]);

  const startStreaming = useCallback(() => {
    if (!enabled || !fullText.trim()) {
      setDisplayedText(fullText);
      return;
    }

    console.log('🎬 Starting streaming for text:', fullText.substring(0, 50) + '...');
    
    // Reset state
    setDisplayedText('');
    setIsStreaming(true);
    currentIndexRef.current = 0;
    
    // Split text into words, preserving spaces and formatting
    const words = fullText.split(/(\s+)/);
    wordsRef.current = words;

    console.log('📝 Split into', words.length, 'chunks');

    // If text is very short (< 10 words), show immediately
    const actualWords = words.filter(word => word.trim().length > 0);
    if (actualWords.length < 10) {
      console.log('⚡ Text too short, showing immediately');
      setDisplayedText(fullText);
      setIsStreaming(false);
      return;
    }

    console.log('🚀 Starting word-by-word streaming...');
    
    // Start streaming
    intervalRef.current = setInterval(() => {
      const currentIndex = currentIndexRef.current;
      
      if (currentIndex >= words.length) {
        // Streaming complete
        console.log('✅ Streaming complete!');
        clearInterval(intervalRef.current!);
        setIsStreaming(false);
        setDisplayedText(fullText); // Ensure complete text is shown
        return;
      }

      // Add next word(s) - sometimes add multiple words for better flow
      let wordsToAdd = 1;
      
      // Add multiple words for common patterns
      const currentWord = words[currentIndex]?.trim().toLowerCase();
      if (currentWord && (
        currentWord.length <= 2 || // Short words like "a", "an", "in", "on"
        ['the', 'and', 'or', 'but', 'for', 'to', 'of', 'in', 'on', 'at', 'by'].includes(currentWord)
      )) {
        wordsToAdd = Math.min(2, words.length - currentIndex);
      }

      // Build displayed text up to current position
      const nextIndex = currentIndex + wordsToAdd;
      const textUpToCurrent = words.slice(0, nextIndex).join('');
      
      setDisplayedText(textUpToCurrent);
      currentIndexRef.current = nextIndex;
    }, speed);
  }, [fullText, enabled, speed]);

  const stopStreaming = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsStreaming(false);
    setDisplayedText(fullText);
  }, [fullText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Auto-start streaming when fullText changes
  useEffect(() => {
    if (fullText && enabled) {
      // Small delay to ensure component is ready
      const timer = setTimeout(() => {
        startStreaming();
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      setDisplayedText(fullText);
    }
  }, [fullText, enabled, startStreaming]);

  return {
    displayedText,
    isStreaming,
    startStreaming,
    stopStreaming
  };
};
