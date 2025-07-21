import { MODELS } from '@/src/lib/ai/models';
import { z } from 'zod';
import { Contact, PastRole } from '@/src/types/contact';
import { OpportunityEstimate, DualEstimate } from '@/src/types/opportunity';
import { AIService } from './aiService';

// Define interfaces locally since they may not exist in interfaces.ts yet
interface RateEstimate {
  internalRate: number;
  externalRate: number;
  reasoning: string;
}

interface PricingAnalysis {
  competitorAnalysis: {
    marketLow: number;
    marketHigh: number;
    suggestedPrice: number;
    confidenceLevel: number;
    reasoning: string;
  };
  recommendations: string[];
}

const rateResponseFormat = z.object({
    internalRate: z.number(),
    externalRate: z.number(),
    reasoning: z.string()
});

export interface OpportunityContext {
    title: string;
    sections: Array<{ title: string; content: string }>;
    teamSize: number;
    teamHourlyCost: number;
    teamMonthlyCost: number;
}

const opportunityResponseFormat = z.object({
    totalValue: z.number(),
    confidence: z.number(),
    timeframe: z.string(),
    breakdown: z.object({
        scopeBased: z.number(),
        budgetMentioned: z.number(),
        marketComparison: z.number(),
        teamCost: z.number()
    }),
    reasoning: z.string(),
    recommendations: z.array(z.string())
});

// New dual-estimate response format
const dualEstimateResponseFormat = z.object({
    deliveryCost: z.object({
        totalCost: z.number(),
        confidence: z.number(),
        timeEstimate: z.string(),
        breakdown: z.object({
            teamCost: z.number(),
            scopeComplexity: z.number(),
            riskBuffer: z.number(),
            overhead: z.number()
        }),
        reasoning: z.string()
    }),
    pricing: z.object({
        recommendedPrice: z.number(),
        confidence: z.number(),
        basis: z.enum(['fixed_budget', 'competitive', 'value_based']),
        breakdown: z.object({
            baseCost: z.number(),
            margin: z.number(),
            marketPremium: z.number(),
            valueMultiplier: z.number()
        }),
        reasoning: z.string(),
        // Optional contact form fields that can be extracted from documents
        pricingBasis: z.enum(['capped_budget', 'value_priced', 'quality_priced', 'speed_priced']).optional(),
        procurementType: z.enum(['sole_sourced', 'invitation_bid', 'open_bid_rfp']).optional()
    }),
    riskReward: z.object({
        score: z.number(),
        analysis: z.string(),
        recommendations: z.array(z.string())
    })
});

// New pricing analysis response format
const pricingAnalysisResponseFormat = z.object({
    competitorAnalysis: z.object({
        marketLow: z.number(),
        marketHigh: z.number(),
        suggestedPrice: z.number(),
        confidenceLevel: z.number(),
        reasoning: z.string()
    }),
    recommendations: z.array(z.string())
});

// New interface for enhanced opportunity context
export interface EnhancedOpportunityContext {
    opportunity: {
        title: string;
        status: string;
        sections: Array<{ title: string; content: string }>;
        tasks: Array<{ id: string; title: string; completed: boolean }>;
    };
    team: {
        size: number;
        members: Array<{
            name: string;
            title: string;
            background: string | null;
            rateInternal: number | null;
            skills: string[] | null;
        }>;
    };
}

// New interface for pricing analysis context
export interface PricingContext {
    title: string;
    sections: Array<{ title: string; content?: string }>;
    teamSize: number;
    internalCost: {
        teamCost: number;
        materialCost: number;
        overheadCost: number;
        totalInternalCost: number;
    };
    externalCost: {
        basePrice: number;
        margin: number;
        contingency: number;
        totalExternalCost: number;
    };
    projectDuration: number;
    hoursPerMonth: number;
}

/**
 * Enhanced PricingService extending AIService base class
 * Provides pricing analysis and rate estimation capabilities
 */
class PricingService extends AIService {
  constructor() {
    super({
      maxRetries: 3,
      timeoutMs: 45000, // 45 seconds for pricing analysis
      enableLogging: true,
      enableDebugLogging: true,
      logPrefix: 'Pricing',
    });
  }

