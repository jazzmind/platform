import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    let { name, url } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    if (!url || typeof url !== 'string') {
      url = '';
    }
    const highlightsSchema = z.object({
      highlights: z.array(z.string())
    });
    // Use web search through OpenAI to research the person
    const searchResponse = await openai.responses.parse({
      model: "gpt-4.1-mini",
      tools: [ { type: "web_search_preview" } ],
      input: [
        {
          role: "system",
          content: `You are a professional researcher. Search for information about the person and generate 10 professional highlights that would be suitable for a video conference background. Focus on achievements, skills, roles, education, and notable accomplishments. Return the response as a JSON object with a "highlights" array containing strings.`
        },
        {
          role: "user",
          content: `Research ${name} and generate 10 professional highlights about them. ${url ? `The person's website is ${url}.` : ''} If you cannot find specific information, generate realistic professional highlights based on common achievements in their likely field. Each highlight should be 2-6 words maximum.`
        }
      ],
      text: { format: zodTextFormat(highlightsSchema, "highlights") }
    });

    const result = searchResponse.output_parsed;
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to generate highlights' },
        { status: 500 }
      );
    }
    // Ensure we have highlights array
    if (!result.highlights || !Array.isArray(result.highlights)) {
      return NextResponse.json(
        { error: 'Failed to generate highlights' },
        { status: 500 }
      );
    }

    // Limit to 10 highlights and ensure they're strings
    const highlights = result.highlights
      .slice(0, 10)
      .map((h: any) => typeof h === 'string' ? h : String(h))
      .filter((h: string) => h.trim().length > 0);

    return NextResponse.json({
      success: true,
      highlights
    });

  } catch (error) {
    console.error('Error researching person:', error);
    return NextResponse.json(
      { error: 'Failed to research person' },
      { status: 500 }
    );
  }
} 