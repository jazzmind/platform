/**
 * Basic BigCo Document Processing Tests
 * 
 * Tests core functionality for processing BigCo test documents
 */

import { describe, test, expect } from '@jest/globals';
import path from 'path';
import fs from 'fs';

// Mock file system for document content
const getDocumentContent = (filename: string): string => {
  const filePath = path.join(process.cwd(), 'docs', 'testing', filename);
  return fs.readFileSync(filePath, 'utf-8');
};

describe('BigCo Document Content Tests', () => {
  describe('Document Availability', () => {
    test('should have all required BigCo test documents', () => {
      const testFiles = [
        'bigco_notes.md',
        'bigco_meeting_transcript.md',
        'bigco_proposal.md',
        'bigco_tracking.md',
        'bigco_test_plan.md'
      ];

      testFiles.forEach(filename => {
        expect(() => {
          const content = getDocumentContent(filename);
          expect(content).toBeDefined();
          expect(content.length).toBeGreaterThan(100);
        }).not.toThrow();
      });
    });
  });

  describe('Client Notes Document', () => {
    test('should contain expected entities and data', () => {
      const notesContent = getDocumentContent('bigco_notes.md');
      
      // Verify key organizational info
      expect(notesContent).toContain('BigCo Industries');
      expect(notesContent).toContain('automotive');
      expect(notesContent).toContain('450 employees');
      
      // Verify key contacts
      expect(notesContent).toContain('Sarah Chen');
      expect(notesContent).toContain('sarah.chen@bigco.com');
      expect(notesContent).toContain('CEO');
      
      expect(notesContent).toContain('Mark Rodriguez');
      expect(notesContent).toContain('mark.rodriguez@bigco.com');
      expect(notesContent).toContain('CTO');
      
      expect(notesContent).toContain('Jennifer Walsh');
      expect(notesContent).toContain('jennifer.walsh@bigco.com');
      expect(notesContent).toContain('Head of Operations');
      
      // Verify opportunity details
      expect(notesContent).toContain('ERP Modernization');
      expect(notesContent).toContain('$2.5M');
      expect(notesContent).toContain('budget');
      
      // Verify technical requirements
      expect(notesContent).toContain('Oracle');
      expect(notesContent).toContain('SAP');
      expect(notesContent).toContain('Cloud migration strategy');
    });
  });

  describe('Meeting Transcript Document', () => {
    test('should contain technical meeting details', () => {
      const transcriptContent = getDocumentContent('bigco_meeting_transcript.md');
      
      // Verify meeting metadata
      expect(transcriptContent).toContain('March 22, 2024');
      expect(transcriptContent).toContain('Technical Deep Dive');
      expect(transcriptContent).toContain('2:00 PM - 4:30 PM EST');
      
      // Verify additional team members
      expect(transcriptContent).toContain('David Kim');
      expect(transcriptContent).toContain('IT Director');
      expect(transcriptContent).toContain('david.kim@bigco.com');
      
      expect(transcriptContent).toContain('Lisa Thompson');
      expect(transcriptContent).toContain('Senior Systems Analyst');
      
      expect(transcriptContent).toContain('Robert Chen');
      expect(transcriptContent).toContain('Integration Specialist');
      
      expect(transcriptContent).toContain('Maria Garcia');
      expect(transcriptContent).toContain('Technical Lead');
      
      // Verify technical details
      expect(transcriptContent).toContain('Azure');
      expect(transcriptContent).toContain('custom API development');
      expect(transcriptContent).toContain('migration strategy');
      expect(transcriptContent).toContain('Security is my main concern');
    });
  });

  describe('Proposal Document', () => {
    test('should contain comprehensive proposal details', () => {
      const proposalContent = getDocumentContent('bigco_proposal.md');
      
      // Verify proposal metadata
      expect(proposalContent).toContain('TechSolutions Inc');
      expect(proposalContent).toContain('$2,390,000');
      expect(proposalContent).toContain('Payback Period:** 18 months');
      
      // Verify our team members
      expect(proposalContent).toContain('Sarah Johnson');
      expect(proposalContent).toContain('Program Manager');
      expect(proposalContent).toContain('PMP');
      
      expect(proposalContent).toContain('Michael Chen');
      expect(proposalContent).toContain('Technical Lead');
      
      expect(proposalContent).toContain('Jennifer Park');
      expect(proposalContent).toContain('Supply Chain Lead');
      
      expect(proposalContent).toContain('James Wilson');
      expect(proposalContent).toContain('Solution Architect');
      
      // Verify pricing breakdown
      expect(proposalContent).toContain('Implementation Services');
      expect(proposalContent).toContain('$1,240,000');
      expect(proposalContent).toContain('Data Migration');
      expect(proposalContent).toContain('$125,000');
      expect(proposalContent).toContain('Training & Change Management');
      expect(proposalContent).toContain('$95,000');
      
      // Verify technical components
      expect(proposalContent).toContain('Microsoft Azure');
      expect(proposalContent).toContain('Cloud ERP Platform');
      expect(proposalContent).toContain('Business Intelligence');
    });
  });

  describe('Sales Tracking Document', () => {
    test('should contain sales opportunity tracking data', () => {
      const trackingContent = getDocumentContent('bigco_tracking.md');
      
      // Verify opportunity status
      expect(trackingContent).toContain('75%');
      expect(trackingContent).toContain('Proposal Submitted');
      expect(trackingContent).toContain('$2.39M');
      
      // Verify competitive analysis
      expect(trackingContent).toContain('SAP');
      expect(trackingContent).toContain('Microsoft');
      expect(trackingContent).toContain('Competitive');
      
      // Verify sales activities
      expect(trackingContent).toContain('Discovery Call');
      expect(trackingContent).toContain('Technical Deep Dive');
      expect(trackingContent).toContain('Proposal Delivery');
      expect(trackingContent).toContain('Reference Calls');
      
      // Verify risk assessment
      expect(trackingContent).toContain('Medium');
      expect(trackingContent).toContain('Budget Risk');
      expect(trackingContent).toContain('Timeline Risk');
    });
  });

  describe('Test Plan Document', () => {
    test('should contain comprehensive testing procedures', () => {
      const testPlanContent = getDocumentContent('bigco_test_plan.md');
      
      // Verify test scenarios
      expect(testPlanContent).toContain('Client Notes Import');
      expect(testPlanContent).toContain('Meeting Transcript');
      expect(testPlanContent).toContain('Proposal Document');
      expect(testPlanContent).toContain('Sales Tracking');
      
      // Verify expected extractions
      expect(testPlanContent).toContain('8+ contacts');
      expect(testPlanContent).toContain('BigCo Industries');
      expect(testPlanContent).toContain('our organization');
      
      // Verify success criteria
      expect(testPlanContent).toContain('Entity Matching & Deduplication');
      expect(testPlanContent).toContain('Cross-Document Integration');
      expect(testPlanContent).toContain('Section Creation Quality');
      expect(testPlanContent).toContain('Performance Requirements');
    });
  });

  describe('Document Structure Validation', () => {
    test('all documents should be valid markdown', () => {
      const testFiles = [
        'bigco_notes.md',
        'bigco_meeting_transcript.md',
        'bigco_proposal.md',
        'bigco_tracking.md',
        'bigco_test_plan.md'
      ];

      testFiles.forEach(filename => {
        const content = getDocumentContent(filename);
        
        // Basic markdown structure checks
        expect(content).toMatch(/^#\s+/m); // Has at least one h1 header
        expect(content.split('\n').length).toBeGreaterThan(10); // Substantial content
        expect(content).not.toContain('undefined'); // No undefined values
        expect(content).not.toContain('null'); // No null values
      });
    });

    test('documents should contain consistent entity references', () => {
      const allContent = [
        'bigco_notes.md',
        'bigco_meeting_transcript.md',
        'bigco_proposal.md',
        'bigco_tracking.md'
      ].map(file => getDocumentContent(file)).join('\n');

      // Check for consistent company name usage
      expect(allContent).toContain('BigCo Industries');
      expect(allContent).toContain('TechSolutions Inc');
      
      // Check for consistent contact references
      expect(allContent).toContain('Sarah Chen');
      expect(allContent).toContain('sarah.chen@bigco.com');
      
      // Check for consistent opportunity references
      expect(allContent).toContain('ERP Modernization');
      expect(allContent).toContain('$2.5M'); // Budget from notes
      expect(allContent).toContain('$2,390,000'); // Final pricing from proposal
    });
  });

  describe('Data Consistency Tests', () => {
    test('contact information should be consistent across documents', () => {
      const notes = getDocumentContent('bigco_notes.md');
      const transcript = getDocumentContent('bigco_meeting_transcript.md');
      
      // Sarah Chen should appear in notes, Mark Rodriguez in transcript (both CTO/CEO)  
      expect(notes).toContain('Sarah Chen');
      expect(transcript).toContain('Mark Rodriguez');
      expect(notes).toContain('CEO');
      expect(transcript).toContain('CTO');
    });

    test('pricing information should evolve appropriately', () => {
      const notes = getDocumentContent('bigco_notes.md');
      const proposal = getDocumentContent('bigco_proposal.md');
      const tracking = getDocumentContent('bigco_tracking.md');
      
      // Notes should have initial budget estimate
      expect(notes).toContain('$2.5M');
      
      // Proposal should have detailed pricing
      expect(proposal).toContain('$2,390,000');
      
      // Tracking should reference the proposal amount
      expect(tracking).toContain('$2.39M');
    });

    test('timeline information should be realistic', () => {
      const transcript = getDocumentContent('bigco_meeting_transcript.md');
      const proposal = getDocumentContent('bigco_proposal.md');
      
      // Meeting date should be before proposal timeline
      expect(transcript).toContain('March 22, 2024');
      expect(proposal).toContain('Payback Period:** 18 months');
      expect(proposal).toContain('June 3, 2024'); // Start after meeting
    });
  });
}); 