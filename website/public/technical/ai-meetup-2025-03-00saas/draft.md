# Using AI to build multi-tenant SaaS apps

I'm going to show how I've been building 00SaaS, an open source NextJS template that I'm using to accelerate the development of multi-tenant "personal" SaaS applications. I will first start by talking about the current state of Cursor, Cursor Rules and models. Then I will show the cursor rules that are the heart of the 00SaaS template. Finally I'll talk about the template itself, showing a quick demo of an app built using the template with a few prompts.

## The current state of Cursor

Cursor v 0.46 is a hot mess. If you haven't used it, it's VS Code with some very specific features for AI coding.

Benefits: access to all the latest LLMs for one price. If you exceed usage, you can pay for more and pricing is very reasonable.
Agent mode + rules is a very powerful way to code.

Drawbacks:
- Cursor Rules are not well documented.
- Cursor Agent mode has issues.
- VS Code is implementing most of the features that Cursor is adding.
- Vibe coders sad because the cake is still a lie.

## PSA: Vibe coding is BS
- Don't be fooled by the hype.
- Vibe coder: "I cloned hubspot in 1 hour!" (I'm a 1000x dev!!)
- Real coder: "I spent several hours/days understanding the problem I'm trying to solve, using AI to test ideas, iterate and build a solution that addresses the problem."

## Why I still use Cursor
- Cursor Rules are powerful when used right.
- I don't actually want AI to do everything for me. I want it to work WITH me. 
- I want to control costs.

## Cursor Rules
- first, go into VS Code settings, search for Workbench: editor associations and add the following:
  - key: *.mdc  value: default
  - this fixes a bug with rules being able to edit other rules
- Now describe your project in the chat

## 00SaaS
- 00SaaS is a template for building multi-tenant SaaS apps with NextJS.
- It is built with the following technologies:
  - NextJS
  - TailwindCSS
  - TypeScript  
- The goal is to enable a modern, secure, edge friendly base
  
## Challenges
- Edge Runtime - increasingly important
- Authentication - lots of moving pieces
- Version Control - LLMs get confused

## Lessons learned
- Get comfy with the forums
- Revert freely
- It's ok to get frustrated! 

# Thanks to:
[hao-ji-xing](https://github.com/hao-ji-xing) for your detailed explanation of Cursor Rules.
[bmadcode](https://github.com/bmadcode) for the templates
