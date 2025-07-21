import { extractContentFromFile } from '@/src/lib/ai/contentExtraction';
import { detectDocumentType, analyzeSemantic } from '@/src/lib/ai/documentAnalysis';
import { classifyDocument } from '@/src/lib/ai/documentClassification';
import { storeFileChunks, storeSemanticSections } from '@/src/lib/database/prisma/fileData';
import { getOpportunityById, updateOpportunity, uploadDocument } from '@/src/lib/database';
import { UploadedFile } from '@/src/types/opportunity';

export interface ProcessingProgress {
  stage: string;
  current: number;
  total: number;
  message: string;
  phase?: 'extracting' | 'embedding' | 'analyzing' | 'completing';
}

export interface ProgressReporter {
  (progress: ProcessingProgress): void | Promise<void>;
}

export interface ProcessingOptions {
  opportunityId: string;
  uploadedBy: string;
  progressReporter?: ProgressReporter;
  uploadViaChat?: boolean;
}

export interface ProcessingResult {
  uploadedFile: UploadedFile;
  extractedContent: {
    text: string;
    metadata?: Record<string, unknown>;
  };
  semanticSections: Array<{
    title: string;
    content: string;
    keywords: string[];
    metadata?: Record<string, unknown>;
  }>;
  documentType: string;
  classification?: {
    documentType: 'rfp' | 'requirements' | 'proposal' | 'ideation' | 'reference' | 'other';
    confidence: number;
    reasoning: string;
    suggestedSections: string[];
    priority: 'high' | 'medium' | 'low';
    keyTopics: string[];
    shouldUpdateSections: boolean;
  };
}

// Determine file type using consistent logic
function determineFileType(mimeType: string, filename: string): UploadedFile['fileType'] {
  if (mimeType.startsWith('application/pdf')) return 'pdf';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('text/')) return 'text';
  
  // Check file extension as fallback
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) return 'audio';
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext || '')) return 'video';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
  
  return 'text';
}

// Store file in blob storage
async function storeFile(file: File, uploadedBy: string): Promise<string> {
  const fileUrl = await uploadDocument(file, uploadedBy, 'opportunities');
  if (!fileUrl) {
    throw new Error('Failed to upload file to storage');
  }
  return fileUrl;
}

// Update file progress in opportunity record
async function updateFileProgress(
  opportunityId: string, 
  fileId: string, 
  progress: Partial<{
    totalPages: number;
    processedPages: number;
    progress: number;
    startTime: number;
    extractedTextLength: number;
    currentPhase: 'extracting' | 'embedding' | 'analyzing' | 'completing';
    phaseProgress: number;
    message: string;
  }>
): Promise<void> {
  try {
    const opportunity = await getOpportunityById(opportunityId);
    if (!opportunity) return;

    const opportunityData = opportunity as unknown as { uploadedFiles?: UploadedFile[] };
    const updatedFiles = (opportunityData?.uploadedFiles || []).map((file: UploadedFile) => {
      if (file.id === fileId) {
        return {
          ...file,
          processingProgress: {
            totalPages: 1,
            processedPages: 0,
            progress: 0,
            startTime: Date.now(),
            extractedTextLength: 0,
            phaseProgress: 0,
            ...file.processingProgress,
            ...progress
          }
        };
      }
      return file;
    });

    await updateOpportunity(opportunityId, { uploadedFiles: updatedFiles });
  } catch (error) {
    console.error('Error updating file progress:', error);
    // Don't throw - this is a non-critical update
  }
}

/**
 * Process a document through the complete pipeline:
 * 1. Store file in blob storage
 * 2. Create file record in opportunity
 * 3. Extract content
 * 4. Store chunks and create embeddings
 * 5. Generate semantic sections
 * 6. Classify document
 * 7. Update file status
 */
