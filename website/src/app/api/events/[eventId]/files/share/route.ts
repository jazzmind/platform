import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface ShareRequest {
  fileId: string;
  platform?: 'twitter' | 'linkedin' | 'generic';
  customText?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body: ShareRequest = await request.json();
    const { fileId, platform = 'generic', customText } = body;
    
    // Validate required fields
    if (!eventId || !fileId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    // Get the event data
    const eventsDirectory = path.join(process.cwd(), "src/data/events", eventId);
    const eventPath = path.join(eventsDirectory, "event.json");
    
    if (!fs.existsSync(eventPath)) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }
    
    const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    const eventTitle = eventData.public.title;
    
    // Get the file content
    const filesDirectory = path.join(eventsDirectory, "files");
    const filePath = path.join(filesDirectory, fileId);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ message: 'File not found' }, { status: 404 });
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(fileId);
    
    // Determine character limits based on platform
    let charLimit = 280;
    if (platform === 'linkedin') {
      charLimit = 700;
    } else if (platform === 'generic') {
      charLimit = 500;
    }
    
    // Construct the prompt for OpenAI
    const prompt = `
Generate a concise and engaging ${platform} post about the document: "${fileName}" 
from the event "${eventTitle}".

${customText ? `Include these key points: ${customText}` : ''}

Document content:
${fileContent.substring(0, 2000)}${fileContent.length > 2000 ? '...[content truncated]' : ''}

Requirements:
- Keep it under ${charLimit} characters
- Include a brief summary of what's most interesting
- Use an engaging tone
- If there's room, include a call to action like "Check out more at [LINK]"
- Do not include the actual link placeholder, just use [LINK]

Return just the social media post text without any additional formatting or explanations.
`;
    
    // Call OpenAI for generating the share text
    const completion = await openai.chat.completions.create({
      model: "o3-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates social media posts about event documents."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });
    
    const generatedText = completion.choices[0].message.content?.trim() || '';
    const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/events/${eventId}`;
    
    // Replace [LINK] placeholder with actual URL
    const finalText = generatedText.replace('[LINK]', shareUrl);
    
    return NextResponse.json({ 
      text: finalText,
      url: shareUrl
    }, { status: 200 });
  } catch (error) {
    console.error('Error generating share text:', error);
    return NextResponse.json({ 
      message: 'An error occurred while generating share text' 
    }, { status: 500 });
  }
} 