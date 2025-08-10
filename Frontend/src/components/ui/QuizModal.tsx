import React, { useState } from 'react';
import { X, Brain } from 'lucide-react';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (difficulty: string, numQuestions: number) => void;
  isGenerating: boolean;
}

export const QuizModal: React.FC<QuizModalProps> = ({ 
  isOpen, 
  onClose, 
  onGenerate, 
  isGenerating 
}) => {
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [numQuestions, setNumQuestions] = useState<number>(5);

  const handleGenerate = () => {
    onGenerate(difficulty, numQuestions);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-semibold text-text-primary">Generate Quiz</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            disabled={isGenerating}
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Difficulty Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-primary mb-3">
            Difficulty Level
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['easy', 'medium', 'hard'].map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                disabled={isGenerating}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  difficulty === level
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Number of Questions */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-primary mb-3">
            Number of Questions: {numQuestions}
          </label>
          <input
            type="range"
            min="2"
            max="8"
            value={numQuestions}
            onChange={(e) => setNumQuestions(parseInt(e.target.value))}
            disabled={isGenerating}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>2</span>
            <span>8</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="flex-1 px-4 py-2 text-sm font-medium text-text-secondary bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                Generate Quiz
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Add custom CSS for the slider
const sliderStyles = `
.slider::-webkit-slider-thumb {
  appearance: none;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #9333ea;
  cursor: pointer;
}

.slider::-moz-range-thumb {
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #9333ea;
  cursor: pointer;
  border: none;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = sliderStyles;
  document.head.appendChild(styleElement);
}