// Define the poll question structure
export type PollQuestion = {
  [question: string]: string[];
};

// Event form state
export type EventFormState = {
  success?: boolean;
  errors?: {
    name?: string[];
    email?: string[];
    organization?: string[];
    eventId?: string[];
    responses?: string[];
    _form?: string[];
  };
};

// Poll response structure
export type PollResponse = {
  email: string;
  responses: Record<string, string>;
  timestamp: string;
}; 