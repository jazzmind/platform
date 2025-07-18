// Utility functions for knowledgebase

export function formatTitle(title: string): string {
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export const config = {
  packageName: 'knowledgebase',
  version: '0.1.0',
  mode: 'dual' // supports both standalone and composition
};
