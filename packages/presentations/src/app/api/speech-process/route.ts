import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client (server-side only)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log('Speech process API loaded, OpenAI client initialized with API key:', 
  process.env.OPENAI_API_KEY ? 'API key exists' : 'No API key found');

// Cache for recently processed requests
const responseCache = new Map();
const CACHE_TTL = 60000; // 1 minute cache

export async function POST(request: NextRequest) {
  console.log('Speech process API called');
  
  try {
    const body = await request.json();
    const { 
      recentText,
      currentSlideText,
      referenceContent, 
      currentSlide, 
      talkingPoint,
      talkingPointNotes 
    } = body;
    
    console.log('Received request with text length:', recentText?.length || 0);
    console.log('Reference content provided:', !!referenceContent);
    console.log('Current slide provided:', !!currentSlide);
    console.log('Talking point provided:', talkingPoint || 'None');
    
    if (!recentText || recentText.trim().length < 10) {
      console.log('Text is too short or missing, returning 400');
      return NextResponse.json(
        { error: 'Text is too short or missing' },
        { status: 400 }
      );
    }
    
    // Create a cache key based on important parts of the request
    // Only use the first 100 chars of text to allow for incremental updates
    const cacheKey = `${talkingPoint}-${recentText.substring(0, 100)}`;
    
    // Check if we have a cached response for similar requests
    if (responseCache.has(cacheKey)) {
      console.log('Using cached response for similar request');
      const cachedResponse = responseCache.get(cacheKey);
      return NextResponse.json(cachedResponse);
    }
    
    console.log('Calling OpenAI API');
    
    // Start multiple concurrent API requests with different contexts
    const systemPromptBase = `You are a presentation assistant that creates dynamic, visually appealing slides based on spoken content.

TALKING POINT: ${talkingPoint || 'No specific talking point'}
NOTES: ${talkingPointNotes || 'No notes provided'}`;

    const fullContextPrompt = `${systemPromptBase}

${currentSlide ? `CURRENT SLIDE STATE: ${JSON.stringify(currentSlide)}` : ''}

${referenceContent ? 'REFERENCE CONTENT: ' + referenceContent : ''}

Your task:
1. Analyze the current slide state (if provided) and the new speech text
2. Create INCREMENTAL updates to the slide, not a completely new slide
3. Identify what content should be KEPT, what NEW content should be added, and what content should be REMOVED
4. Structure the content with a clear title and hierarchical bullet points
5. Suggest an image that would complement the content

For incremental updates, follow these rules:
1. Keep the same title unless the topic has significantly changed
2. Add NEW bullet points for new information rather than replacing existing ones
3. Only REMOVE bullet points if they're contradicted by new information or no longer relevant
4. Maintain a maximum of 5-7 bullet points at any time for readability
5. For code blocks, update them incrementally when possible

The animationDirections field is CRITICAL for proper animations:
- "new": An array of strings/content that should animate in (new bullet points, changed title, etc.)
- "keep": An array of strings/content that should remain on screen unchanged
- "remove": An array of strings/content that should animate out and be removed

Your response should be in JSON format with these fields:
- title: A concise title for the slide
- content: Main textual content
- bullets: Array of bullet points supporting the main topic
- codeBlocks: Array of relevant code examples (if any)
- imagePrompt: Suggestion for an image
- animationDirections: { new: string[], keep: string[], remove: string[] }`;

    const minimalContextPrompt = `${systemPromptBase}

${currentSlide ? `CURRENT SLIDE STATE: ${JSON.stringify(currentSlide)}` : ''}

Your task:
1. Update the current slide incrementally with new information from speech
2. Maintain the same title unless the topic has completely changed
3. Add 1-2 new bullet points for the new information if relevant
4. KEEP existing bullet points unless they're contradicted by new information
5. Provide animation directions to animate only what changes

Your response should be in JSON format with these fields:
- title: A concise title for the slide
- content: Brief content summary
- bullets: Array of bullet points (existing plus new)
- animationDirections: { new: string[], keep: string[], remove: string[] }`;

    // Run both prompts simultaneously for faster response
    const [fullResponse, minimalResponse] = await Promise.allSettled([
      openai.chat.completions.create({
        model: "gpt-4o-mini", // Default model per API standards
        messages: [
          {
            role: "system",
            content: fullContextPrompt
          },
          {
            role: "user",
            content: currentSlideText
          },
          {
            role: "user",
            content: recentText
          }
        ],
        response_format: { type: "json_object" }
      }),
      
      // Backup minimal request that should be faster
      openai.chat.completions.create({
        model: "gpt-4o-mini", 
        messages: [
          {
            role: "system",
            content: minimalContextPrompt
          },
          {
            role: "user",
            content: currentSlideText.substring(0, 200) // Use shorter text for faster response
          },
          {
            role: "user",
            content: recentText.substring(0, 200)
          }
        ],
        response_format: { type: "json_object" }
      })
    ]);
    
    // Use the first successful response
    let result = null;
    
    if (fullResponse.status === 'fulfilled') {
      result = fullResponse.value.choices[0]?.message?.content;
      console.log('Using full context response');
    } else if (minimalResponse.status === 'fulfilled') {
      result = minimalResponse.value.choices[0]?.message?.content;
      console.log('Using minimal context response (fallback)');
    }
    
    console.log('OpenAI response received:', result ? 'Has content' : 'No content');
    
    if (!result) {
      console.log('No result from OpenAI, returning 500');
      return NextResponse.json(
        { error: 'Failed to generate content' },
        { status: 500 }
      );
    }
    
    try {
      const parsed = JSON.parse(result);
      console.log('Successfully parsed OpenAI response as JSON');
      
      // Prepare the response object
      const responseObject = {
        title: parsed.title,
        content: parsed.content || recentText,
        bullets: parsed.bullets || [],
        codeBlocks: parsed.codeBlocks || [],
        imagePrompt: parsed.imagePrompt,
        animationDirections: parsed.animationDirections || {}
      };
      
      // Cache the response for future similar requests
      responseCache.set(cacheKey, responseObject);
      
      // Set a timeout to remove the cache entry after TTL expires
      setTimeout(() => {
        responseCache.delete(cacheKey);
      }, CACHE_TTL);
      
      return NextResponse.json(responseObject);
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      // Fallback to simpler content structure
      return NextResponse.json({
        content: recentText
      });
    }
  } catch (error) {
    console.error('Error processing with OpenAI:', error);
    return NextResponse.json(
      { error: 'Failed to process speech' },
      { status: 500 }
    );
  }
} 