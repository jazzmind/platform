import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { theme, commonFactors } = body;

    if (!theme) {
      return NextResponse.json(
        { error: 'Theme is required' },
        { status: 400 }
      );
    }

    // Format common factors into a readable string for the prompt
    const factorsText = commonFactors && commonFactors.length > 0
      ? `The team members have these factors in common: ${commonFactors.join(', ')}.`
      : 'The team is diverse without many common factors.';

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: "You are a creative team naming assistant. Generate a short, clever, and memorable team name based on the given theme and common characteristics. The name should be professional yet creative, and no more than 2-3 words."
        },
        {
          role: "user",
          content: `Generate a creative team name based on the theme "${theme}". ${factorsText} Respond with ONLY the team name, nothing else.`
        }
      ]
    });

    const teamName = response.choices[0].message.content?.trim();

    return NextResponse.json({ teamName });
  } catch (error) {
    console.error('Team name generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate team name' },
      { status: 500 }
    );
  }
} 