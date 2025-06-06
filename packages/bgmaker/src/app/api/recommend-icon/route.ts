import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Common lucide-react icons that work well for professional highlights
const AVAILABLE_ICONS = [
  'Award', 'Star', 'Trophy', 'Medal', 'Crown', 'Target', 'Zap', 'Flame',
  'Heart', 'Brain', 'Eye', 'Lightbulb', 'Rocket', 'TrendingUp', 'BarChart3',
  'PieChart', 'Users', 'User', 'UserCheck', 'UserPlus', 'Users2', 'Team',
  'Briefcase', 'Building', 'Building2', 'Factory', 'Home', 'School',
  'GraduationCap', 'BookOpen', 'Book', 'Library', 'Microscope', 'Beaker',
  'Code', 'Terminal', 'Monitor', 'Smartphone', 'Tablet', 'Laptop',
  'Globe', 'Map', 'MapPin', 'Navigation', 'Compass', 'Plane',
  'Camera', 'Video', 'Mic', 'Music', 'Headphones', 'Radio',
  'Palette', 'Brush', 'Pen', 'Edit', 'FileText', 'Newspaper',
  'MessageCircle', 'MessageSquare', 'Mail', 'Phone', 'Megaphone', 'Speaker',
  'Shield', 'Lock', 'Key', 'Settings', 'Tool', 'Wrench',
  'Calendar', 'Clock', 'Timer', 'Stopwatch', 'Watch', 'AlarmClock',
  'DollarSign', 'TrendingUp', 'BarChart', 'LineChart', 'Activity', 'Pulse',
  'CheckCircle', 'Check', 'Plus', 'Minus', 'X', 'ArrowUp',
  'ThumbsUp', 'Smile', 'Laugh', 'Coffee', 'Pizza', 'Car'
];

export async function POST(request: NextRequest) {
  try {
    const { highlight } = await request.json();

    if (!highlight || typeof highlight !== 'string') {
      return NextResponse.json(
        { error: 'Highlight is required' },
        { status: 400 }
      );
    }

    const iconResponse = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: `You are an icon recommendation expert. Given a professional highlight, recommend the most appropriate icon from the provided list. Return your response as a JSON object with an "icon" field containing the exact icon name from the list.

Available icons: ${AVAILABLE_ICONS.join(', ')}

Choose the icon that best represents the concept, achievement, or field mentioned in the highlight. For example:
- For "CEO" or "Leadership" → "Crown" or "Users"
- For "Developer" or "Programming" → "Code" or "Terminal"
- For "Sales" or "Revenue" → "TrendingUp" or "DollarSign"
- For "Education" or "Teaching" → "GraduationCap" or "BookOpen"
- For "Award" or "Recognition" → "Award" or "Trophy"

Be creative in your association. If you really can't find an icon that fits, return "Star".`
        },
        {
          role: "user",
          content: `Recommend an icon for this professional highlight: "${highlight}"`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(iconResponse.choices[0].message.content || '{}');
    
    // Validate the recommended icon
    if (!result.icon || !AVAILABLE_ICONS.includes(result.icon)) {
      // Fallback to a generic icon if recommendation is invalid
      return NextResponse.json({
        success: true,
        icon: 'Star' // Generic fallback
      });
    }

    return NextResponse.json({
      success: true,
      icon: result.icon
    });

  } catch (error) {
    console.error('Error recommending icon:', error);
    return NextResponse.json({
      success: true,
      icon: 'Star' // Fallback on error
    });
  }
} 