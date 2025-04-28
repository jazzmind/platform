# Using AI to build multi-tenant SaaS apps
## Accelerating Development with NextJS Templates

---
## Overview

- The current state of Cursor
- Cursor Rules - the secret weapon
- 00SaaS template walkthrough
- Demo of an app built with a few prompts
- Challenges and lessons learned

<aside class="notes">
I'll show how I've been building 00SaaS, an open source NextJS template that accelerates development of multi-tenant "personal" SaaS applications.
</aside>

---
## The Current State of Cursor

### Cursor v0.46: A Mixed Bag

<div class="r-stack">
  <div class="r-hstack">
    <div style="width: 45%;">
      <h3>Benefits</h3>
      <ul>
        <li>Access to all latest LLMs for one price</li>
        <li>Pay-as-you-go for additional usage</li>
        <li>Agent mode + rules is powerful</li>
      </ul>
    </div>
    <div style="width: 45%;">
      <h3>Drawbacks</h3>
      <ul>
        <li>Cursor Rules are poorly documented</li>
        <li>Agent mode has issues</li>
        <li>VS Code implementing similar features</li>
        <li>Vibe coders disappointed</li>
      </ul>
    </div>
  </div>
</div>

<aside class="notes">
If you haven't used Cursor, think of it as VS Code with specific AI coding features. The pricing is reasonable, but there are some significant challenges with the current version.
</aside>

---
## PSA: Vibe Coding is BS