  /**
   * Estimate hourly rates for a contact
   */
  async estimateRates(contact: Contact): Promise<RateEstimate> {
    this.log(`Starting rate estimation for ${contact.name}`);

    const prompt = `You are an expert in pricing professional services and understanding market rates for different roles and experience levels.

Based on the following professional profile, estimate appropriate hourly rates:

Name: ${contact.name || 'Not provided'}
Title: ${contact.title || 'Not provided'}
Organization: ${contact.organization || 'Not provided'}
Background: ${contact.background || 'Not provided'}
Skills: ${contact.skills?.join(', ') || 'Not provided'}
Education: ${contact.credentials?.degrees?.join(', ') || 'Not provided'}
Certifications: ${contact.credentials?.certifications?.join(', ') || 'Not provided'}
Past Roles: ${contact.credentials?.pastRoles?.map((role: PastRole) => `${role.role} at ${role.company} (${role.startDate} - ${role.endDate})`).join('; ') || 'Not provided'}

Please provide:
1. Internal Rate: The hourly rate this person should be charged internally within their organization (cost rate)
2. External Rate: The hourly rate this person's services should be billed to external clients (billing rate)

Consider factors like:
- Experience level and seniority
- Technical skills and expertise
- Industry and market rates
- Geographic location (assume US market)
- Role complexity and responsibility

The rates should be realistic US market rates in dollars per hour.`;

    try {
      const result = await this.callAI(
        MODELS.reasoning,
        [
          {
            role: 'system',
            content: 'You are an expert consultant specializing in professional services pricing and market rate analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        rateResponseFormat,
        `estimateRates(${contact.name})`,
        'rateEstimate'
      );

      // Validate the response structure
      if (typeof result.internalRate !== 'number' || typeof result.externalRate !== 'number') {
        throw new Error('Invalid rate format from AI');
      }

      return {
        internalRate: Math.round(result.internalRate),
        externalRate: Math.round(result.externalRate),
        reasoning: result.reasoning || 'Rate estimated based on profile analysis'
      };

    } catch (error) {
      this.log(`Rate estimation failed, using fallback: ${error}`, 'warn');
      
      // Fallback estimation based on basic heuristics
      let baseRate = 50; // Default base rate
      
      // Adjust based on title/seniority
      if (contact.title) {
        const title = contact.title.toLowerCase();
        if (title.includes('senior') || title.includes('lead') || title.includes('architect')) {
          baseRate = 120;
        } else if (title.includes('manager') || title.includes('director')) {
          baseRate = 150;
        } else if (title.includes('principal') || title.includes('vp') || title.includes('executive')) {
          baseRate = 200;
        } else if (title.includes('developer') || title.includes('engineer')) {
          baseRate = 80;
        } else if (title.includes('consultant')) {
          baseRate = 100;
        }
      }

      return {
        internalRate: Math.round(baseRate * 0.6), // Internal rate is typically 60% of external
        externalRate: baseRate,
        reasoning: 'Fallback estimation based on title and industry standards'
      };
    }
  }

  /**
   * Estimate opportunity value
   */
  async estimateOpportunityValue(opportunityContext: OpportunityContext): Promise<OpportunityEstimate> {
    this.log('Starting opportunity value estimation');

    const result = await this.callAI(
      MODELS.reasoning,
      [
        {
          role: 'system',
          content: `You are an expert business analyst specializing in project valuation and cost estimation. 
                   Analyze opportunities to provide realistic value estimates based on scope, complexity, market rates, and team costs.
                   Always respond with valid JSON matching the required format.`
        },
        {
          role: 'user',
          content: `Analyze this business opportunity and provide a comprehensive value estimate:

Opportunity Details:
${opportunityContext.sections.map((section, index: number) => 
  `${index + 1}. ${section.title}: ${section.content}`
).join('\n')}

Team Information:
- Team Size: ${opportunityContext.teamSize} members
- Combined Hourly Rate: $${opportunityContext.teamHourlyCost}/hour
- Monthly Team Cost: $${opportunityContext.teamMonthlyCost}

Please provide a detailed analysis and estimate in JSON format with:
- totalValue: Overall project value estimate
- confidence: Confidence level (0-100)
- timeframe: Expected project duration
- breakdown: { scopeBased, budgetMentioned, marketComparison, teamCost }
- reasoning: Detailed explanation of the estimate
- recommendations: Array of actionable recommendations

Consider factors like:
- Project scope and complexity
- Any budget mentions in the content
- Market rates for similar work
- Team expertise requirements
- Risk factors and uncertainties`
        }
      ],
      opportunityResponseFormat,
      'estimateOpportunityValue',
      'opportunityEstimate'
    );

    return this.validateEstimate(result, opportunityContext);
  }

  /**
   * Estimate delivery cost and pricing
   */
  async estimateDeliveryCostAndPricing(context: EnhancedOpportunityContext): Promise<DualEstimate> {
    this.log('Starting dual estimate for delivery cost and pricing');

    const prompt = `Analyze this business opportunity and provide comprehensive delivery cost and pricing estimates:

Opportunity Details:
${context.opportunity.sections.map((section, index: number) => 
    `${index + 1}. ${section.title}: ${section.content}`
).join('\n')}

Team Information:
${context.team.members.map(member => 
    `- ${member.name} (${member.title}): $${member.rateInternal || 75}/hr
  Background: ${member.background || 'No background provided'}
  Skills: ${member.skills?.join(', ') || 'None listed'}`
).join('\n')}

Provide separate estimates for:
1. Internal delivery cost (what it costs us to deliver)
2. Client pricing (what we should charge)
3. Risk/reward analysis comparing the two

Consider factors like:
- Any fixed budget constraints mentioned in the content
- Project scope and complexity from sections
- Individual team member expertise, rates and anticipated hours
- Market rates for similar work
- Risk factors and value delivered
- Competitive positioning

If the document mentions pricing approach, try to determine:
- Pricing Basis: capped_budget (fixed/limited budget), value_priced (ROI-focused), quality_priced (premium quality), speed_priced (fast delivery)
- Procurement Type: sole_sourced (direct award), invitation_bid (invitation only), open_bid_rfp (competitive bidding)

Include these in the pricing object if identifiable from the content.`;

    try {
      const result = await this.callAI(
        MODELS.reasoning,
        [
          {
            role: 'system',
            content: `You are a professional project estimator. Analyze opportunity data and provide two distinct estimates:
            
            1. DELIVERY COST: Internal cost to deliver based on scope, team rates, and complexity
            2. PRICING: Recommended client pricing considering budget mentions, market rates, and value
            
            Always respond with valid JSON matching the required format.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        dualEstimateResponseFormat,
        'estimateDeliveryCostAndPricing',
        'dualEstimate'
      );

      return this.validateDualEstimate(result);
    } catch (error) {
      this.log(`Dual estimation failed, using fallback: ${error}`, 'warn');
      return this.generateDualFallbackEstimate(context);
    }
  }

  /**
   * Analyze pricing competition
   */
  async analyzePricingCompetition(context: PricingContext): Promise<PricingAnalysis> {
    this.log('Starting competitive pricing analysis');

    const prompt = `Analyze this business proposal and provide comprehensive pricing analysis:

Proposal Details:
- Title: ${context.title}

Content Sections:
${context.sections.map((section, index: number) => 
  `${index + 1}. ${section.title}: ${section.content?.substring(0, 500) || 'No content'}`
).join('\n')}

Team & Cost Information:
- Team Size: ${context.teamSize} members
- Project Duration: ${context.projectDuration} months
- Hours per Month: ${context.hoursPerMonth}
- Internal Cost: $${context.internalCost.totalInternalCost}
- Our Calculated Price: $${context.externalCost.totalExternalCost}

Please provide a detailed competitive pricing analysis. Consider factors like:
- Market rates for similar professional services
- Project complexity and scope
- Team expertise level and market positioning
- Competitive landscape and pricing pressure
- Value proposition and differentiation
- Regional market factors

The marketLow and marketHigh should represent realistic competitor price ranges.
The suggestedPrice should be your recommended optimal price.
The confidenceLevel should be 1-100 based on analysis strength.
The reasoning should explain the pricing rationale and market positioning.`;

    try {
      const result = await this.callAI(
        MODELS.reasoning,
        [
          {
            role: 'system',
            content: `You are an expert pricing strategist specializing in competitive analysis and market positioning for professional services. 
                     Analyze proposals to provide realistic market pricing benchmarks and strategic pricing recommendations.
                     Always respond with valid JSON matching the required format.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        pricingAnalysisResponseFormat,
        'analyzePricingCompetition',
        'pricingAnalysis'
      );

      return this.validatePricingAnalysis(result, context);
    } catch (error) {
      this.log(`Pricing analysis failed, using fallback: ${error}`, 'warn');
      return this.generateFallbackPricingAnalysis(context);
    }
  }

  // Helper methods
  private validateEstimate(estimate: z.infer<typeof opportunityResponseFormat>, context: OpportunityContext): OpportunityEstimate {
    return {
      totalValue: Math.max(0, estimate.totalValue || 0),
      confidence: Math.min(100, Math.max(0, estimate.confidence || 50)),
      timeframe: estimate.timeframe || '2-4 months',
      breakdown: {
        scopeBased: Math.max(0, estimate.breakdown?.scopeBased || 0),
        budgetMentioned: Math.max(0, estimate.breakdown?.budgetMentioned || 0),
        marketComparison: Math.max(0, estimate.breakdown?.marketComparison || 0),
        teamCost: Math.max(0, estimate.breakdown?.teamCost || context.teamMonthlyCost)
      },
      reasoning: estimate.reasoning || 'AI analysis completed with standard parameters.',
      recommendations: Array.isArray(estimate.recommendations) ? estimate.recommendations : []
    };
  }

  private validateDualEstimate(estimate: z.infer<typeof dualEstimateResponseFormat>): DualEstimate {
    // Calculate risk/reward score based on margin
    const margin = estimate.pricing.recommendedPrice - estimate.deliveryCost.totalCost;
    const marginPercent = (margin / estimate.pricing.recommendedPrice) * 100;
    
    // Score: -100 (high risk/low margin) to 100 (high reward/high margin)
    let riskScore = estimate.riskReward.score;
    if (marginPercent < 10) riskScore = Math.min(riskScore, -50);
    else if (marginPercent > 50) riskScore = Math.max(riskScore, 50);

    return {
      deliveryCost: {
        totalCost: Math.max(0, estimate.deliveryCost.totalCost),
        confidence: Math.min(100, Math.max(0, estimate.deliveryCost.confidence)),
        timeEstimate: estimate.deliveryCost.timeEstimate || '2-4 months',
        breakdown: {
          teamCost: Math.max(0, estimate.deliveryCost.breakdown.teamCost),
          scopeComplexity: Math.max(0, estimate.deliveryCost.breakdown.scopeComplexity),
          riskBuffer: Math.max(0, estimate.deliveryCost.breakdown.riskBuffer),
          overhead: Math.max(0, estimate.deliveryCost.breakdown.overhead)
        },
        reasoning: estimate.deliveryCost.reasoning || 'AI analysis completed with standard parameters.'
      },
      pricing: {
        recommendedPrice: Math.max(0, estimate.pricing.recommendedPrice),
        confidence: Math.min(100, Math.max(0, estimate.pricing.confidence)),
        basis: estimate.pricing.basis,
        breakdown: {
          baseCost: Math.max(0, estimate.pricing.breakdown.baseCost),
          margin: Math.max(0, estimate.pricing.breakdown.margin),
          marketPremium: Math.max(0, estimate.pricing.breakdown.marketPremium),
          valueMultiplier: Math.max(0, estimate.pricing.breakdown.valueMultiplier)
        },
        reasoning: estimate.pricing.reasoning || 'Pricing analysis completed with standard parameters.',
        // Preserve extracted pricing fields if provided
        pricingBasis: estimate.pricing.pricingBasis || undefined,
        procurementType: estimate.pricing.procurementType || undefined
      },
      riskReward: {
        score: Math.min(100, Math.max(-100, riskScore)),
        analysis: estimate.riskReward.analysis || 'Standard risk/reward analysis completed.',
        recommendations: Array.isArray(estimate.riskReward.recommendations) 
          ? estimate.riskReward.recommendations 
          : ['Review project scope and requirements', 'Consider market positioning']
      }
    };
  }

  private generateDualFallbackEstimate(context: EnhancedOpportunityContext): DualEstimate {
    const totalInternalRate = context.team.members.reduce((total, member) => total + (member.rateInternal || 0), 0);
    const deliveryCostTotal = totalInternalRate * 160 * 3;

    return {
      deliveryCost: {
        totalCost: deliveryCostTotal,
        confidence: 50,
        timeEstimate: '2-4 months',
        breakdown: {
          teamCost: Math.round(deliveryCostTotal * 0.6),
          scopeComplexity: Math.round(deliveryCostTotal * 0.2),
          riskBuffer: Math.round(deliveryCostTotal * 0.15),
          overhead: Math.round(deliveryCostTotal * 0.05)
        },
        reasoning: 'Fallback estimation based on team rates and standard project assumptions.'
      },
      pricing: {
        recommendedPrice: Math.round(deliveryCostTotal * 1.5), // 50% margin
        confidence: 40,
        basis: 'competitive' as const,
        breakdown: {
          baseCost: deliveryCostTotal,
          margin: Math.round(deliveryCostTotal * 0.5),
          marketPremium: 0,
          valueMultiplier: 1.0
        },
        reasoning: 'Conservative pricing with standard margin. Consider market research for optimization.'
      },
      riskReward: {
        score: 25,
        analysis: 'Moderate opportunity with standard risk profile.',
        recommendations: [
          'Validate scope clarity with client',
          'Consider phased delivery approach',
          'Regular progress check-ins recommended'
        ]
      }
    };
  }

  private validatePricingAnalysis(analysis: z.infer<typeof pricingAnalysisResponseFormat>, context: PricingContext): PricingAnalysis {
    const comp = analysis.competitorAnalysis;
    const basePrice = context.externalCost.totalExternalCost;
    
    return {
      competitorAnalysis: {
        marketLow: Math.max(0, comp.marketLow || Math.round(basePrice * 0.7)),
        marketHigh: Math.max(0, comp.marketHigh || Math.round(basePrice * 1.5)),
        suggestedPrice: Math.max(0, comp.suggestedPrice || basePrice),
        confidenceLevel: Math.min(100, Math.max(0, comp.confidenceLevel || 60)),
        reasoning: comp.reasoning || 'AI analysis completed with standard market benchmarks.'
      },
      recommendations: Array.isArray(analysis.recommendations) 
        ? analysis.recommendations 
        : [
            'Review market positioning and competitive landscape',
            'Consider value-based pricing strategies',
            'Validate pricing with customer feedback'
          ]
    };
  }

  private generateFallbackPricingAnalysis(context: PricingContext): PricingAnalysis {
    // Heuristic pricing analysis based on project characteristics
    const basePrice = context.externalCost.totalExternalCost;
    const complexityFactor = context.sections.length > 6 ? 1.2 : 1.0;
    const teamSizeFactor = context.teamSize > 3 ? 1.1 : 1.0;
    
    const marketLow = Math.round(basePrice * 0.7 * complexityFactor);
    const marketHigh = Math.round(basePrice * 1.4 * complexityFactor * teamSizeFactor);
    const suggestedPrice = Math.round(basePrice * 1.1 * complexityFactor);
    
    return {
      competitorAnalysis: {
        marketLow,
        marketHigh,
        suggestedPrice,
        confidenceLevel: 65,
        reasoning: 'This is a heuristic estimate based on project scope and team size. A more detailed analysis would require additional market research and competitive intelligence.'
      },
      recommendations: [
        'Consider conducting market research to validate pricing assumptions',
        'Emphasize unique value propositions to justify premium pricing',
        'Monitor competitor pricing and adjust positioning accordingly',
        'Consider offering tiered pricing options for different service levels'
      ]
    };
  }
}

// Create singleton instance
const pricingService = new PricingService();

// Export legacy functions for backward compatibility
export async function estimateRates(contact: Contact): Promise<RateEstimate> {
  return pricingService.estimateRates(contact);
}

export async function estimateOpportunityValue(opportunityContext: OpportunityContext): Promise<OpportunityEstimate> {
  return pricingService.estimateOpportunityValue(opportunityContext);
}

export async function estimateDeliveryCostAndPricing(context: EnhancedOpportunityContext): Promise<DualEstimate> {
  return pricingService.estimateDeliveryCostAndPricing(context);
}

export async function analyzePricingCompetition(context: PricingContext): Promise<PricingAnalysis> {
  return pricingService.analyzePricingCompetition(context);
}

// Export the service instance for new standardized usage
export { pricingService };
export default pricingService; 