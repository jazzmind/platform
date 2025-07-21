/**
 * File Test Utilities for New Architecture
 * 
 * Provides utilities for uploading and cleaning up test files
 * in a way that supports parallel test execution.
 */

interface TestFileUpload {
  fileId: string;
  fileName: string;
  entityType: string;
  entityId: string;
  wasFromCache: boolean;
}

interface FileUploadResult {
  success: boolean;
  fileId?: string;
  fileHash?: string;
  fileName?: string;
  wasFromCache?: boolean;
  error?: string;
}

/**
 * Upload a test file and return the fileId
 */
export async function uploadTestFile(
  fileName: string,
  content: string,
  entityType: 'workspace' | 'opportunity' | 'proposal' | 'knowledgebase',
  entityId: string,
  fileType: 'text/plain' | 'text/markdown' | 'text/csv' = 'text/plain'
): Promise<TestFileUpload> {
  const blob = new Blob([content], { type: fileType });
  const file = new File([blob], fileName, { type: fileType });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('entityType', entityType);
  formData.append('entityId', entityId);

  const response = await fetch('http://localhost:3101/api/files/upload', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(`File upload failed: ${errorData.error}`);
  }

  const result: FileUploadResult = await response.json();
  
  if (!result.success || !result.fileId) {
    throw new Error(`File upload failed: ${result.error || 'No fileId returned'}`);
  }

  return {
    fileId: result.fileId,
    fileName: result.fileName || fileName,
    entityType,
    entityId,
    wasFromCache: result.wasFromCache || false
  };
}

/**
 * Delete a test file
 */
