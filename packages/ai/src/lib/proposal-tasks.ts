import { Task } from '@/src/types/proposal';
import { identifyRequirements } from '@/src/lib/ai/requirements';
import { RequirementsIdentificationSchema } from '@/src/lib/ai/requirements';
import { z } from 'zod';

export const DEFAULT_PROPOSAL_TASKS: Task[] = [
  {
    id: 'customer',
    title: 'Identify Customer',
    description: 'Set customer organization and primary contact',
    completed: false,
    tab: 'customer'
  },
  {
    id: 'requirements',
    title: 'Gather Requirements',
    description: 'Define and track all proposal requirements',
    completed: false,
    tab: 'requirements'
  },
  {
    id: 'team',
    title: 'Assign Team',
    description: 'Assign delivery team members and roles',
    completed: false,
    tab: 'team'
  },
  {
    id: 'content',
    title: 'Create Content',
    description: 'Write and organize proposal content',
    completed: false,
    tab: 'content'
  },
  {
    id: 'pricing',
    title: 'Analyze Pricing',
    description: 'Define pricing structure and analyze costs',
    completed: false,
    tab: 'pricing'
  },
  {
    id: 'review',
    title: 'Review & Submit',
    description: 'Final review and submission preparation',
    completed: false,
    tab: 'share'
  }
];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTasksFromOpportunity(opportunity: any): Task[] {
  const tasks = [...DEFAULT_PROPOSAL_TASKS];
  
  console.log('[TaskCompletion] Checking task completion for opportunity:', {
    forOrganizationId: !!opportunity.forOrganizationId,
    forContactId: !!opportunity.forContactId,
    sectionsCount: opportunity.sections?.length || 0,
    teamMembersCount: opportunity.teamMembers?.length || 0,
    hasEstimate: !!(opportunity.estimate || opportunity.pricing),
    permissionsCount: opportunity.permissions ? Object.keys(opportunity.permissions).length : 0
  });
  
  // Mark customer task as complete if organization AND contact info is available
  if (opportunity.forOrganizationId && opportunity.forContactId) {
    const customerTask = tasks.find(t => t.id === 'customer');
    if (customerTask) {
      customerTask.completed = true;
      console.log('[TaskCompletion] ✅ Customer task marked complete');
    }
  }
  
  // Mark requirements task as complete if opportunity has requirements content
  if (opportunity.sections && opportunity.sections.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasRequirements = opportunity.sections.some((section: any) => 
      (section.title?.toLowerCase().includes('requirement') || 
       section.content?.toLowerCase().includes('requirement')) &&
       section.content && section.content.trim().length > 20 // Has meaningful content
    );
    
    // Also check if there are substantial sections regardless of title
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasSubstantialContent = opportunity.sections.some((section: any) => 
      section.content && section.content.trim().length > 50
    );
    
    if (hasRequirements || hasSubstantialContent) {
      const requirementsTask = tasks.find(t => t.id === 'requirements');
      if (requirementsTask) {
        requirementsTask.completed = true;
        console.log('[TaskCompletion] ✅ Requirements task marked complete');
      }
    }
  }
  
  // Mark team task as complete if opportunity has team members
  if ((opportunity.teamMembers && opportunity.teamMembers.length > 0) || 
      (opportunity.permissions && Object.keys(opportunity.permissions).length > 1)) {
    const teamTask = tasks.find(t => t.id === 'team');
    if (teamTask) {
      teamTask.completed = true;
      console.log('[TaskCompletion] ✅ Team task marked complete');
    }
  }
  
  // Mark content task as complete if opportunity has multiple sections with content
  if (opportunity.sections && opportunity.sections.length >= 2) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sectionsWithContent = opportunity.sections.filter((section: any) => 
      section.content && section.content.trim().length > 20
    );
    
    if (sectionsWithContent.length >= 2) {
      const contentTask = tasks.find(t => t.id === 'content');
      if (contentTask) {
        contentTask.completed = true;
        console.log('[TaskCompletion] ✅ Content task marked complete');
      }
    }
  }
  
  // Mark pricing task as complete if opportunity has estimates
  if (opportunity.estimate || opportunity.pricing) {
    const pricingTask = tasks.find(t => t.id === 'pricing');
    if (pricingTask) {
      pricingTask.completed = true;
      console.log('[TaskCompletion] ✅ Pricing task marked complete');
    }
  }
  
  // Mark review task as complete if all other tasks are complete
  const completedTasks = tasks.filter(t => t.completed && t.id !== 'review').length;
  const totalTasks = tasks.filter(t => t.id !== 'review').length;
  
  if (completedTasks === totalTasks) {
    const reviewTask = tasks.find(t => t.id === 'review');
    if (reviewTask) {
      reviewTask.completed = true;
      console.log('[TaskCompletion] ✅ Review task marked complete');
    }
  }
  
  console.log('[TaskCompletion] Final task status:', tasks.map(t => `${t.id}: ${t.completed ? '✅' : '❌'}`));
  
  return tasks;
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function extractRequirementsFromOpportunity(opportunity: any): Promise<any[]> {
  // Collect all relevant content from the opportunity
  let opportunityContent = '';
  
  if (opportunity.title) {
    opportunityContent += `Title: ${opportunity.title}\n\n`;
  }
  
  if (opportunity.description) {
    opportunityContent += `Description: ${opportunity.description}\n\n`;
  }
  
  if (opportunity.sections && opportunity.sections.length > 0) {
    opportunityContent += 'Sections:\n';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    opportunity.sections.forEach((section: any) => {
      opportunityContent += `${section.title}: ${section.content || ''}\n\n`;
    });
  }
  
  // If no content, return empty requirements
  if (!opportunityContent.trim()) {
    return [];
  }
  const existingRequirements = opportunity.requirements || [];
  try {
    const parsed = await identifyRequirements(opportunityContent, existingRequirements) as z.infer<typeof RequirementsIdentificationSchema>;
    // Convert to our internal format
    return parsed.requirements.map((req: z.infer<typeof RequirementsIdentificationSchema>['requirements'][number], index: number) => ({
      id: `ai_req_${Date.now()}_${index}`,
      title: req.title,
      description: req.description,
      priority: req.priority,
      category: req.category,
      completed: false,
      source: 'ai_extraction',
      createdAt: new Date().toISOString()
    }));

  } catch (error) {
    console.error('Error extracting requirements with AI:', error);
    
    // Fallback to simple extraction if AI fails
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requirements: any[] = [];
    
    if (opportunity.sections) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      opportunity.sections.forEach((section: any, index: number) => {
        if (section.title?.toLowerCase().includes('requirement') || 
            section.content?.toLowerCase().includes('requirement')) {
          
          const content = section.content || '';
          const lines = content.split('\n').filter((line: string) => line.trim());
          
          lines.forEach((line: string, lineIndex: number) => {
            if (line.trim().length > 10) {
              requirements.push({
                id: `fallback_req_${index}_${lineIndex}`,
                title: line.substring(0, 100),
                description: line,
                priority: 'medium',
                category: 'general',
                completed: false,
                source: 'fallback_extraction',
                createdAt: new Date().toISOString()
              });
            }
          });
        }
      });
    }
    
    return requirements;
  }
} 