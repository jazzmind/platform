# Present Presentations
## The AI-Powered Real-Time Dynamic Presentation Tool

Wes Sonnenreich

https://sonnenreich.com

https://linkedin.com/in/sonnenreich

---
## Overview

- Introduction to Present
- OpenAI Realtime API: Conversation vs Transcription
- Architecture and Implementation
- Tool Design and Prompt Engineering
- Challenges and Solutions
- Demo and Lessons Learned

<aside class="notes">
This presentation will cover how I built Present Presentations, an AI-powered presentation assistant that updates slides in real-time as you speak. I'll explain the technical implementation, design decisions, and challenges faced.
</aside>

---
## What was I thinking?

- Traditional presentations are static
- Presenters often forget important points
- AI could help augment presentations in real-time
- Create a more dynamic, responsive presentation experience
- Challenge: How to make AI a silent partner in presentations?

<aside class="notes">
"Don't talk to your slides, they're not listening." I took that advice and solved the main problem - that the slides aren't listening!</aside>

---
## How it works

<div class="r-stack">
  <div class="r-hstack">
    <div style="width: 45%;">
      <h3>OpenAI Realtime API</h3>
      <ul>
        <li>WebRTC-based audio streaming</li>
        <li>Bidirectional communication</li>
        <li>Tool calling for UI updates</li>
        <li>Custom VAD settings</li>
      </ul>
    </div>
    <div style="width: 45%;">
      <h3>Present Architecture</h3>
      <ul>
        <li>RevealJS for presentation</li>
        <li>NextJS/React components</li>
        <li>Presentation-within-presentation model</li>
        <li>Audio muting and fullscreen control</li>
      </ul>
    </div>
  </div>
</div>

<aside class="notes">
The system uses OpenAI's Realtime API to stream audio to GPT-4o-realtime. The AI processes this audio, extracts key points, and uses tools to update the presentation in real-time. We're using RevealJS inside a React component to create a dynamic presentation experience.
</aside>

---
## OpenAI Realtime API

### Conversation vs. Transcription Mode

```typescript
// Conversation mode configuration
client.updateSession({
  instructions,
  voice: 'coral',
  temperature: 0.8,
  input_audio_noise_reduction: {
    type: 'far_field',
  }
});

// Voice Activity Detection (VAD) settings
const vadSettings = {
  type: 'semantic_vad',  // 'semantic_vad' or 'server_vad'
  eagerness: 'high',     // 'low', 'medium', 'high', or 'auto'
  interrupt_response: false
};
```

<aside class="notes">
OpenAI's Realtime API offers two modes: Conversation (what we're using) and Transcription. Conversation mode is built for interactive back-and-forth, while Transcription is just for converting speech to text. We had to modify the conversation mode to work for our one-sided use case, where we just want the AI to listen but not respond audibly.
</aside>

---
## WebRTC Connection Setup

```typescript
async connect(audioElement: HTMLAudioElement): Promise<void> {
  // Get microphone access
  this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
  // Create peer connection
  this.pc = new RTCPeerConnection();
  
  // Add data channel for messaging
  this.dc = this.pc.createDataChannel('oai-events');
  
  // Add local audio track
  this.pc.addTrack(this.audioTrack, this.mediaStream);
  
  // Create and set local description (offer)
  await this.pc.setLocalDescription();
  
  // Send offer to OpenAI via our server
  const response = await fetch(`${this.apiEndpoint}?model=${encodeURIComponent(this.model)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sdp' },
    body: this.pc.localDescription.sdp,
  });
  
  // Get answer SDP and set remote description
  const answerSdp = await response.text();
  await this.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
}
```

<aside class="notes">
Here's how we establish the WebRTC connection to OpenAI's servers. WebRTC is complex but powerful, allowing real-time audio streaming with low latency. We create a peer connection, set up a data channel for messages, add our microphone audio track, then exchange SDP information to establish the connection.
</aside>

---
## Technical Challenges

### Voice Activity Detection (VAD)

```typescript
// Semantic VAD (context-aware turn detection)
updateVadSettings({
  type: 'semantic_vad',
  eagerness: 'high',  // How quickly AI responds
});

// Server VAD (simple pause detection)
updateVadSettings({
  type: 'server_vad',
  threshold: 0.5,            // Energy threshold
  prefix_padding_ms: 300,    // Add silence before speech
  silence_duration_ms: 500,  // Time of silence to end turn
});
```

<aside class="notes">
One of the biggest challenges was getting the Voice Activity Detection (VAD) settings right. These control when the AI thinks you've stopped talking and it should respond. Semantic VAD uses AI to understand natural pauses in conversation, while Server VAD uses simple audio energy thresholds. I've found Semantic VAD with high eagerness works best for presentations.
</aside>

---
## Tool Definition for Slide Updates

```typescript
client.addTool(
  {
    type: 'function',
    name: 'updateSlide',
    description: 'Update the slide content with new information',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The title of the slide'
        },
        bullets: {
          type: 'array',
          items: { type: 'string' },
          description: 'Bullet points for the slide'
        },
        bulletAnimations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              animation: {
                type: 'string',
                description: 'Animation type (fade, slide, bounce, emphasis)'
              }
            }
          }
        }
      }
    }
  },
  callbacks.onUpdateSlide
);
```

<aside class="notes">
This is how we define tools that the AI can use to update the presentation. The key tool is updateSlide, which lets the AI add bullet points with different animation styles. The AI really loves the bounce animation - it uses it constantly unless instructed otherwise!
</aside>

---
## Instruction Prompting

```typescript
let instructions = `You are a silent AI presentation assistant that updates the slides in real time as the presenter speaks. Your audio is likely muted by the user, so focus on visual updates. Listen carefully to the presenter and follow these rules:
1. Use the "updateSlide" function to update the slide with each new bullet point while the presenter is talking.
2. Keep bullets concise and relevant to what the presenter is currently talking about
3. Use the bulletAnimations parameter to animate each bullet with an effect like 'fade', 'slide', 'bounce', or 'emphasis'
4. Don't respond verbally or interrupt the presenter unless they say "hey, presentation assistant"
5. Remember that the system will send you slide context information when slides change
6. Since your audio is likely muted, focus on visual slide updates rather than verbal responses`;

