export interface CodeBlock {
    language?: string;
    code: string;
  }
  
export interface ProcessedContent {
title?: string;
content: string;
bullets?: string[];
codeBlocks?: (string | CodeBlock)[];
imagePrompt?: string;
animationDirections?: {
    new?: string[];
    keep?: string[];
    remove?: string[];
};
bulletAnimations?: Map<string, string> | Record<string, string>;
}
