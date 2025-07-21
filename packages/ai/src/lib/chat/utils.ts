import { NextRequest } from 'next/server';

export interface ParsedChatRequest {
  action: string;
  entityType: string;
  entityId: string;
  message?: string;
  file?: File;
  tabContext?: string;
  tabLabel?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentContent?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recentMessages?: any[];
  question?: string;
  fileId?: string;
  fileName?: string;
  dashboardContext?: {
    opportunities: Array<{
      id: string;
      title: string;
      value: number;
      status: string;
      createdAt: string;
    }>;
    totalOpportunities: number;
    pipelineStages: string[];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
  role?: 'user' | 'assistant';
  isEphemeral?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

/**
 * Parse chat request data from both JSON and FormData formats
 */
export async function parseChatRequest(req: NextRequest): Promise<ParsedChatRequest> {
  const contentType = req.headers.get('content-type');
  let requestData;

  // Handle both JSON and FormData requests
  if (contentType?.includes('multipart/form-data')) {
    const formData = await req.formData();
    requestData = {
      action: formData.get('action') as string,
      entityType: formData.get('entityType') as string,
      entityId: formData.get('entityId') as string,
      message: formData.get('message') as string,
      file: formData.get('file') as File,
      tabContext: formData.get('tabContext') as string,
      tabLabel: formData.get('tabLabel') as string,
      currentContent: JSON.parse((formData.get('currentContent') as string) || '[]'),
      recentMessages: JSON.parse((formData.get('recentMessages') as string) || '[]'),
      dashboardContext: JSON.parse((formData.get('dashboardContext') as string) || 'null')
    };
  } else {
    requestData = await req.json();
  }

  const {
    action = 'chat',
    entityType,
    entityId,
    message,
    file,
    tabContext,
    tabLabel,
    currentContent,
    recentMessages,
    question,
    fileId,
    fileName,
    dashboardContext,
    data
  } = requestData;

  return {
    action,
    entityType,
    entityId,
    message,
    file,
    tabContext,
    tabLabel,
    currentContent,
    recentMessages,
    question,
    fileId,
    fileName,
    dashboardContext,
    data
  };
}

/**
 * Validate required fields for chat requests
 */
export function validateChatRequest(data: ParsedChatRequest): { isValid: boolean; error?: string } {
  if (!data.entityType || !data.entityId) {
    return {
      isValid: false,
      error: 'EntityType and entityId are required'
    };
  }

  // Action-specific validations
  switch (data.action) {
    case 'chat':
    case 'search':
      if (!data.message) {
        return {
          isValid: false,
          error: 'Message is required for chat and search actions'
        };
      }
      break;
    
    case 'analyze-document':
      if (!data.file) {
        return {
          isValid: false,
          error: 'File is required for document analysis'
        };
      }
      break;
    
    case 'document-question':
      if (!data.question) {
        return {
          isValid: false,
          error: 'Question is required for document questions'
        };
      }
      break;
  }

  return { isValid: true };
}

/**
 * Create standard error response
 */
export function createErrorResponse(message: string) {
  return {
    success: false,
    error: message
  };
}

/**
 * Create standard success response
 */
export function createSuccessResponse(data: Record<string, unknown>) {
  return {
    success: true,
    ...data
  };
} 


export interface ActionProgress {
  stage: string;
  current: number;
  total: number;
  message: string;
}


// Keep streaming interface for backwards compatibility during transition
export interface StreamMessage {
  type: 'message' | 'progress' | 'error' | 'completed' | 'action_selection' | 'storage';
  role?: 'assistant' | 'user';
  content?: string;
  progress?: ActionProgress;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}


/**
 * Helper function to send stream messages
 */
export async function sendStreamMessage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controller: ReadableStreamDefaultController<any>,
  message: StreamMessage
): Promise<void> {
  const encoder = new TextEncoder();
  const messageData = `data: ${JSON.stringify(message)}\n\n`;
  controller.enqueue(encoder.encode(messageData));
}



// Helper function to properly parse CSV content with complex headers and quoted fields
export function parseCSVContent(csvText: string): { headers: string[], rows: string[][] } {
  const lines = csvText.trim().split('\n');
  
  // For this specific CSV structure, we know the header structure
  const headers = [
    'description of opportunity',
    'project size', 
    'contact person',
    'company name',
    'title',
    'email address',
    'stage',
    'last contact',
    'action item',
    'notes'
  ];
  
  // Find the first actual data row (after the multiline header with quoted Stage field)
  let dataStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Look for lines that start with actual opportunity names (not header or stage definitions)
    if (
        (line.includes(',') && !line.includes('Stage:') && !line.includes('Description of Opportunity') && 
         !line.startsWith('-') && !line.startsWith(' -'))) {
      dataStartIndex = i;
      break;
    }
  }
  
  if (dataStartIndex === -1) {
    console.warn('No data rows found in CSV');
    return { headers, rows: [] };
  }
  
  console.log(`📊 Found data starting at line ${dataStartIndex + 1}`);
  
  // Parse data rows using proper CSV parsing
  const rows: string[][] = [];
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.split(',').every(cell => !cell.trim())) {
      continue; // Skip empty lines
    }
    
    const cells = parseCSVLine(line);
    if (cells.length >= 4 && cells[0].trim()) { // Must have at least opportunity name
      // Clean up any remaining carriage returns
      const cleanedCells = cells.map(cell => cell.replace(/\r$/, '').trim());
      rows.push(cleanedCells);
      console.log(`Parsed row ${rows.length}: ${cleanedCells.slice(0, 5).join(' | ')}`);
    }
  }
  
  console.log(`📊 Parsed ${rows.length} data rows`);
  return { headers, rows };
}

// Proper CSV line parser that handles quoted fields correctly
function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (!inQuotes) {
        // Starting quotes
        inQuotes = true;
      } else if (i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote (double quote)
        current += '"';
        i++; // Skip next quote
      } else {
        // Ending quotes
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator outside quotes
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
    i++;
  }
  
  // Add the last cell
  cells.push(current.trim());
  
  return cells;
}

// Helper functions
export function getEntityKey(entityType: string, entityId: string): string {
    return `${entityType}-${entityId}`;
}


// Helper function to determine file type from MIME type and filename
export function determineFileType(mimeType: string, filename: string): 'pdf' | 'text' | 'image' | 'audio' | 'video' {
  if (mimeType.startsWith('application/pdf')) return 'pdf';
  if (mimeType.startsWith('text/') || filename.endsWith('.txt') || filename.endsWith('.csv') || filename.endsWith('.md')) return 'text';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'text'; // Default fallback
}

