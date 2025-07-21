export const TEMPLATES = [
  // Document styles
  { id: 'modern', name: 'Modern Clean', type: 'document' },
  { id: 'classic', name: 'Classic Professional', type: 'document' },
  { id: 'minimal', name: 'Minimal', type: 'document' },
  { id: 'elegant', name: 'Elegant Dark', type: 'document' },
  { id: 'corporate', name: 'Corporate Blue', type: 'document' },
  // Presentation styles
  { id: 'slides-modern', name: 'Modern Slides', type: 'presentation' },
  { id: 'slides-pitch', name: 'Pitch Deck', type: 'presentation' },
  { id: 'slides-minimal', name: 'Minimal Slides', type: 'presentation' }
] as const;

export type TemplateId = typeof TEMPLATES[number]['id'];
export type TemplateType = 'document' | 'presentation';

// Pricing Basis Options
export const PRICING_BASIS_OPTIONS = [
  { value: 'capped_budget', label: 'Capped Budget' },
  { value: 'value_priced', label: 'Value Priced' },
  { value: 'quality_priced', label: 'Quality Priced' },
  { value: 'speed_priced', label: 'Speed Priced' }
] as const;

// Procurement Type Options  
export const PROCUREMENT_TYPE_OPTIONS = [
  { value: 'sole_sourced', label: 'Sole Sourced' },
  { value: 'invitation_bid', label: 'Invitation Bid' },
  { value: 'open_bid_rfp', label: 'Open Bid/RFP' }
] as const;

// Type helpers
export type PricingBasisValue = typeof PRICING_BASIS_OPTIONS[number]['value'];
export type ProcurementTypeValue = typeof PROCUREMENT_TYPE_OPTIONS[number]['value']; 