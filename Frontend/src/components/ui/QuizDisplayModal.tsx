import React, { useState, useEffect } from 'react';
import { X, Brain, RotateCcw } from 'lucide-react';

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface QuizDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuizQuestion[];
}

export const QuizDisplayModal: React.FC<QuizDisplayModalProps> = ({ 
  isOpen, 
  onClose, 
  questions 
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState(false);

  // Reset state when modal opens/closes or questions change
  useEffect(() => {
    if (isOpen) {
      setSelectedAnswers({});
      setShowResults(false);
    }
  }, [isOpen, questions]);

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    // Only allow selection if not already answered
    if (selectedAnswers[questionIndex] === undefined) {
      setSelectedAnswers(prev => ({
        ...prev,
        [questionIndex]: answer
      }));
    }
  };

  const handleFinishQuiz = () => {
    setShowResults(true);
  };

  const handleRestart = () => {
    setSelectedAnswers({});
    setShowResults(false);
  };

  const calculateScore = () => {
    const correctAnswers = questions.filter((q, index) => {
      const userAnswer = selectedAnswers[index];
      return userAnswer === q.answer;
    }).length;
    return { correct: correctAnswers, total: questions.length };
  };

  const getAnsweredCount = () => {
    return Object.keys(selectedAnswers).length;
  };

  const allQuestionsAnswered = () => {
    return getAnsweredCount() === questions.length;
  };

  if (!isOpen || questions.length === 0) return null;

  if (showResults) {
    const score = calculateScore();
    const percentage = Math.round((score.correct / score.total) * 100);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Results Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6 text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quiz Results</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="mt-4 text-center">
              <div className={`text-4xl font-bold mb-2 ${
                percentage >= 80 ? 'text-green-600' : 
                percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {percentage}%
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {score.correct} out of {score.total} questions correct
              </p>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-6">
              {questions.map((question, index) => {
                const userAnswer = selectedAnswers[index];
                const isCorrect = userAnswer === question.answer;
                
                return (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                        isCorrect 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                          {question.question}
                        </h3>
                        <div className="space-y-1 text-sm">
                          <p className={`${
                            isCorrect 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            <strong>Your answer:</strong> {userAnswer || 'No answer selected'}
                          </p>
                          {!isCorrect && (
                            <p className="text-green-600 dark:text-green-400">
                              <strong>Correct answer:</strong> {question.answer}
                            </p>
                          )}
                          {question.explanation && (
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                              <strong>Explanation:</strong> {question.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Results Actions */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 px-4 py-2 text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Retake Quiz
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Quiz</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>{questions.length} questions</span>
              <span>{getAnsweredCount()}/{questions.length} answered</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(getAnsweredCount() / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Questions Container - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">
            {questions.map((question, questionIndex) => {
              const selectedAnswer = selectedAnswers[questionIndex];
              const isAnswered = selectedAnswer !== undefined;
              
              return (
                <div key={questionIndex} className="border border-gray-200 dark:border-gray-600 rounded-lg p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-medium">
                      {questionIndex + 1}
                    </span>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white flex-1">
                      {question.question}
                    </h3>
                  </div>
                  
                  <div className="ml-11 space-y-3">
                    {question.options.map((option, optionIndex) => {
                      const isSelected = selectedAnswer === option;
                      const isCorrect = option === question.answer;
                      
                      let buttonStyle = '';
                      if (isAnswered) {
                        if (isSelected) {
                          if (isCorrect) {
                            buttonStyle = 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300';
                          } else {
                            buttonStyle = 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
                          }
                        } else if (isCorrect) {
                          buttonStyle = 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300';
                        } else {
                          buttonStyle = 'border-gray-200 dark:border-gray-600 opacity-50';
                        }
                      } else {
                        buttonStyle = 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10';
                      }
                      
                      return (
                        <button
                          key={optionIndex}
                          onClick={() => handleAnswerSelect(questionIndex, option)}
                          disabled={isAnswered}
                          className={`w-full text-left p-4 rounded-lg border transition-all ${buttonStyle} ${
                            isAnswered ? 'cursor-default' : 'cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 transition-colors ${
                              isSelected
                                ? isCorrect
                                  ? 'border-green-500 bg-green-500'
                                  : 'border-red-500 bg-red-500'
                                : isAnswered && isCorrect
                                ? 'border-green-500 bg-green-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {(isSelected || (isAnswered && isCorrect)) && (
                                <div className="w-full h-full rounded-full bg-white scale-50" />
                              )}
                            </div>
                            <span className="flex-1">{option}</span>
                            {isAnswered && isSelected && (
                              <span className="text-sm font-medium">
                                {isCorrect ? '✓' : '✗'}
                              </span>
                            )}
                            {isAnswered && !isSelected && isCorrect && (
                              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                ✓ Correct
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Show explanation after answering */}
                  {isAnswered && question.explanation && (
                    <div className="mt-4 ml-11 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Explanation:</strong> {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer with Finish Button */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          {allQuestionsAnswered() ? (
            <button
              onClick={handleFinishQuiz}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              View Results
            </button>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p>Answer all questions to view results</p>
              <p className="text-sm mt-1">
                {getAnsweredCount()} of {questions.length} questions answered
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
