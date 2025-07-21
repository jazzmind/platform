import OpenAI from 'openai';
import { MODELS } from '@/src/lib/ai/models';
import { z } from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';
import { getActiveSections } from '@/src/lib/database';

export const RequirementsIdentificationSchema = z.object({
    requirements: z.array(z.object({
        title: z.string().describe("Brief, clear title for the requirement"),
        description: z.string().describe("Detailed description of the requirement"),
        priority: z.enum(['high', 'medium', 'low']).describe("Priority level of the requirement"),
        category: z.enum(['eligibility', 'response', 'technical', 'functional', 'timeline', 'budget', 'compliance', 'other']).describe("Category or type of requirement")
    }))
});

export const RequirementCheckResponseSchema = z.object({
    requirementResults: z.array(z.object({
        id: z.string(),
        title: z.string(),
        score: z.number().min(0).max(100),
        reasoning: z.string().describe("Brief explanation of why the requirement was scored this way"),
        met: z.boolean().describe("Whether the requirement is considered met (score >= 80)")
    }))
});

export async function identifyRequirements(opportunityContent: string, existingRequirements: z.infer<typeof RequirementsIdentificationSchema>['requirements'] = []) {
    if (!process.env.OPENAI_API_KEY) {
        console.error('Warning: OPENAI_API_KEY is not set in environment variables');
        return [];
    }
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const systemPrompt = `You are an expert business analyst who excels at extracting clear, actionable requirements from opportunity descriptions. 

Analyze the provided opportunity content and identify specific requirements that would need to be addressed in a proposal. Focus on:
- Eligibility requirements (who is eligible to respond)
- Response requirements (what needs to be included in the response)
- Functional requirements (what needs to be done)
- Technical requirements (how it should work)
- Timeline requirements (when things need to happen)
- Budget/resource requirements (limits on the budget or resources)
- Compliance/regulatory requirements (what are the regulatory requirements)
- Other requirements (anything else that is not covered by the other categories)

Extract clear, specific requirements rather than vague statements. Each requirement should be actionable and measurable when possible.
`;
    let userPrompt =  `Please analyze this opportunity and extract all requirements that should be tracked in a proposal:\n\n${opportunityContent}`
    if (existingRequirements) {
        const existingRequirementsString = existingRequirements.map(req => `- ${req.title}: ${req.description}`).join('\n');
        userPrompt += `\n\nHere are the existing requirements. Do not duplicate any existing requirements:\n\n${existingRequirementsString}`
    }
    try {
        const response = await openai.responses.parse({
        model: MODELS.reasoning,
        input: [
            {
            role: "system",
            content: systemPrompt
            },
            {
            role: "user",
            content: userPrompt
            }
        ],
        text: { format: zodTextFormat(RequirementsIdentificationSchema, "requirements") }
        });

        const parsed = response.output_parsed;
        if (!parsed) {
        console.error('No response from OpenAI for requirements extraction');
        return [];
        }
        return parsed;
    } catch (error) {
        console.error('Error identifying requirements:', error);
        return [];
    }
}

// Check if the requirements are complete and valid
// Returns updated requirements with scores and reasoning
export async function checkRequirements(proposalId: string, requirements: Array<{
    id: string;
    title: string;
    description: string;
    priority?: string;
    category?: string;
    completed?: boolean;
    score?: number;
    groupId?: string;
    source?: string;
    createdAt?: string;
    lastChecked?: string;
}>) {
    if (!process.env.OPENAI_API_KEY) {
        console.error('Warning: OPENAI_API_KEY is not set in environment variables');
        return requirements;
    }

    if (!requirements || requirements.length === 0) {
        return requirements;
    }

    try {
        // Get proposal sections content
        const sections = await getActiveSections('proposal', proposalId);
        const proposalContent = sections
            .map(section => `${section.title}: ${section.content}`)
            .join('\n\n');

        if (!proposalContent.trim()) {
            console.warn('No proposal content to check against');
            return requirements;
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const systemPrompt = `You are an expert business analyst who excels at evaluating how well proposal content meets specific requirements.

For each requirement, analyze the proposal content and provide:
1. A score from 0-100 indicating how well the requirement is met
2. A brief reasoning explaining your score
3. Whether the requirement is considered met (score >= 80)

Be objective and thorough in your analysis. Consider both direct mentions and implicit coverage of requirements.`;

        const userPrompt = `Please evaluate how well this proposal content meets the following requirements:

PROPOSAL CONTENT:
${proposalContent}

REQUIREMENTS TO EVALUATE:
${requirements.map((req, index) => `${index + 1}. ID: ${req.id}
   Title: ${req.title}
   Description: ${req.description}`).join('\n\n')}

For each requirement, provide a score, reasoning, and whether it's met.`;

        const response = await openai.responses.parse({
            model: MODELS.reasoning,
            input: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            text: { format: zodTextFormat(RequirementCheckResponseSchema, "requirementResults") }
        });

        const parsed = response.output_parsed;
        if (!parsed || !parsed.requirementResults) {
            console.error('No valid response from OpenAI for requirements checking');
            return requirements;
        }

        // Merge the results back with the original requirements
        const updatedRequirements = requirements.map(req => {
            const result = parsed.requirementResults.find(r => r.id === req.id);
            if (result) {
                return {
                    ...req,
                    score: result.score,
                    completed: result.met,
                    lastChecked: new Date().toISOString(),
                    reasoning: result.reasoning
                };
            }
            return req;
        });

        return updatedRequirements;
    } catch (error) {
        console.error('Error checking requirements:', error);
        return requirements;
    }
}