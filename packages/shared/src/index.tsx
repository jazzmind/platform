// Shared components and utilities
import React from 'react';

export const SharedButton: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <button>{children}</button>;
};

// Export authorization types
export * from './types';

// Export authorization utilities
export * from './lib/authorization';
export * from './lib/middleware';
export * from './lib/setup-authorization';

// Export other utilities
export * from './lib/utils';
export { default as MarkdownRenderer } from './components/MarkdownRenderer';
export * from './lib/rate-limit'; 