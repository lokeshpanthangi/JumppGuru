'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TypingAnimationProps {
  className?: string;
}

export function TypingAnimation({ className }: TypingAnimationProps) {
  return (
    <div className={cn('flex items-center space-x-1', className)}>
      {/* Animated dots */}
      <div className="flex space-x-1">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="w-2 h-2 bg-brand-primary rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: index * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      
      {/* Animated text */}
      <motion.span
        className="text-text-primary ml-3"
        initial={{ opacity: 0.5 }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        Thinking...
      </motion.span>
    </div>
  );
}

// Alternative pulse animation component
export function PulseAnimation({ className }: TypingAnimationProps) {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <div className="relative">
        <motion.div
          className="w-3 h-3 bg-brand-primary rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [1, 0.3, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute inset-0 w-3 h-3 bg-brand-primary rounded-full"
          animate={{
            scale: [1, 2, 1],
            opacity: [0.7, 0, 0.7],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3,
          }}
        />
      </div>
      <motion.span
        className="text-text-primary"
        animate={{
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        Processing...
      </motion.span>
    </div>
  );
}

// Wave animation component
export function WaveAnimation({ className }: TypingAnimationProps) {
  return (
    <div className={cn('flex items-center space-x-1', className)}>
      <div className="flex space-x-1">
        {[0, 1, 2, 3, 4].map((index) => (
          <motion.div
            key={index}
            className="w-1 bg-brand-primary rounded-full"
            animate={{
              height: [8, 20, 8],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: index * 0.1,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <motion.span
        className="text-text-primary ml-3"
        animate={{
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        Generating...
      </motion.span>
    </div>
  );
}