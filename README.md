# High Point Platform

This is the monorepo for High Point, a solo-entrepreneur platform for running an AI native advisory business.

The platform is a series of NextJS packages that can be run standalone or integrated into a larger system. They are all used together as part of the High Point website, which serves as a demo for all the functionality.

## Why High Point?

High Point is named in memory of Camp High Point, a camp in the Adirondacks that my family used to run.

The name "High Point" also refers to the idea of a high point in a complex system - a point that is a good starting point for a business.

## Vibeware

This platform is being provide as "vibeware" - which is a modern version of "shareware" but for software built using AI. 

If you're like me, your github is littered with 50-80% complete projects that were vibecoded. Rather than consign these to the digital dump heap, we can share them, learn from them and possibly even get them to a place where they are useful.

Vibeware donations go to a specific package in the platform. The amount donated and by whom is tracked and displayed on the package's github page. This gives me an indication of how much the community cares about the package and helps to prioritize development.

There is no guarantee of any kind that a donation will result in any kind of feature being added. It's just a way to say "thank you" for the platform and to help support future development.

That said, I'm always happy to chat about what you'd like to see!

However, I think we're getting close to the point where a feature request can be implemented as a PR automatically by an AI agent. Once I have that capability in the system I'll set up a donation system where it estimates the cost of the feature (AI calls and human review) and then quotes the donation amount needed. 


# Packages

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


## Running the platform