export async function processDocumentComplete(
  file: File,
  options: ProcessingOptions
): Promise<ProcessingResult> {
  const { opportunityId, uploadedBy, progressReporter, uploadViaChat = false } = options;
  
  // Helper function to report progress
  let fileId: string | null = null;
  
  const reportProgress = async (progress: ProcessingProgress) => {
    if (progressReporter) {
      await progressReporter(progress);
    }
    
    // Update database progress if we have the fileId
    if (fileId) {
      await updateFileProgress(opportunityId, fileId, {
        currentPhase: progress.phase || 'extracting',
        phaseProgress: progress.current,
        progress: progress.current,
        message: progress.message
      });
    }
  };

  console.log(`📄 Starting complete document processing for file: ${file.name}`);

  try {
    // Step 1: Store file in blob storage (Quick - 2%)
    await reportProgress({
      stage: 'storing',
      current: 2,
      total: 100,
      message: 'Storing file in cloud storage...',
      phase: 'extracting'
    });

    const fileUrl = await storeFile(file, uploadedBy);
    fileId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Step 2: Create file record and add to opportunity (Quick - 5%)
    await reportProgress({
      stage: 'registering',
      current: 5,
      total: 100,
      message: 'Registering file in knowledge base...',
      phase: 'extracting'
    });

    const uploadedFile: UploadedFile = {
      id: fileId,
      filename: fileUrl,
      originalName: file.name,
      fileType: determineFileType(file.type, file.name),
      fileSize: file.size,
      uploadedAt: now,
      uploadedBy: uploadedBy,
      status: 'processing',
      metadata: { 
        title: file.name,
        ...(uploadViaChat && { uploadedViaChat: true })
      }
    };

    // Add file to opportunity record
    const opportunity = await getOpportunityById(opportunityId);
    const opportunityData = opportunity as unknown as { 
      organizationId?: string; 
      ownerOrganizationId?: string;
      uploadedFiles?: UploadedFile[] 
    };
    const currentFiles = opportunityData?.uploadedFiles || [];
    const updatedFiles = [...currentFiles, uploadedFile];

    console.log(`📎 Adding file to opportunity ${opportunityId}:`, {
      fileId: uploadedFile.id,
      fileName: uploadedFile.originalName,
      currentFilesCount: currentFiles.length,
      newFilesCount: updatedFiles.length
    });

    try {
    await updateOpportunity(opportunityId, { uploadedFiles: updatedFiles });
      console.log(`✅ Successfully added file ${uploadedFile.id} to opportunity ${opportunityId}`);
    } catch (error) {
      console.error(`❌ Failed to add file ${uploadedFile.id} to opportunity ${opportunityId}:`, error);
      throw error;
    }
    
    // Store file metadata in FileData table as the master record
    const organizationId = opportunityData?.organizationId || opportunityData?.ownerOrganizationId;
    if (organizationId) {
      const { storeFileMetadata } = await import('@/src/lib/database/prisma/fileData');
      try {
        await storeFileMetadata(
          uploadedFile.id,
          'opportunity',
          opportunityId,
          organizationId,
          {
            filename: uploadedFile.filename,
            originalName: uploadedFile.originalName,
            fileType: uploadedFile.fileType,
            fileSize: uploadedFile.fileSize,
            uploadedAt: uploadedFile.uploadedAt,
            status: uploadedFile.status,
            metadata: uploadedFile.metadata
          }
        );
        console.log(`✅ Stored file metadata for ${uploadedFile.id}`);
      } catch (error) {
        console.error(`❌ Failed to store file metadata for ${uploadedFile.id}:`, error);
      }
    }

    // Create filename vector embedding for search
    try {
      const { VectorDatabase } = await import('@/src/lib/database/prisma/vectorDatabase');
      const { EmbeddingService } = await import('./embeddingService');
      
      const vectorDb = new VectorDatabase();
      const embeddingService = new EmbeddingService();
      
      const filenameEmbedding = await embeddingService.generateEmbedding(`File: ${uploadedFile.originalName}`);
      
      await vectorDb.createVector({
        entityType: 'opportunity',
        entityId: opportunityId,
        sourceEntityType: 'FileData',
        sourceEntityId: uploadedFile.id,
        content: `File: ${uploadedFile.originalName}`,
        vector: filenameEmbedding,
        metadata: {
          title: uploadedFile.originalName,
          fileType: uploadedFile.fileType,
          chunkIndex: 0,
          totalChunks: 1,
          originalName: uploadedFile.originalName,
          isFileMetadata: true,
          extractedAt: uploadedFile.uploadedAt
        }
      });
      console.log(`✅ Created filename vector for ${uploadedFile.originalName}`);
    } catch (error) {
      console.error(`❌ Failed to create filename vector for ${uploadedFile.originalName}:`, error);
    }

    // Trigger immediate files tab refresh when processing starts
    await notifyKnowledgeBaseRefresh(opportunityId, uploadedFile.id, 'processing');

    // Step 3: Extract content (Moderate - 15%)
    await reportProgress({
      stage: 'extracting',
      current: 10,
      total: 100,
      message: 'Extracting text content...',
      phase: 'extracting'
    });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const extractedContent = await extractContentFromFile(fileBuffer, uploadedFile.fileType, uploadedFile.id);
    
    console.log(`Phase 1 complete: Extracted ${extractedContent.text.length} characters from ${uploadedFile.fileType} file`);

    await reportProgress({
      stage: 'extracted',
      current: 15,
      total: 100,
      message: `Extracted ${extractedContent.text.length.toLocaleString()} characters`,
      phase: 'extracting'
    });

    // Step 4: Store chunks and create embeddings (Slow - 15% to 60%)
    if (organizationId) {
      await reportProgress({
        stage: 'chunking',
        current: 20,
        total: 100,
        message: 'Creating searchable chunks...',
        phase: 'embedding'
      });

      const chunkSize = 8000; // ~2000 tokens
      const chunks = [];
      
      for (let i = 0; i < extractedContent.text.length; i += chunkSize) {
        const chunkContent = extractedContent.text.slice(i, i + chunkSize);
        chunks.push({
          content: chunkContent,
          metadata: {
            chunkIndex: Math.floor(i / chunkSize),
            totalChunks: Math.ceil(extractedContent.text.length / chunkSize),
            fileType: uploadedFile.fileType,
            originalName: uploadedFile.originalName,
            ...(uploadViaChat && { uploadedViaChat: true }),
            ...extractedContent.metadata,
          },
        });
      }

      await storeFileChunks(
        uploadedFile.id,
        'opportunity',
        opportunityId,
        organizationId,
        chunks,
        extractedContent.metadata
      );

      console.log(`Successfully stored ${chunks.length} chunks in FileData table for file ${uploadedFile.id}`);

      await reportProgress({
        stage: 'embedding',
        current: 30,
        total: 100,
        message: `Creating vector embeddings for ${chunks.length} chunks (this takes time)...`,
        phase: 'embedding'
      });

      // Create embeddings - this is the slowest part
      const { processFileDataChunks } = await import('@/src/lib/ai/contentExtraction');
      await processFileDataChunks(uploadedFile.id, 'opportunity', opportunityId);
      
      await reportProgress({
        stage: 'embeddings_complete',
        current: 60,
        total: 100,
        message: 'Vector embeddings complete, analyzing document structure...',
        phase: 'embedding'
      });
    }

    // Step 5: Generate semantic sections (Slow - 60% to 85%)
    await reportProgress({
      stage: 'analyzing',
      current: 65,
      total: 100,
      message: 'Analyzing document structure (this takes time)...',
      phase: 'analyzing'
    });

    const semanticSections = await analyzeSemantic(extractedContent.text, (progress) => {
      const progressPercent = 65 + Math.round((progress.current / progress.total) * 20); // 65-85%
      reportProgress({
        stage: 'semantic',
        current: progressPercent,
        total: 100,
        message: progress.message,
        phase: 'analyzing'
      }).catch(err => console.error('Progress update failed:', err));
    });

    // Store semantic sections in FileData table
    if (organizationId) {
      await storeSemanticSections(
        uploadedFile.id,
        'opportunity',
        opportunityId,
        organizationId,
        semanticSections
      );
      console.log(`Stored ${semanticSections.length} semantic sections in FileData table`);
    }

    // Step 6: Classify document (optional for enhanced analysis)
    let classification: {
      documentType: 'rfp' | 'requirements' | 'proposal' | 'ideation' | 'reference' | 'other';
      confidence: number;
      reasoning: string;
      suggestedSections: string[];
      priority: 'high' | 'medium' | 'low';
      keyTopics: string[];
      shouldUpdateSections: boolean;
    } | undefined;

    try {
      await reportProgress({
        stage: 'classifying',
        current: 90,
        total: 100,
        message: 'Classifying document type...',
        phase: 'analyzing'
      });

      const opportunityRecord = await getOpportunityById(opportunityId);
      const opportunitySections = (opportunityRecord as unknown as { 
        sections?: Array<{ id: string; title: string; content?: string }> 
      })?.sections || [];
      
      classification = await classifyDocument(
        uploadedFile.originalName,
        extractedContent.text,
        opportunitySections
      );

      console.log(`Document classified as: ${classification.documentType} (confidence: ${classification.confidence}%)`);
    } catch (classificationError) {
      console.error('Document classification failed:', classificationError);
      // Continue without classification
    }

    // Step 7: Update file status to completed
    await reportProgress({
      stage: 'finalizing',
      current: 95,
      total: 100,
      message: 'Finalizing document processing...',
      phase: 'completing'
    });

    // Re-fetch opportunity to get latest uploadedFiles state
    const latestOpportunity = await getOpportunityById(opportunityId);
    const latestOpportunityData = latestOpportunity as unknown as { 
      uploadedFiles?: UploadedFile[] 
    };
    const latestFiles = latestOpportunityData?.uploadedFiles || [];
    
    console.log(`🔄 Updating file status for ${fileId}:`, {
      totalFilesFound: latestFiles.length,
      targetFileExists: latestFiles.some(f => f.id === fileId)
    });

    const finalFiles = latestFiles.map(f => 
      f.id === fileId ? { 
        ...f, 
        status: 'completed' as const,
        ...(classification && {
          metadata: {
            ...f.metadata,
            classification
          }
        })
      } : f
    );

    try {
    await updateOpportunity(opportunityId, { uploadedFiles: finalFiles });
      console.log(`✅ Successfully updated file ${fileId} status to completed`);
    } catch (error) {
      console.error(`❌ Failed to update file ${fileId} status:`, error);
      throw error;
    }

    // Notify knowledge base that processing is complete
    if (uploadViaChat) {
      await notifyKnowledgeBaseRefresh(opportunityId, fileId, 'completed');
    }

    await reportProgress({
      stage: 'completed',
      current: 100,
      total: 100,
      message: 'Document processing complete!',
      phase: 'completing'
    });

    // Detect document type for response
    const documentType = detectDocumentType(extractedContent.text);

    return {
      uploadedFile,
      extractedContent,
      semanticSections,
      documentType,
      classification
    };

  } catch (error) {
    console.error('Error in document processing:', error);
    
    await reportProgress({
      stage: 'error',
      current: 0,
      total: 100,
      message: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      phase: 'completing'
    });

    throw error;
  }
}

