import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { name, highlights } = await request.json();

    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const highlightsText = highlights && highlights.length > 0 
      ? highlights.join(', ') 
      : 'professional accomplishments';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        {
          role: 'user',
          content: `Generate a professional tagline for ${name} based on their highlights: ${highlightsText}. 

The tagline should be:
- 3-6 words maximum
- Professional and impactful
- Suitable for a video conference background
- Focus on leadership, innovation, or expertise themes
- Avoid generic phrases like "Professional" or "Expert"

Examples of good taglines:
- "Innovation Leader & Strategic Thinker"
- "Transforming Ideas into Impact"
- "Building Tomorrow's Solutions"
- "Driving Growth Through Technology"

Return only the tagline text, no quotes or explanations.`
        }
      ],
      max_completion_tokens: 100,
    });

    const tagline = completion.choices[0]?.message?.content?.trim();

    if (!tagline) {
      return NextResponse.json({ success: false, error: 'Failed to generate tagline' }, { status: 500 });
    }

    return NextResponse.json({ success: true, tagline });
  } catch (error) {
    console.error('Error generating tagline:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
} 