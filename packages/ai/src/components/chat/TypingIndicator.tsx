import React from 'react';

interface TypingIndicatorProps {
  isVisible: boolean;
  className?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible, className = '' }) => {
  if (!isVisible) return null;

  return (
    <div className={`flex justify-start ${className}`}>
      <div className="max-w-[85%] bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">AI is thinking...</span>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator; 