<div class="demo">
  <p>Vibe coder: <span class="highlight">"I cloned hubspot in 1 hour!"</span> (I'm a 1000x dev!!)</p>
  <p>vs.</p>
  <p>Real coder: <span class="highlight">"I spent several hours/days understanding the problem I'm trying to solve, using AI to test ideas, iterate and build a solution that addresses the problem."</span></p>
</div>

### Don't be fooled by the hype

<aside class="notes">
The reality of coding with AI is much more nuanced than what the hype suggests. It's about understanding problems and using AI as a tool, not expecting magic.
</aside>

---
## Why I Still Use Cursor

- Cursor Rules are powerful when used right
- I don't want AI to do everything for me
  - I want it to work WITH me
- Better cost control

<aside class="notes">
Despite its issues, Cursor still offers unique advantages, especially if you approach it with the right mindset.
</aside>

---
## Cursor Rules Setup

```bash
# First fix a common bug with rules editing:
# In VS Code settings, search for "Workbench: editor associations" and add:
# key: *.mdc  value: default
```

### The Secret Weapon

- Rules let you codify your patterns and preferences
- They guide the AI to follow your standards
- Dramatically improves consistency

<aside class="notes">
This simple setup step prevents issues when editing rules. The real power comes from creating rules that guide your AI assistant.
</aside>

---
## 00SaaS Core Rules

### 000-core.mdc
<pre><code class="language-markdown">
&#45;&#45;&#45;
description: Use ALWAYS when asked to CREATE A RULE or UPDATE A RULE
globs: .cursor/rules/*.mdc
&#45;&#45;&#45;

# Cursor Rules Format

## Core Structure
- ACTION when TRIGGER to OUTCOME description
- Glob patterns for targeted files
- Clear requirements and examples

## Required Fields
- Frontmatter (description, globs)
- Context (when to apply)
- Requirements (actionable items)
- Examples (valid and invalid)
</code></pre>

<aside class="notes">
This is the foundation for all rules. It establishes the format, structure, and requirements for creating effective rules.
</aside>

---
## Architect Rules

### 001-architect.mdc
<pre><code class="language-markdown">
&#45;&#45;&#45;
description: Use when designing system architecture for multi-tenant SaaS
globs: **/{architecture,design}/*.{md,mdx,mdc}
&#45;&#45;&#45;

# System Architecture Guidelines

## Context
- Applied when designing multi-tenant systems
- Ensures scalable, secure tenant isolation

## Requirements
- Database-per-tenant OR schema-per-tenant approach
- Edge-compatible authentication flow
- Serverless-first design principles
- Cache-aware data access patterns
</code></pre>

<aside class="notes">
The architect rule establishes how our system should be designed. It guides the AI to follow best practices for multi-tenant architectures.
</aside>

---
## Project Structure Rules

### 002-project.mdc
<pre><code class="language-markdown">
&#45;&#45;&#45;
description: Use when organizing NextJS project files and directories
globs: **/*.{ts,tsx,js,jsx}
&#45;&#45;&#45;

# NextJS Project Structure

## Context
- Applied when creating or refactoring project structure
- Ensures maintainable organization of code

## Requirements
- Domain-driven folder structure
- Feature-first component organization
- Separation of UI and business logic
- Proper API route organization

## Examples
<example>
✅ Good:
app/
  (auth)/
  (dashboard)/
  api/
    [tenant]/
      route.ts
  components/
    ui/
    forms/
</example>
</code></pre>

<aside class="notes">
The project rule defines how our codebase should be organized. It helps maintain consistency across the project.
</aside>

---
## Database Rules

### 003-database.mdc
<pre><code class="language-markdown">
&#45;&#45;&#45;
description: Use when designing database schemas and queries for multi-tenant apps
globs: **/{prisma,db,database}/**/*.{ts,js,prisma,sql}
&#45;&#45;&#45;

# Multi-tenant Database Design

## Context
- Applied when modeling data or writing queries
- Ensures proper tenant isolation and security

## Requirements
- Every table must have a tenant_id column
- All queries must filter by tenant_id
- No cross-tenant data access in standard queries
- Row-level security when using PostgreSQL

## Examples
<example>
✅ Good query:
```typescript
const data = await prisma.resource.findMany({
  where: {
    tenant_id: ctx.tenant.id,
    // other filters...
  }
});
```
</example>
</code></pre>

<aside class="notes">
The database rule is critical for security and tenant isolation. It ensures that data is properly segregated between tenants.
</aside>

---
## 00SaaS Template

### A Foundation for Multi-tenant SaaS Apps

- Built with modern technologies:
  - NextJS
  - TailwindCSS
  - TypeScript

### Goals
- Modern, secure architecture
- Edge friendly deployment
- Rapid development cycle

<aside class="notes">
00SaaS provides the foundation to quickly build applications that can support multiple tenants with isolated data.
</aside>

---
## Key Challenges

### Edge Runtime
- Increasingly important for performance
- Limited runtime APIs
- Requires different architecture choices

### Authentication
- Many moving pieces
- Security requirements
- Multi-tenancy complexity

### Version Control
- LLMs get confused by complex repos
- Need strategies to keep AI focused

<aside class="notes">
These challenges need to be addressed carefully when building multi-tenant SaaS applications.
</aside>

---
## Lessons Learned

- Get comfortable with the forums
  - Issues are common, solutions exist
- Revert freely
  - Don't be afraid to start over
- It's okay to get frustrated!
  - AI tools are still evolving

<aside class="notes">
The journey with AI tools isn't always smooth, but having the right mindset makes a big difference.
</aside>

---
## Cursor Rules Ecosystem

<div class="r-stack">
  <div class="r-hstack">
    <div style="width: 45%;">
      <h3>Rule Interaction Flow</h3>
      <pre><code class="language-mermaid">
graph TD
    A[000-core.mdc] --> B[001-architect.mdc]
    A --> C[002-project.mdc]
    A --> D[003-database.mdc]
    B --> E[004-auth.mdc]
    B --> F[005-api.mdc]
    C --> G[006-components.mdc]
    D --> H[007-testing.mdc]
      </code></pre>
    </div>
    <div style="width: 45%;">
      <h3>Getting All Rules</h3>
      <ul>
        <li>GitHub: <a href="https://github.com/00saas/cursor-rules">00saas/cursor-rules</a></li>
        <li>Core Rules (Shown Today):</li>
        <ul>
          <li>000-core.mdc</li>
          <li>001-architect.mdc</li>
          <li>002-project.mdc</li>
          <li>003-database.mdc</li>
        </ul>
        <li>Additional domain-specific rules available</li>
      </ul>
    </div>
  </div>
</div>

<aside class="notes">
Share this link with attendees so they can access all the rules we've discussed today. The diagram shows how the rules build on each other to create a complete system.
</aside>

---
## Thanks To

- [hao-ji-xing](https://github.com/hao-ji-xing) for detailed Cursor Rules explanations
- [bmadcode](https://github.com/bmadcode) for templates

### Questions?

<aside class="notes">
Special thanks to the community contributors who have made this work possible.
</aside> 