/**
 * Send chat progress updates for knowledge base uploads
 * This allows users to navigate away while processing continues
 */
export async function sendChatProgressUpdates(
  opportunityId: string,
  fileName: string,
  progress: ProcessingProgress
) {
  // TODO: Implement WebSocket or Server-Sent Events to send real-time updates
  // For now, we could store progress in database and poll from frontend
  
  console.log(`Chat progress update for opportunity ${opportunityId}: ${progress.message} (${progress.current}%)`);
  
  // Future implementation might look like:
  // await sendWebSocketMessage(`opportunity:${opportunityId}:progress`, {
  //   fileName,
  //   progress
  // });
}

/**
 * Store upload notification for knowledge base refresh
 */
export async function notifyKnowledgeBaseRefresh(
  opportunityId: string,
  fileId: string,
  status: 'uploading' | 'processing' | 'completed' | 'failed'
) {
  try {
    // Store notification in localStorage for the frontend to pick up
    if (typeof window !== 'undefined') {
      const notifications = JSON.parse(localStorage.getItem('kb_refresh_notifications') || '[]');
      notifications.push({
        opportunityId,
        fileId,
        status,
        timestamp: Date.now()
      });
      localStorage.setItem('kb_refresh_notifications', JSON.stringify(notifications));
      
      // Dispatch custom event for immediate refresh
      window.dispatchEvent(new CustomEvent('knowledgeBaseRefresh', {
        detail: { opportunityId, fileId, status }
      }));
    }
  } catch (error) {
    console.error('Error storing knowledge base refresh notification:', error);
  }
} 