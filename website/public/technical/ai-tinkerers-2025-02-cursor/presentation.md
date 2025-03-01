# Advanced Cursor Features
## The Bleeding Edge of AI Development

---
## Why I Switched to Cursor
- Will convinced me at the last meetup
- I got rate limited by Github Copilot
- Cursor lets me pay to keep going
- It has agent mode already and sonnet-3.7 day 0

---
## The Secret Nobody Talks About

### Cursor Rules are the New Frontier

- AI development's best-kept secret
- Experimental territory - active community exploration
- No definitive "right way" (yet)
- Rapid evolution of best practices

<aside class="notes">
The most exciting part is that we're all figuring this out together. Even the Cursor team is learning from the community.
</aside>

---
## Evolution of Cursor Rules

### The Old Way (Last Month 😅)
```bash
your-project/
└── .cursorrules
```

### The New Way
```bash
your-project/
└── .cursor/
    └── rules/
        ├── 000-core.mdc
        ├── 701-business.mdc
        └── 702-coaching.mdc
```

<aside class="notes">
The move to .cursor/rules reflects a more organized, scalable approach
</aside>

---
## MDC: Markdown with Superpowers

### What's MDC?
- Markdown with Code (and more!)
- Supports YAML frontmatter
- Embeds XML tags
- Includes code blocks
- Allows Mermaid diagrams

<pre><code class="language-markdown">
&#45;&#45;&#45;
description: When to use this rule
globs: **/*.{ts,tsx}
&#45;&#45;&#45;

# Rule Title

&lt;required&gt;
- Must have this
- And this
&lt;/required&gt;

```typescript
// Code examples here
```</code></pre>

---
## The Windows 95 Naming Convention

### Why Numbers Matter
```bash
000-xxx # Core standards
1xx-xxx # Tool configs
3xx-xxx # Testing standards
7xx-xxx # Presentations
8xx-xxx # Workflows
9xx-xxx # Templates
```

### Benefits
- Enforces load order
- Clear categorization
- Easy discovery
- Extensible system

Note: Yes, it feels retro, but it works brilliantly for both humans and AI

---
## Let's Dive Into Our Rules

### 000-core.mdc
The foundation of all rules

<pre><code class="language-markdown">
&#45;&#45;&#45;
description: Use ALWAYS when asked to CREATE A RULE or UPDATE A RULE or taught a lesson from the user that should be retained as a new rule for Cursor
globs: .cursor/rules/*.mdc
&#45;&#45;&#45;

# Cursor Rules Format

## Core Structure

&#45;&#45;&#45;
description: ACTION when TRIGGER to OUTCOME
globs: *.mdc
&#45;&#45;&#45;

# Rule Title

## Context
- When to apply this rule
- Prerequisites or conditions

## Requirements
- Concise, actionable items
- Each requirement must be testable

## Examples
<example>
Good concise example with explanation
</example>

<example type="invalid">
Invalid concise example with explanation
</example>


## File Organization

### Location
- Path: `.cursor/rules/`
- Extension: `.mdc`

### Naming Convention
PREFIX-name.mdc where PREFIX is:
- 0XX: Core standards
- 1XX: Tool configs
- 3XX: Testing standards
- 1XXX: Language rules
- 2XXX: Framework rules
- 7xx: Presentations
- 8XX: Workflows
- 9XX: Templates
- _name.mdc: Private rules

### Glob Pattern Examples
Common glob patterns for different rule types:
- Core standards: .cursor/rules/*.mdc
- Language rules: src/**/*.{js,ts}
- Testing standards: **/*.test.{js,ts}
- React components: src/components/**/*.tsx
- Documentation: docs/**/*.md
- Configuration files: *.config.{js,json}
- Build artifacts: dist/**/*
- Multiple extensions: src/**/*.{js,jsx,ts,tsx}
- Multiple files: dist/**/*, docs/**/*.md

## Required Fields

### Frontmatter
- description: ACTION TRIGGER OUTCOME format
- globs: `glob pattern for files and folders`

### Body
- <version>X.Y.Z</version>
- context: Usage conditions
- requirements: Actionable items
- examples: Both valid and invalid

## Formatting Guidelines

- Use Concise Markdown primarily
- XML tags limited to:
  - <example>
  - <danger>
  - <required>
  - <rules>
  - <rule>
  - <critical>
  - <version>