export async function deleteTestFile(
  fileId: string,
  entityType: 'workspace' | 'opportunity' | 'proposal' | 'knowledgebase',
  entityId: string
): Promise<void> {
  const response = await fetch(`http://localhost:3101/api/files/${fileId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entityType, entityId })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Delete failed' }));
    throw new Error(`File deletion failed: ${errorData.error}`);
  }
}

/**
 * Verify file upload caching by uploading the same file twice
 */
export async function verifyFileUploadCaching(
  fileName: string,
  content: string,
  entityType: 'workspace' | 'opportunity' | 'proposal' | 'knowledgebase',
  entityId: string
): Promise<{ firstUpload: TestFileUpload; secondUpload: TestFileUpload; cachingWorks: boolean }> {
  // First upload
  const firstUpload = await uploadTestFile(fileName, content, entityType, entityId);
  
  // Second upload (should be cached)
  const secondUpload = await uploadTestFile(fileName, content, entityType, entityId);
  
  const cachingWorks = firstUpload.fileId === secondUpload.fileId && secondUpload.wasFromCache;
  
  return {
    firstUpload,
    secondUpload,
    cachingWorks
  };
}

/**
 * Test file manager for organizing test file lifecycle
 */
export class TestFileManager {
  private uploadedFiles: TestFileUpload[] = [];

  /**
   * Upload a file and track it for cleanup
   */
  async uploadFile(
    fileName: string,
    content: string,
    entityType: 'workspace' | 'opportunity' | 'proposal' | 'knowledgebase',
    entityId: string,
    fileType: 'text/plain' | 'text/markdown' | 'text/csv' = 'text/plain'
  ): Promise<TestFileUpload> {
    const upload = await uploadTestFile(fileName, content, entityType, entityId, fileType);
    this.uploadedFiles.push(upload);
    return upload;
  }

  /**
   * Get all uploaded files
   */
  getUploadedFiles(): TestFileUpload[] {
    return [...this.uploadedFiles];
  }

  /**
   * Clean up all uploaded files
   */
  async cleanup(): Promise<void> {
    const deletePromises = this.uploadedFiles.map(upload =>
      deleteTestFile(upload.fileId, upload.entityType as 'workspace' | 'opportunity' | 'proposal' | 'knowledgebase', upload.entityId)
        .catch(error => {
          console.warn(`Failed to delete test file ${upload.fileId}:`, error);
        })
    );

    await Promise.all(deletePromises);
    this.uploadedFiles = [];
  }
}

/**
 * Standard test file content for consistent testing
 */
export const TEST_FILE_CONTENT = {
  RFP: `# Education Platform RFP

## Project Overview
TechEd Solutions Inc. is seeking to implement a comprehensive education technology platform 
that will revolutionize online learning experiences for students and educators.

## Key Stakeholders
- **Dr. Sarah Johnson** - CTO (sarah.johnson@teched.edu)
- **Mark Peterson** - VP of Education Technology (mark.peterson@teched.edu)
- **Lisa Chen** - Director of Student Services (lisa.chen@teched.edu)

## Technical Requirements
- Student information system integration
- Real-time collaboration tools
- Mobile-responsive design
- Advanced analytics and reporting
- Multi-language support

## Budget and Timeline
- Total project budget: $850,000
- Implementation timeline: 8 months
- Go-live date: Q2 2024
`,

  PROPOSAL: `# Business Technology Proposal

## Executive Summary
This proposal outlines our comprehensive approach to modernizing your technology infrastructure.

## Key Benefits
- Improved efficiency by 40%
- Cost reduction of $200,000 annually
- Enhanced security protocols
- Scalable cloud architecture

## Implementation Plan
Phase 1: Infrastructure assessment (2 weeks)
Phase 2: System design (4 weeks) 
Phase 3: Implementation (12 weeks)
Phase 4: Testing and deployment (2 weeks)

## Team
- Project Manager: John Smith
- Lead Developer: Jane Doe
- System Architect: Bob Wilson
`,

  CSV_CONTACTS: `name,email,title,company,phone
John Smith,john.smith@example.com,CEO,Tech Corp,555-0101
Jane Doe,jane.doe@example.com,CTO,Tech Corp,555-0102
Bob Wilson,bob.wilson@consulting.com,Senior Consultant,Wilson Consulting,555-0103
Alice Brown,alice.brown@startup.com,Founder,StartupXYZ,555-0104`,

  TECHNICAL_REQUIREMENTS: `# Technical Requirements Document
        
This document outlines the technical requirements for a machine learning platform.

## Key Requirements:
- Python-based backend with Django/Flask
- React frontend with TypeScript
- PostgreSQL database
- Docker containerization
- AWS cloud deployment
- CI/CD pipeline with GitHub Actions

## Team Size: 8-12 developers
## Timeline: 6-9 months
## Budget: $750,000 - $1,200,000`,

BUSINESS_REQUIREMENTS: `# Business Requirements Document

## Project Overview
Our client, TechCorp Industries, is seeking to implement a comprehensive customer relationship management (CRM) system to modernize their sales and customer service operations.

## Key Stakeholders
- **Sarah Mitchell** - Chief Technology Officer (sarah.mitchell@techcorp.com)
- **John Davidson** - VP of Sales (john.davidson@techcorp.com)  
- **Emily Rodriguez** - Customer Service Director (emily.rodriguez@techcorp.com)

## Business Requirements
- Centralized customer database with 360-degree customer view
- Advanced sales pipeline management and forecasting
- Automated marketing campaign management
- Real-time analytics and reporting dashboard
- Mobile application for field sales representatives

## Technical Requirements
- Cloud-based solution with 99.9% uptime SLA
- Integration with existing ERP system (SAP)
- Support for 500+ concurrent users
- GDPR and SOX compliance
- API-first architecture for future integrations

## Budget and Timeline
- **Total Budget**: $750,000
- **Implementation Timeline**: 6 months
- **Go-live Date**: Q3 2024
- **Expected ROI**: 25% increase in sales productivity

## Success Criteria
- 95% user adoption within 3 months of go-live
- 20% reduction in customer service response time
- 30% improvement in sales forecast accuracy`
}; 