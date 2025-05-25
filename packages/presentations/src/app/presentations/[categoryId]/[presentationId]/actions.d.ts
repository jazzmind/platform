declare module './actions' {
  export function fetchNotes(categoryId: string, presentationId: string): Promise<string | null>;
  export function chatWithPresentation(
    categoryId: string,
    presentationId: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string>;
} 