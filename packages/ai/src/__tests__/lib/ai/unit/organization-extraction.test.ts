/**
 * Organization & Contact Extraction Tests
 * 
 * Tests the unified organization+contact extraction service that always
 * extracts organizations WITH their associated contacts
 */

import {
  extractOrganizationsWithContacts,
  extractSingleOrganizationWithContacts,
  extractFromDocument,
  extractFromWebsite,
  extractForSearch,
  extractFromRFP,
  type OrganizationWithContactsData,
  type OrganizationContactExtractionResult
} from '../../../../lib/ai/organizationContactExtraction';

import { TEST_CONFIG, retryOperation } from '../setup/testConfig';

// Test data for organization+contact extraction
const SAMPLE_RFP_CONTENT = `
REQUEST FOR PROPOSAL
Issued by: State of California Department of Technology
Contact: Sarah Johnson, Procurement Officer
Email: sarah.johnson@state.ca.gov
Phone: (916) 555-0123

Project Manager: Michael Chen, Technical Lead
Email: michael.chen@state.ca.gov

We are seeking proposals for a comprehensive cybersecurity assessment platform
for state agencies. The selected vendor will work closely with our IT security team
led by Director Lisa Rodriguez (lisa.rodriguez@state.ca.gov).

Administrative questions should be directed to:
Jennifer Martinez, Contract Administrator
Phone: (916) 555-0145
Email: jennifer.martinez@state.ca.gov

Proposal submission deadline: March 15, 2025
Contact the vendor relations office at vendor.relations@state.ca.gov for registration.
`;

const SAMPLE_WEBSITE_CONTENT = `
About TechCorp Solutions

TechCorp Solutions is a leading software development company specializing in 
enterprise cloud solutions. Founded in 2015, we serve Fortune 500 companies
across multiple industries.

Our Leadership Team:
- John Smith, CEO (john.smith@techcorp.com)
- Dr. Sarah Wilson, CTO (sarah.wilson@techcorp.com) 
- Michael Brown, VP Sales (michael.brown@techcorp.com)

Contact Information:
Sales: sales@techcorp.com, (555) 123-4567
Support: support@techcorp.com, (555) 123-4568
General: info@techcorp.com

Address: 123 Innovation Drive, San Francisco, CA 94105
`;

const SAMPLE_PROPOSAL_CONTENT = `
PROPOSAL SUBMITTED TO:
BigCorp Industries
Attention: Robert Davis, IT Director
Email: robert.davis@bigcorp.com
Phone: (312) 555-7890

Project Sponsor: Amanda Thompson, VP Technology
Email: amanda.thompson@bigcorp.com

Technical Contact: Kevin Lee, Senior Systems Architect
Email: kevin.lee@bigcorp.com
Phone: (312) 555-7891

This proposal outlines our approach to modernizing BigCorp Industries' 
legacy inventory management system. Our team will work directly with
your technical staff to ensure seamless integration.

Contract questions should be directed to:
Legal Department: legal@bigcorp.com
Procurement: procurement@bigcorp.com
`;

