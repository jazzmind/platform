import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { style, location, highlights, tagline } = await request.json();

    if (!style || (style === 'location' && !location)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    let prompt = '';
    
    if (style === 'location') {
      prompt = `Create a professional video conference background featuring the skyline or landmarks of ${location}. The image should be:
- Professional and clean
- Subtle and not distracting
- No text or people in the image
- Soft colors that won't interfere with text overlay
- Modern and sophisticated look
- Suitable for business video calls`;
    } else if (style === 'skills') {
      const skills = highlights && highlights.length > 0 
        ? highlights.join(', ') 
        : 'professional accomplishments';
        
      prompt = `Create a professional video conference background incorporating these skills and interests: ${skills}. The background should be:
- artistic but professional
- Subtle and not distracting for video calls
- No text, people, or logos in the image
- Colors that complement business attire
- Modern and sophisticated aesthetic
- Inspiring but not overwhelming
- Suitable for professional video conferences`;
} else if (style === 'abstract') {
  prompt = `Create a professional video conference background. The background should be:
- Abstract and artistic but professional
- Subtle and not distracting for video calls
- No text, people, or logos in the image
- Colors that complement business attire
- Modern and sophisticated aesthetic
- Inspiring but not overwhelming
- Suitable for professional video conferences`;
} else if (style === 'tagline') {
  prompt = `Create a professional video conference background inspired by the following: ${tagline}. The background should be:
- artistic but professional
- Subtle and not distracting for video calls
- No text, people, or logos in the image
- Colors that complement business attire
- Modern and sophisticated aesthetic
- Inspiring but not overwhelming
- Suitable for professional video conferences`;
}


    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: prompt,
      n: 1,
      size: "1536x1024",  // Closest to 1920x1080 that image-1 supports
      quality: "medium"
    });
    console.log(response);
    const imageB64 = response.data?.[0]?.b64_json;

    if (!imageB64) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to generate background image' 
      }, { status: 500 });
    }

    // Convert base64 to data URL
    const imageData = `data:image/png;base64,${imageB64}`;

    return NextResponse.json({ 
      success: true, 
      imageData
    });
  } catch (error) {
    console.error('Error generating background image:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 