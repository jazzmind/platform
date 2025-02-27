# Advanced Cursor Features
## The Bleeding Edge of AI Development
### Where Your Editor Is Smarter Than You Are (Most Days)

<div class="tip">
Presented by Wes Sonnenreich | AI Tinkerers Meetup | Feb 2024
</div>

---
## The Secret Nobody Talks About

### Cursor Rules are the New Frontier

<div class="container">
<div class="column">

- AI development's best-kept secret
- Experimental territory - active community exploration
- No definitive "right way" (yet)
- Rapid evolution of best practices

</div>
<div class="column">

<div class="note">
💡 Think of rules as "AI whispering" - they let you teach your AI assistant how to understand your codebase better than you do!
</div>

</div>
</div>

<aside class="notes">
The most exciting part is that we're all figuring this out together. Even the Cursor team is learning from the community. Mention the open-source nature of the rule development.
</aside>

---
## Evolution of Cursor Rules

<div class="container">
<div class="column">

### The Old Way (Last Month 😅)
```bash
your-project/
└── .cursorrules
    # It's basically just a JSON file with extra steps
    # Like XML but with more pain and fewer features
```

</div>
<div class="column">

### The New Way
```bash
your-project/
└── .cursor/
    └── rules/
        ├── 000-core.mdc   # The foundation
        ├── 701-business.mdc  # For suits
        └── 702-coaching.mdc  # Life advice
        # Much more organized and extensible
        # Like your sock drawer... if you actually organized it
```

</div>
</div>

<div class="tip">
🚀 <span class="highlight">Fun Fact:</span> The old format was created in a weekend hackathon. The new one took slightly longer (a whole week!)
</div>

<aside class="notes">
The move to .cursor/rules reflects a more organized, scalable approach. It's a sign that the Cursor team is listening to community feedback and evolving the product rapidly.
</aside>

---
## MDC: Markdown with Superpowers

### What's MDC?

<div class="container">
<div class="column">

- **M**arkdown with **D**ope **C**apabilities
- Supports YAML frontmatter (for AI metadata)
- Embeds XML tags (for AI structure)
- Includes code blocks (for examples)
- Allows Mermaid diagrams (for visualizing concepts)

</div>
<div class="column">

```html
<!-- This is what MDC looks like in the wild -->
---
description: When to use this rule
globs: **/*.{ts,tsx}
---

# Rule Title

<required>
- Must have this (the AI reads this!)
- And this (the AI REALLY reads this!)
</required>

<!-- Code examples the AI can learn from -->
```typescript
// If you write code like this
function goodExample() {
  // The AI will copy your style
}
```
</div>
</div>

<div class="warning">
⚠️ It's 3 AM. You're debugging a production issue. The line between XML and Markdown is starting to blur. Welcome to MDC.
</div>

---
## The Windows 95 Naming Convention

<div class="container">
<div class="column">

### Why Numbers Matter
```bash
000-xxx # Core standards (The Constitution)
1xx-xxx # Tool configs (Your toolbelt)
3xx-xxx # Testing standards (Trust but verify)
7xx-xxx # Presentations (Like this one!)
8xx-xxx # Workflows (How we roll)
9xx-xxx # Templates (Copy-pasta with dignity)
```

</div>
<div class="column">

### Technical Benefits
- Enforces deterministic load order
- Clear category namespacing
- Easy discovery via glob patterns
- Extensible numbering system
- Natural priority handling

</div>
</div>

<div class="note">
🤔 <span class="highlight">Why use numbers?</span> Because "first_core_rule.mdc", "second_core_rule.mdc" got old fast, and we're not animals.
</div>

<aside class="notes">
Yes, it feels retro, but it works brilliantly for both humans and AI. The numbering system allows for easy organization and discovery of rules, while also making it clear which rules take precedence.
</aside>

---
## Let's Dive Into Our Rules

### 000-core.mdc: The Constitution of Rule-land

<div class="container">
<div class="column">

```yaml
---
description: Use ALWAYS when asked to CREATE A RULE or 
  UPDATE A RULE or taught a lesson that should be 
  retained as a new rule for Cursor
