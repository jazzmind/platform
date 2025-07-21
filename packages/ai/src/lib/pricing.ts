import { OpportunityRecord } from "../types/opportunity";
import { ProposalRecord } from "../types/proposal";

// Helper function to extract proposal value - use pre-extracted value from database
export const extractProposalValue = (proposal: ProposalRecord): number => {
    return proposal.pricing?.externalCost.totalExternalCost || 0;
};
  
// Helper function to extract opportunity value - use pre-extracted value from database
export const extractOpportunityValue = (opportunity: OpportunityRecord): number => {
    // Handle simple number estimate (legacy)
    if (opportunity.estimate && typeof opportunity.estimate === 'number') {
        return opportunity.estimate || 0;
    }
    
    if (opportunity.estimate && typeof opportunity.estimate === 'object') {
        const estimate = opportunity.estimate as unknown as Record<string, unknown>;
        
        // Handle DualEstimate with pricing structure (new format)
        if (estimate.pricing && typeof estimate.pricing === 'object') {
            //console.log('estimate.pricing', estimate.pricing);
            const pricing = estimate.pricing as Record<string, unknown>;
            // Prefer estimatedRevenue from contact form, fall back to AI recommendedPrice
            if (typeof pricing.estimatedRevenue === 'number' && pricing.estimatedRevenue > 0) {
                return pricing.estimatedRevenue;
            }
            if (typeof pricing.recommendedPrice === 'number' && pricing.recommendedPrice > 0) {
                return pricing.recommendedPrice;
            }
        }
        
        // Handle legacy OpportunityEstimate with totalValue
        if (typeof estimate.totalValue === 'number' && estimate.totalValue > 0) {
            return estimate.totalValue;
        }
        
        // Handle legacy direct estimate fields (old contact form format)
        if (typeof estimate.estimatedRevenue === 'number' && estimate.estimatedRevenue > 0) {
            return estimate.estimatedRevenue;
        }
        
        // Handle any other direct value field that might exist
        if (typeof estimate.value === 'number' && estimate.value > 0) {
            return estimate.value;
        }
        
        // Handle recommendedPrice at root level (some legacy formats)
        if (typeof estimate.recommendedPrice === 'number' && estimate.recommendedPrice > 0) {
            return estimate.recommendedPrice;
        }
    }
    
    return 0;
};

// If a proposal has been created, use published totalExternalCost
// Otherwise, use the estimated value from the opportunity
export function calculatePipelineValue(proposals: ProposalRecord[], opportunities: OpportunityRecord[]) {
    let totalValue = 0;
    const seenOpportunities = new Set<string>();
    // go through each proposal; track seen opportunities; only count proposals that have not been lost
    for (const proposal of proposals) {
        if (proposal.opportunityId && proposal.status !== 'rejected') {
            if (proposal.pricing && typeof proposal.pricing === 'number') {
                console.log('proposal.pricing', proposal.pricing);
                totalValue += proposal.pricing as unknown as number;
            } else {
                totalValue += extractProposalValue(proposal);
            }
        }
        if (proposal.opportunityId) {
            seenOpportunities.add(proposal.opportunityId);
        }
    }
    // if we have not seen the opportunity, add the estimated value
    for (const opportunity of opportunities) {
        if (!seenOpportunities.has(opportunity.id)) {
            if (opportunity.estimate && typeof opportunity.estimate === 'number') {
                console.log('opportunity.estimate', opportunity.estimate);
                totalValue += opportunity.estimate as unknown as number;
            } else {
                totalValue += extractOpportunityValue(opportunity);
            }
        }
    }
    return totalValue;
}
  