- Always indent content within XML or nested XML tags by 2 spaces
- Keep rules as short as possbile
- Use Mermaid syntax if it will be shorter or clearer than describing a complex rule
- Use Emojis where appropriate to convey meaning that will improve rule understanding by the AI Agent
- Keep examples as short as possible to clearly convey the positive or negative example

## AI Optimization Tips

1. Use precise, deterministic ACTION TRIGGER OUTCOME format in descriptions
2. Provide concise positive and negative example of rule application in practice
3. Optimize for AI context window efficiency
4. Remove any non-essential or redundant information
5. Use standard glob patterns without quotes (e.g., *.js, src/**/*.ts)

## AI Context Efficiency

1. Keep frontmatter description under 120 characters (or less) while maintaining clear intent for rule selection by AI AGent
2. Limit examples to essential patterns only
3. Use hierarchical structure for quick parsing
4. Remove redundant information across sections
5. Maintain high information density with minimal tokens
6. Focus on machine-actionable instructions over human explanations

<critical>
  - NEVER include verbose explanations or redundant context that increases AI token overhead
  - Keep file as short and to the point as possible BUT NEVER at the expense of sacrificing rule impact and usefulness for the AI Agent.
  - the front matter can ONLY have the fields description and globs.
</critical>

</code></pre>

---
## Core Rule Structure
The structure is designed for both human readability and AI parsing efficiency.
### Required Elements

```mdc
## Context
- When to apply
- Prerequisites

## Requirements
- Actionable items
- Testable criteria

## Examples
<example>
✅ Good: Specific, clear example
</example>

<example type="invalid">
❌ Bad: Vague, unclear example
</example>
```

<aside class="notes">
The structure is designed for both human readability and AI parsing efficiency
</aside>

---
## Technical Presentation Rules

### 700-presentation-technical.mdc

<pre><code class="language-markdown">
&#45;&#45;&#45;
description: Use when creating technical presentations
globs: technical/**/*.{md,html}
&#45;&#45;&#45;
# Technical Presentation Rules

## Context
- Applied to technical presentations and documentation
- Requires understanding of technical concepts and audience
- Used for both preparation and delivery phases

## Core Experts

### Technical Researcher
**Purpose**: Research and compile technical content

<required>
- Research technical topics using academic papers, blogs, and documentation
- Gather relevant statistics and code examples
- Identify key technical trends
- Compile technical references
</required>

<example>
✅ Good Research:
```markdown
## Cursor Rule System
- Implementation: Uses MDC format for human+AI readability
- Performance: 45% faster parsing than JSON (benchmark: 1000 rules)
- Industry Trend: 78% of teams using AI-first documentation
```
</example>

<example type="invalid">
❌ Poor Research:
```markdown
## About Cursor
- It's a good editor
- Many people use it
- Has some features
```
</example>

### Technical Fact Checker
**Purpose**: Verify accuracy of technical content

<required>
- Verify technical claims against official documentation
- Validate code examples and API specifications
- Check performance metrics and requirements
- Review technical accuracy of all content
</required>

<example>
✅ Good Verification:
```typescript
// Verified against Next.js 14.1 docs
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  return Response.json({ id });
}
```
</example>
</code></pre>
---
## Live Demo: Generating A New Rule to Create a New Presentation

### We'll Create:
1. A new rule about using reveal.js 
2. Use the rule to create presentation showing how to use MCP servers
3. Watch cursor hopefully apply the rules correctly

```bash
.cursor/rules/
└── 703-presentation-revealjs.mdc
```

<aside class="notes">
We'll see how Cursor interprets and applies our new rule in real-time
</aside>

---
## Resources & Next Steps

- [Cursor Rules Documentation](https://docs.cursor.com/context/rules-for-ai)
- [Ultimate Rules Generator](https://github.com/bmadcode/cursor-auto-rules-agile-workflow) - My current go-to ruleset
- [AI Secretary](https://github.com/razbakov/ai-secretary/blob/main/.cursorrules) - I learned a lot playing with this!


---
## Q&A

Connect with me:
- LinkedIn: https://www.linkedin.com/in/sonnenreich/ 
- Email: wes@sonnenreich.com
- Website: https://sonnenreich.com