describe('Organization & Contact Extraction Service', () => {
  
  describe('Unified organization+contact extraction', () => {
    it('should extract organizations WITH their contacts from RFP content', async () => {
      const result: OrganizationContactExtractionResult = await retryOperation(() =>
        extractOrganizationsWithContacts(SAMPLE_RFP_CONTENT, { 
          context: 'rfp',
          includeDetailedContacts: true
        })
      );

      expect(result).toHaveProperty('organizations');
      expect(Array.isArray(result.organizations)).toBe(true);
      expect(result.organizations.length).toBeGreaterThan(0);

      const primaryOrg = result.organizations[0];
      expect(primaryOrg).toHaveProperty('name');
      expect(primaryOrg).toHaveProperty('contacts');
      expect(Array.isArray(primaryOrg.contacts)).toBe(true);
      expect(primaryOrg.contacts.length).toBeGreaterThan(0);

      // Should extract multiple contacts from RFP
      const hasEmail = primaryOrg.contacts.some(contact => contact.email);
      const hasTitle = primaryOrg.contacts.some(contact => contact.title);
      
      expect(hasEmail).toBe(true);
      expect(hasTitle).toBe(true);

      console.log(`✅ RFP extraction: ${primaryOrg.name} with ${primaryOrg.contacts.length} contacts`);
    }, TEST_CONFIG.timeouts.completion);

    it('should extract organization with leadership team from website', async () => {
      const result: OrganizationWithContactsData | null = await retryOperation(() =>
        extractSingleOrganizationWithContacts(SAMPLE_WEBSITE_CONTENT, {
          context: 'website',
          includeDetailedContacts: true
        })
      );

      expect(result).not.toBeNull();
      if (result) {
        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('contacts');
        expect(Array.isArray(result.contacts)).toBe(true);
        expect(result.contacts.length).toBeGreaterThan(0);

        // Should identify leadership contacts
        const hasLeadership = result.contacts.some(contact => 
          contact.title && (contact.title.includes('CEO') || contact.title.includes('CTO'))
        );
        
        expect(hasLeadership).toBe(true);

        console.log(`✅ Website extraction: ${result.name} with ${result.contacts.length} contacts`);
      }
    }, TEST_CONFIG.timeouts.completion);

    it('should extract client organization with stakeholders from proposal', async () => {
      const result: OrganizationContactExtractionResult = await retryOperation(() =>
        extractOrganizationsWithContacts(SAMPLE_PROPOSAL_CONTENT, {
          context: 'proposal',
          includeDetailedContacts: true
        })
      );

      expect(result.organizations.length).toBeGreaterThan(0);
      
      const clientOrg = result.organizations[0];
      expect(clientOrg.contacts.length).toBeGreaterThan(0);

      // Should identify key stakeholders
      const hasStakeholder = clientOrg.contacts.some(contact => 
        contact.title && (contact.title.includes('Director') || contact.title.includes('VP'))
      );

      expect(hasStakeholder).toBe(true);

      console.log(`✅ Proposal extraction: ${clientOrg.name} with ${clientOrg.contacts.length} stakeholders`);
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('Contact quality and completeness', () => {
    it('should ensure every organization has at least one contact', async () => {
      const minimalContent = `TechStartup Inc. is a software company.`;

      const result: OrganizationWithContactsData | null = await retryOperation(() =>
        extractSingleOrganizationWithContacts(minimalContent, {
          context: 'search'
        })
      );

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contacts.length).toBeGreaterThan(0);
        
        // Should create default contact when none specified
        expect(result.contacts[0]).toHaveProperty('name');
        expect(result.contacts[0]).toHaveProperty('confidence');

        console.log(`✅ Minimal content handled: ${result.name} with default contact`);
      }
    }, TEST_CONFIG.timeouts.completion);

    it('should identify primary contacts correctly', async () => {
      const result: OrganizationContactExtractionResult = await retryOperation(() =>
        extractFromRFP(SAMPLE_RFP_CONTENT)
      );

      expect(result.organizations.length).toBeGreaterThan(0);
      
      const org = result.organizations[0];
      const primaryContact = org.contacts.find(contact => contact.isPrimary);
      
      expect(primaryContact).toBeDefined();
      if (primaryContact) {
        expect(primaryContact.name).toBeTruthy();
        expect(primaryContact.confidence).toBeGreaterThan(0.5);
        
        console.log(`✅ Primary contact identified: ${primaryContact.name} (${primaryContact.title || 'No title'})`);
      }
    }, TEST_CONFIG.timeouts.completion);

    it('should extract comprehensive contact information when available', async () => {
      const result: OrganizationContactExtractionResult = await retryOperation(() =>
        extractFromDocument(SAMPLE_WEBSITE_CONTENT)
      );

      expect(result.organizations.length).toBeGreaterThan(0);
      
      const org = result.organizations[0];
      const contactsWithEmail = org.contacts.filter(contact => contact.email);
      const contactsWithTitle = org.contacts.filter(contact => contact.title);
      
      expect(contactsWithEmail.length).toBeGreaterThan(0);
      expect(contactsWithTitle.length).toBeGreaterThan(0);

      console.log(`✅ Comprehensive extraction: ${contactsWithEmail.length} emails, ${contactsWithTitle.length} titles`);
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('Context-specific extraction', () => {
    it('should adapt extraction based on RFP context', async () => {
      const result: OrganizationContactExtractionResult = await retryOperation(() =>
        extractFromRFP(SAMPLE_RFP_CONTENT)
      );

      const org = result.organizations[0];
      
      // RFP context should focus on procurement contacts
      const hasProcurementContact = org.contacts.some(contact =>
        contact.title && (
          contact.title.toLowerCase().includes('procurement') ||
          contact.title.toLowerCase().includes('contract') ||
          contact.title.toLowerCase().includes('administrator')
        )
      );

      expect(hasProcurementContact).toBe(true);

      console.log(`✅ RFP context: Found procurement/contract contacts`);
    }, TEST_CONFIG.timeouts.completion);

    it('should adapt extraction based on website context', async () => {
      const result: OrganizationWithContactsData | null = await retryOperation(() =>
        extractFromWebsite(SAMPLE_WEBSITE_CONTENT, { includeFullProfile: true })
      );

      expect(result).not.toBeNull();
      if (result) {
        // Website context should focus on leadership and sales contacts
        const hasLeadershipContact = result.contacts.some(contact =>
          contact.title && (
            contact.title.includes('CEO') ||
            contact.title.includes('CTO') ||
            contact.title.includes('VP')
          )
        );

        expect(hasLeadershipContact).toBe(true);

        console.log(`✅ Website context: Found leadership contacts`);
      }
    }, TEST_CONFIG.timeouts.completion);

    it('should handle search context for quick organization lookup', async () => {
      const searchQuery = 'Microsoft Corporation contact information';
      
      const result: OrganizationWithContactsData | null = await retryOperation(() =>
        extractForSearch(searchQuery)
      );

      if (result) {
        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('contacts');
        expect(result.contacts.length).toBeGreaterThan(0);

        console.log(`✅ Search context: ${result.name} with basic contact info`);
      }
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('Error handling and edge cases', () => {
    it('should handle empty content gracefully', async () => {
      const result: OrganizationContactExtractionResult = await retryOperation(() =>
        extractOrganizationsWithContacts('', { context: 'document' })
      );

      expect(result).toHaveProperty('organizations');
      expect(result.organizations).toHaveLength(0);
      
      console.log('✅ Empty content handled gracefully');
    });

    it('should handle content with organizations but no explicit contacts', async () => {
      const content = `Apple Inc. is a technology company based in Cupertino.`;
      
      const result: OrganizationWithContactsData | null = await retryOperation(() =>
        extractSingleOrganizationWithContacts(content, {
          context: 'document'
        })
      );

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contacts.length).toBeGreaterThan(0);
        
        // Should create default contact
        const defaultContact = result.contacts.find(contact => 
          contact.name.toLowerCase().includes('general') || 
          contact.name.toLowerCase().includes('contact')
        );
        
        expect(defaultContact).toBeDefined();

        console.log(`✅ Default contact created for organization without explicit contacts`);
      }
    }, TEST_CONFIG.timeouts.completion);

    it('should handle multiple organizations with varying contact details', async () => {
      const complexContent = `
        Partnership between TechCorp Solutions (CEO: John Smith, john@techcorp.com) 
        and DataSystems LLC (Contact: Jane Doe, Sales Manager, jane.doe@datasys.com).
        Also collaborating with CloudVendor Inc. for infrastructure.
      `;

      const result: OrganizationContactExtractionResult = await retryOperation(() =>
        extractOrganizationsWithContacts(complexContent, {
          context: 'document',
          maxOrganizations: 5
        })
      );

      expect(result.organizations.length).toBeGreaterThan(1);
      
      // Each organization should have contacts
      result.organizations.forEach(org => {
        expect(org.contacts.length).toBeGreaterThan(0);
      });

      const totalContacts = result.organizations.reduce((sum, org) => sum + org.contacts.length, 0);
      
      console.log(`✅ Multiple organizations: ${result.organizations.length} orgs with ${totalContacts} total contacts`);
    }, TEST_CONFIG.timeouts.completion);
  });

  describe('Backward compatibility', () => {
    it('should maintain compatibility with legacy organization extraction methods', async () => {
      // These should still work but now return organization+contact data
      const result = await retryOperation(() =>
        extractFromDocument(SAMPLE_RFP_CONTENT)
      );

      expect(result).toHaveProperty('organizations');
      expect(result.organizations.length).toBeGreaterThan(0);
      expect(result.organizations[0]).toHaveProperty('contacts');

      console.log(`✅ Legacy compatibility maintained`);
    }, TEST_CONFIG.timeouts.completion);
  });
}); 