globs: .cursor/rules/*.mdc
---
```

</div>
<div class="column">

<div class="tip">
💡 This is like the "meta-rule" - it teaches Cursor how to create more rules. It's rules all the way down!
</div>

</div>
</div>

<pre><code class="language-html">&lt;!-- Even HTML comments need escaping in MDC --&gt;
# Cursor Rules Format

## Core Structure

---
description: ACTION when TRIGGER to OUTCOME
globs: *.mdc
---

# Rule Title

## Context
- When to apply this rule
- Prerequisites or conditions
<!-- Technical implementation details omitted for sanity -->
</code></pre>

---
## Core Rule Structure

<div class="container">
<div class="column">

The structure is designed for both human readability and AI parsing efficiency.

### Required Elements

```html
## Context
- When to apply
- Prerequisites

## Requirements
- Actionable items
- Testable criteria
```

</div>
<div class="column">

```html
## Examples
<example>
✅ Good: Specific, clear example
// This follows our standards
const goodCode = (arg) => arg.map(processItem);
</example>

<example type="invalid">
❌ Bad: Vague, unclear example
// This will summon demons
var bad = function(x) { 
  for(i=0;i<x.length;i++) x[i]=x[i]+1 
}
</example>
```

</div>
</div>

<div class="note">
🧠 The XML tags help the AI understand which parts are prescriptive vs. descriptive - it's like putting brain hooks in your documentation.
</div>

<aside class="notes">
The structure is designed for both human readability and AI parsing efficiency. Each section serves a specific purpose in helping the AI understand the rule and apply it correctly. The examples are particularly important for teaching the AI what good and bad implementations look like.
</aside>

---
## Technical Presentation Rules

### 700-presentation-technical.mdc

<div class="container">
<div class="column">

```yaml
---
description: Use when creating technical presentations
globs: technical/**/*.{md,html}
---
```

<div class="tip">
💡 These rules help Cursor generate presentations that don't put your audience to sleep. Revolutionary!
</div>

</div>
<div class="column">

```typescript
// Behind the scenes, Cursor implements something like:
interface PresentationGenerator {
  // Determines level of technical jargon
  audienceLevel: TechnicalExpertise;
  
  // Handles code example generation
  codeExampleStyle: CodeStyle;
  
  // Maps concepts to analogies
  analogyMap: Map<Concept, Analogy>;
  
  // Core presentation flow
  generateSlides(): Slide[];
}
```

</div>
</div>

---
## Technical Presentation Rules (cont.)

### The Core Experts System

<div class="container">
<div class="column">

#### Technical Researcher
```typescript
// This is how Cursor "thinks" about research
interface TechnicalResearcher {
  researchDepth: number; // 1-10 scale
  sourcePriority: SourceType[];
  validateClaims(claim: Claim): boolean;
  findCodeExamples(concept: Concept): Code[];
}
```

</div>
<div class="column">

#### Technical Fact Checker
```typescript
// Cursor's internal fact checking
interface FactChecker {
  verificationSources: Set<Source>;
  confidenceThreshold: number;
  
  verifyTechnicalClaim(
    claim: Claim, 
    source?: Source
  ): VerificationResult;
  
  validateCodeExample(
    code: Code,
    language: Language
  ): ValidationResult;
}
```

</div>
</div>

<div class="warning">
⚠️ Without proper fact checking, your AI might confidently explain that Python's GIL stands for "Gerbil Interaction Layer" instead of "Global Interpreter Lock"
</div>

---
## Live Demo: Using PresentationRules

<div class="container">
<div class="column">

### We'll Create:
1. A new rule presentation for MCP servers
2. Watch Cursor apply the rules correctly
3. Get it to update based on feedback

```bash
.cursor/rules/
└── 2001-ai-dev.mdc  # Our new rule!
```

</div>
<div class="column">

### What Are MCP Servers?
- Multi-Capability Protocol servers
- Extend Cursor's capabilities
- Enable powerful workflows
- Connect to external services
- Allow AI to become a true assistant

<div class="note">
🤖 "MCP" is definitely not named after the villain from Tron. Any resemblance to digital dictators is purely coincidental.
</div>

</div>
</div>

<aside class="notes">
We'll see how Cursor interprets and applies our new rule in real-time. This demonstrates the power of the rule system for creating consistent, high-quality content automatically.
</aside>

---
## Rule Generators: The Next Frontier

<div class="container">
<div class="column">

### Current Approaches
- Pattern learning from codebase
- Extracting from documentation
- Learning from code reviews
- Analyzing commit history

</div>
<div class="column">

### The Technical Implementation

```typescript
type RulePattern = {
  pattern: RegExp;
  confidence: number;
  context: string[];
  examples: {valid: string[], invalid: string[]};
};

class PatternExtractor {
  private patterns: RulePattern[] = [];
  
  extractFromCode(
    files: string[], 
    threshold: number = 0.7
  ): Rule[] {
    // Complex NLP magic happens here
    return this.patterns
      .filter(p => p.confidence > threshold)
      .map(this.convertToRule);
  }
}
```

</div>
</div>

<div class="tip">
🔮 <span class="highlight">Fun Fact:</span> The first rule generator was just an LLM prompt that said "please learn my codebase." It worked... occasionally.
</div>

<aside class="notes">
This is where the magic happens - AI teaching AI how to be better. Rule generators represent the next evolution in AI-assisted development, where the system learns from your codebase and improves its understanding over time.
</aside>

---
## Building Your Own Rule Generator

<div class="container">
<div class="column">

### Key Components
```typescript
interface RuleGenerator {
  // Analyze codebase and extract patterns
  learn(context: CodebaseContext): Promise<Rule[]>;
  
