import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message }) => {
  return (
    <div className="flex items-center gap-3 p-4 bg-surface-secondary rounded-lg border border-border-primary">
      <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
      <span className="text-text-primary font-medium">{message}</span>
    </div>
  );
};