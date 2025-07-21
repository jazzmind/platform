
// CSV Extraction Service using AI


// AI-powered entity extraction from CSV data
// export async function extractEntitiesFromCSV(headers: string[], rows: string[][]): Promise<{
//   opportunities: OpportunityData[];
//   contacts: ContactData[];
//   organizations: OrganizationData[];
// }> {
//   if (!rows.length) {
//     return { opportunities: [], contacts: [], organizations: [] };
//   }

//   try {
//     // Use the documentExtraction service
//     const { extractEntitiesFromCSV: extractCSVEntities } = await import('@/src/lib/ai/documentExtraction');
//     const result = await extractCSVEntities(headers, rows);
    
//     // Transform the types to match our interfaces
//     return {
//       opportunities: result.opportunities.map(opp => ({
//         id: opp.id,
//         title: opp.title,
//         value: opp.value,
//         status: opp.status,
//         description: opp.description,
//         contactId: opp.contactId,
//         organizationId: opp.organizationId,
//         notes: opp.notes,
//         actionItem: opp.actionItem,
//         lastContact: opp.lastContact,
//         stage: opp.stage
//       })),
//              contacts: result.contacts.map(contact => ({
//          id: contact.id,
//          name: contact.name,
//          firstName: contact.firstName,
//          lastName: contact.lastName,
//          email: contact.email || undefined,
//          phone: contact.phone || undefined,
//          title: contact.title || undefined,
//          organization: contact.organization || undefined,
//          organizationId: contact.organizationId,
//          linkedin: contact.linkedin || undefined,
//          skills: contact.skills || []
//        })),
//        organizations: result.organizations.map(org => ({
//          id: org.id,
//          name: org.name,
//          website: org.website || undefined,
//          sector: org.sector || undefined,
//          size: org.size || undefined,
//          address: org.address || undefined,
//          description: org.description || undefined
//        }))
//     };

//   } catch (error) {
//     console.warn('AI extraction failed, using fallback:', error);
//     return fallbackCSVExtraction(headers, rows);
//   }
// }



// Fallback extraction when AI fails
// function fallbackCSVExtraction(headers: string[], rows: string[][]): {
//   opportunities: OpportunityData[];
//   contacts: ContactData[];
//   organizations: OrganizationData[];
// } {
//   const opportunities: OpportunityData[] = [];
//   const contacts: ContactData[] = [];
//   const organizations: OrganizationData[] = [];
  
//   // Known header mappings for this specific CSV
//   const titleIndex = headers.findIndex(h => h.includes('opportunity') || h.includes('description'));
//   const valueIndex = headers.findIndex(h => h.includes('size') || h.includes('project'));
//   const contactIndex = headers.findIndex(h => h.includes('contact') || h.includes('person'));
//   const companyIndex = headers.findIndex(h => h.includes('company') || h.includes('name'));
//   const titleFieldIndex = headers.findIndex(h => h === 'title');
//   const emailIndex = headers.findIndex(h => h.includes('email'));
//   const stageIndex = headers.findIndex(h => h.includes('stage'));
//   const notesIndex = headers.findIndex(h => h.includes('notes'));
//   const actionItemIndex = headers.findIndex(h => h.includes('action item'));
//   const lastContactIndex = headers.findIndex(h => h.includes('last contact'));

//   const orgMap = new Map<string, OrganizationData>();
//   let orgCounter = 1;
//   let contactCounter = 1;
//   let oppCounter = 1;

//   for (const row of rows) {
//     if (!row[titleIndex]?.trim()) continue;

//     // Extract organization
//     let organization: OrganizationData | undefined;
//     if (companyIndex !== -1 && row[companyIndex]?.trim()) {
//       const orgName = row[companyIndex].trim();
//       const orgKey = orgName.toLowerCase();
      
//       if (!orgMap.has(orgKey)) {
//         organization = {
//           id: `org_${orgCounter++}`,
//           name: orgName
//         };
//         organizations.push(organization);
//         orgMap.set(orgKey, organization);
//       } else {
//         organization = orgMap.get(orgKey);
//       }
//     }

//     // Extract contact
//     let contact: ContactData | undefined;
//     if (contactIndex !== -1 && row[contactIndex]?.trim()) {
//       const fullName = row[contactIndex].trim();
//       const nameParts = fullName.split(' ');
      
//       contact = {
//         id: `contact_${contactCounter++}`,
//         name: fullName,
//         firstName: nameParts[0] || '',
//         lastName: nameParts.slice(1).join(' ') || '',
//         email: emailIndex !== -1 ? row[emailIndex]?.trim() || null : null,
//         title: titleFieldIndex !== -1 ? row[titleFieldIndex]?.trim() || null : null,
//         organizationId: organization?.id || null,
//         organization: organization?.name || null
//       };
//       contacts.push(contact);
//     }

//     // Extract opportunity
//     const title = row[titleIndex].trim();
    
//     // Parse value
//     let value: number | null = null;
//     if (valueIndex !== -1 && row[valueIndex]?.trim()) {
//       const valueStr = row[valueIndex].trim();
//       const cleaned = valueStr.replace(/[$,\s]/g, '');
//       const parsed = parseFloat(cleaned);
//       if (!isNaN(parsed)) {
//         value = parsed;
//       }
//     }

//     const opportunity: OpportunityData = {
//       id: `opp_${oppCounter++}`,
//       title,
//       value,
//       status: stageIndex !== -1 ? row[stageIndex]?.trim() || 'unknown' : 'unknown',
//       organizationId: organization?.id || null,
//       contactId: contact?.id || null,
//       notes: notesIndex !== -1 ? row[notesIndex]?.trim() || null : null,
//       actionItem: actionItemIndex !== -1 ? row[actionItemIndex]?.trim() || null : null,
//       lastContact: lastContactIndex !== -1 ? row[lastContactIndex]?.trim() || null : null,
//       stage: stageIndex !== -1 ? row[stageIndex]?.trim() || null : null
//     };
    
//     opportunities.push(opportunity);
//   }

//   return { opportunities, contacts, organizations };
// }