  // Ensure rules don't conflict
  validate(rules: Rule[]): ValidationResult;
  
  // Remove redundancy, improve quality
  optimize(rules: Rule[]): Rule[];
  
  // Add rules to your project
  apply(rules: Rule[]): Promise<void>;
}
```

</div>
<div class="column">

### Implementation Example

```typescript
class SimpleRuleGenerator implements RuleGenerator {
  async learn(context: CodebaseContext): Promise<Rule[]> {
    // Step 1: Analyze frequent patterns
    const patterns = await this.analyzePatterns(
      context.files,
      {minOccurrence: 3, confidence: 0.8}
    );
    
    // Step 2: Convert to rule format
    return patterns.map(p => ({
      name: `${p.category}-${p.name}`,
      description: `Use when ${p.trigger}`,
      globs: p.filePatterns,
      requirements: p.requirements,
      examples: this.generateExamples(p)
    }));
  }
  
  // Other methods omitted for brevity
  // (but they're even cooler, trust me)
}
```

</div>
</div>

<aside class="notes">
We'll explore a simple implementation in the demo. The rule generator concept can be extended to handle complex codebases and adapt to evolving coding patterns over time.
</aside>

---
## Best Practices & Patterns

<div class="container">
<div class="column">

### Rule Development
- Start with core patterns
- Test with real code
- Iterate based on feedback
- Share with community

<div class="warning">
⚠️ <span class="highlight">Warning:</span> Writing rules while sleep-deprived may result in an AI that refuses to use semicolons and insists on adding emoji to all variable names.
</div>

</div>
<div class="column">

### Rule Management
- Version control rules
- Document changes
- Monitor effectiveness
- Regular updates

```typescript
// Example of a rule monitoring system
class RuleMonitor {
  ruleUsageStats: Map<Rule, UsageStats>;
  
  recordUsage(rule: Rule, outcome: RuleOutcome): void {
    // Track which rules are actually useful
  }
  
  generateReport(): RuleEffectivenessReport {
    // Show which rules need improvement
    return {
      mostUsedRules: this.getMostUsed(5),
      leastUsedRules: this.getLeastUsed(5),
      conflictingRules: this.getConflicts(),
      suggestedUpdates: this.generateSuggestions()
    };
  }
}
```

</div>
</div>

---
## Live Demo Time!

<div class="container">
<div class="column">

1. Create a new rule for MCP integration
2. Test it with Cursor
3. Generate variations
4. Share results

<div class="note">
🙏 Please hold your applause until after the demo crashes in spectacular fashion.
</div>

</div>
<div class="column">

```typescript
// What we'll be building
interface MCPRule {
  serviceType: 'notion' | 'github' | 'slack';
  authMethod: AuthMethod;
  capabilities: string[];
  commandMapping: Record<string, Command>;
  
  // The magic that makes it all work
  interpret(userIntent: string): MCPCommand;
  execute(command: MCPCommand): Promise<Result>;
}
```

</div>
</div>

<aside class="notes">
Get ready for some live coding and experimentation! We'll create a rule for MCP integration and see how it works in practice.
</aside>

---
## Resources & Next Steps

<div class="container">
<div class="column">

- [Cursor Rules Documentation](https://cursor.sh/docs/rules)
- [Community Rule Examples](https://github.com/cursor-ai/rules-examples)
- [Rule Generator Templates](https://github.com/cursor-ai/rule-generators)
- Join the discussion: [cursor.sh/discord](https://cursor.sh/discord)

</div>
<div class="column">

<div class="tip">
📚 <span class="highlight">Pro Tip:</span> The best way to learn rules is to steal them from others! Check out the community examples and adapt them to your needs.
</div>

<div class="note">
🔮 <span class="highlight">Coming Soon:</span> Rule marketplaces, rule sharing platforms, and probably rule NFTs (because why not?)
</div>

</div>
</div>

---
## Q&A

<div class="container">
<div class="column">

### Connect with me:
- LinkedIn: [linkedin.com/in/sonnenreich](https://www.linkedin.com/in/sonnenreich/)
- Email: wes@sonnenreich.com
- Website: [sonnenreich.com](https://sonnenreich.com)

</div>
<div class="column">

<div class="warning">
⚠️ <span class="highlight">Final Thought:</span> "With great Cursor rules comes great responsibility." - Uncle Ben, if he was a software developer
</div>

</div>
</div>

<!-- The End -->