client.updateSession({ instructions, voice, temperature });
```

<aside class="notes">
The instruction prompt is crucial to guiding the AI's behavior. We tell it to be a silent assistant, focus on creating concise bullet points, and only respond verbally when explicitly addressed. We also remind it that its audio is likely muted, so it should focus on visual updates.
</aside>

---
## Learning journey

### RevealJS Nested Presentation Pattern

```tsx
// RealtimePresentationSlide Component
<div className="realtime-presentation-slide">
  {/* Controls and Settings Panel */}
  <div className="mb-4 p-4 bg-gray-100 rounded-lg">
    {/* VAD Settings, Start/Stop buttons */}
  </div>
  
  {/* Main presentation content area */}
  <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-lg p-8 overflow-auto">
    {slideContent.title && (
      <h2 className="text-3xl font-bold mb-6 text-center text-red-400">
        {slideContent.title}
      </h2>
    )}
    
    {slideContent.bullets && slideContent.bullets.length > 0 ? (
      <ul className="space-y-4 mb-6 max-w-3xl mx-auto">
        {slideContent.bullets.map((bullet, index) => (
          <li key={`bullet-${index}`} className={`flex items-start ${animationClass}`}>
            <span className="text-red-400 mr-2">•</span>
            <span className="text-xl">{bullet}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-xl mb-6 text-center">{slideContent.content}</p>
    )}
  </div>
  
  {/* Hidden audio element for WebRTC audio playback */}
  <audio ref={audioRef} className="hidden" autoPlay />
</div>
```

<aside class="notes">
RevealJS wasn't designed for dynamic content updates, so I created a presentation-within-presentation architecture. Each RevealJS slide contains a React component that can be dynamically updated by the AI. This lets us maintain the overall presentation structure while allowing individual slides to be updated in real-time.
</aside>

---
## WebRTC Mute Control

```typescript
// Toggle mute state
const toggleMute = () => {
  const newMuteState = !isMuted;
  setIsMuted(newMuteState);
  
  if (audioRef.current) {
    audioRef.current.muted = newMuteState;
  }
  
  // Inform the AI about the mute state change
  if (clientRef.current && clientRef.current.isConnected()) {
    clientRef.current.sendMuteStateUpdate(newMuteState);
  }
};

// Inform AI about mute state
sendMuteStateUpdate(isMuted: boolean): void {
  let instructions = '';
  if (isMuted) {
    instructions = `Your audio has been muted by the user. The user will not hear your verbal responses, so focus entirely on visual updates to the slides.`;
  } else {
    instructions = `Your audio has been unmuted by the user. You can now respond verbally when addressed directly.`;
  }
  this.createResponse(instructions);
}
```

<aside class="notes">
Since the OpenAI Realtime API is designed for conversations, I needed a way to mute the AI's voice responses while still allowing it to receive audio and update the slides. This code not only mutes the audio but also sends instructions to the AI to focus on visual updates when muted.
</aside>

---
## What's next?

- Remote control capabilities 
- Recording and playback options
- Better handling of complex code examples
- More animation styles
- Templates for different presentation types
- Fine-tuning the VAD settings

<aside class="notes">
I'm still improving Present with remote control capabilities, so a presenter can use it from their phone. I'm also adding recording/playback of presentations, improving code display, and continuously tweaking the VAD settings for better responsiveness.
</aside>

---
## Lessons Learned

- AI coding is helpful but has limitations
- Even with perfect prompts, behavior can be unpredictable
- WebRTC is complex - nobody really understands it fully
- Balance between AI autonomy and presenter control
- Testing in real presentations reveals unexpected issues
- Mute functionality is essential for presentation context

<aside class="notes">
Working with cutting-edge AI APIs means accepting some limitations and unpredictability. WebRTC in particular is challenging - even experts struggle with it. The key is finding the right balance between AI assistance and presenter control, and continuously testing in real-world scenarios.
</aside>

---
## Thank You!

Wes Sonnenreich
https://sonnenreich.com
https://linkedin.com/in/sonnenreich

### Questions?

<aside class="notes">
Thanks for your attention! I'd be happy to answer any questions or demonstrate the system further.
</aside> 