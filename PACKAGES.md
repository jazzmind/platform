# Packages

## Auth

This is a configuration of Auth.js that supports multi-tenant configurations and RBAC authorization.

## Agent Workflows

This is a workflow builder/visualizer that lets you connect AI agents together and pass data through them.

The testing system lets you run unit tests as well as end-to-end tests.

## AI Logging

This is a system that lets you log AI calls and responses (including token usage/pricing) to a database. 

## AI Testing

This is a system that lets you run evals on AI agents.


## AI Agent

This is a system that lets you create AI agents that can be used to answer questions and perform tasks.

## KMS

This is a system that lets you store and retrieve documents.

## Meetings

This is both a Calendly/Doodle replacement and something a bit more to help with complex multi-party scheduling using AI.

## Events

This is a simple event management system that allows you to create events and manage sign-ups / attendance.

## Presentations

This is the Present Presentations system, which allows you to talk and have a presentation created dynamically based on your talk.

## Teaming

This is a sophisticated team formation tool that takes an arbitrary set of participants forms them into a set of optimized teams based on an arbitrary set of constraints.

## Expert

This system allows you to build an AI Expert using prompts and documents - it's a simple RAG tool meant to be used as a starting point for more complex AI systems.

It has a chat interface for asking questions interactively but also works via API.

## Form

This lets you create forms to collect structured data and documents from users. Given some initial context data, it can search the web and or uploaded documents to automatically populate the form.

## Feedback

This lets you define criteria/rubrics and collect evaluations on structured data and documents. It allows you to assign human and AI experts to collect feedback.

It also has an in-document commenting/endorsing/challenging system.

## Contact

This is a simple web-based contact form. It might get less simple in the future.





# Using multiple packages together

Let's say you want to create a new event and you want to use the Expert to answer questions about the event. After the event you create a summary document and want to allow attendees to provide feedback on the event via in-document comments.

You can do this by using the following packages:

- Events
- Expert
- Feedback

