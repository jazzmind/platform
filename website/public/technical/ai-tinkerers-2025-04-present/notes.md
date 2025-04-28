# Presenter Notes for Present Presentations

## Overview
- Present Presentations is my attempt to create an AI-powered presentation assistant
- It solves the problem of static presentations by adding real-time AI-generated content
- Leverages the OpenAI Realtime API (gpt-4o-mini-realtime-preview model)
- The complexity is in connecting OpenAI's audio streaming with dynamic presentation updates

## What was I thinking?
- The problem: Presentations are static, but discussions are dynamic
- Presenters often forget key points or struggle to update content on the fly
- Traditional solution: Dense, overprepared slides OR sparse slides with mental notes
- My insight: What if the slides could "listen" to what you're saying and self-update?
- "Don't talk to your slides, they're not listening" - I fixed that!

## How it works
- OpenAI's Realtime API provides WebRTC streaming audio connection
- The API was designed for conversations, not presentations
- We establish bidirectional audio stream, but mute the AI's responses (usually)
- The key innovation: Use tool calls to let the AI update the presentation visually
- Present is built as a component that embeds inside RevealJS slides

## OpenAI Realtime API
- OpenAI offers two modes: Conversation and Transcription
- Conversation mode: For interactive AI assistants where turn-taking is expected
- Transcription mode: Just converts speech to text with no AI response
- We use Conversation mode but modify the experience with muting
- For presentations, we need to process audio + generate content, not just transcribe

## WebRTC Connection Setup
- WebRTC is complex, particularly around signaling and ICE negotiation
- Connection flow:
  1. Get microphone access with getUserMedia()
  2. Create RTCPeerConnection and data channel
  3. Create and set local description (SDP offer)
  4. Send offer to OpenAI via our server proxy
  5. Get back answer SDP and set as remote description
- WebRTC was a significant challenge - even experienced devs struggle with it

## Voice Activity Detection (VAD)
- VAD settings control when AI thinks you've stopped talking and it should respond
- Semantic VAD is more modern, uses AI to understand natural conversation flow
- Server VAD is simpler, just uses audio energy thresholds
- I've tested both approaches extensively:
  - Semantic VAD with high eagerness works best for presentations
  - Server VAD needs constant tuning of thresholds and timings
- Neither is perfect - the AI still sometimes jumps in too early or too late

## Tool Definition for Slide Updates
- Tools are the key to our presentation system
- Main tool: updateSlide - Allows AI to update title, bullets, and apply animations
- Other tools: clearSlide, nextSlide, previousSlide
- The bulletAnimations parameter is critical - allows for visual engagement
- AI loves the "bounce" animation - it uses it constantly if not restricted!
- Had to limit total bullet points to prevent information overload

## Instruction Prompting
- Critical to guide the AI's behavior in this unusual use case
- Key instructions:
  1. Be silent unless explicitly addressed
  2. Focus on visual updates not verbal responses
  3. Keep bullets concise and relevant
  4. Use varied animations for visual interest
- We update these instructions when slide context changes or mute state changes
- Finding the right prompt took significant iteration

## RevealJS Integration
- RevealJS wasn't designed for dynamic content updates
- Solution: A presentation-within-presentation architecture
- Each RevealJS slide contains a React component that can be dynamically updated
- This preserves the overall presentation structure while allowing real-time updates
- We also added animations for bullet points with CSS keyframes

## WebRTC Mute Control
- OpenAI Realtime API expects conversations with back-and-forth audio
- Our hack: Mute the AI's audio response but keep the data channel open
- When muted, we send explicit instructions to focus on visual updates
- This allows the AI to still "listen" while not interrupting the presenter
- Auto-mute feature activates in fullscreen mode after a short delay

## What's next?
- Remote control capabilities - let presenters control from their phone
- Recording and playback of presentations with AI commentary
- Better handling of complex code examples
- More animation styles and customization options
- Templates for different presentation types (technical, business, educational)
- Fine-tuning the VAD settings for better responsiveness
- Research usage of the upcoming OpenAI Transcription model

## Lessons Learned
- AI coding is very helpful but has significant limitations
- Even with perfect prompts, behavior can be unpredictable
- WebRTC is complex - nobody fully understands it (even the maintainers of popular libraries)
- Finding the right balance between AI autonomy and presenter control is critical
- Real-world testing reveals unexpected issues that don't appear in controlled environments
- Mute functionality is essential for real presentations
- The OpenAI Realtime API is powerful but still evolving
