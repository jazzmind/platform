# Background Maker Package

A standalone tool for creating custom video conference backgrounds with personal branding elements.

## Features

- **AI-Powered Research**: Automatically research people and generate professional highlights
- **Personal Highlights**: Add up to 10 personal details/achievements to showcase
- **Smart Icon Recommendations**: AI-powered icon suggestions for each highlight
- **Custom Branding**: Choose primary colors and generate personalized headlines
- **QR Code Integration**: Optional QR codes linking to LinkedIn or personal websites (placeholder implementation)
- **Professional Layout**: Optimized spacing for video conferencing with person silhouette
- **High Quality Output**: Generates 1920x1080 backgrounds ready for use

## Current Implementation Status

✅ **Completed:**
- AI person research with OpenAI integration
- Smart icon recommendations using lucide-react icons
- Improved canvas layout with clean text (no boxes)
- Person silhouette overlay in center
- Form interface for collecting personal details
- Color picker for background customization
- Dynamic highlight management (add/remove up to 10)
- Canvas-based background generation
- Gradient backgrounds with pattern overlays
- Professional text layout with headlines
- Download functionality
- Responsive design

🚧 **In Progress:**
- Real QR Code generation (currently shows placeholder)
- Enhanced typography and font loading
- Better highlight positioning algorithms

## Environment Setup

Create a `.env.local` file in the package root with:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

This enables:
- AI-powered person research
- Smart icon recommendations for highlights

## Development

```bash
# From the root directory
npm run dev:bgmaker

# Or directly in the package
cd packages/bgmaker
npm run dev
```

The development server will start on port 3003 by default.

## Usage

1. **Enter Personal Details**: Enter your name and click "Research" for AI auto-population
2. **AI Research**: Automatically generates 10 professional highlights with matching icons
3. **Manual Editing**: Edit highlights and click icons for AI recommendations
4. **Choose Colors**: Select a primary color for your background
5. **Optional QR Code**: Link to your LinkedIn or personal website (placeholder for now)
6. **Generate & Download**: Create and download your custom background

## Technical Details

### AI Integration
- Uses OpenAI o3-mini model for person research and icon recommendations
- Researches professional highlights based on the person's name
- Recommends appropriate lucide-react icons for each highlight
- Fallback handling for API failures

### Canvas Generation
- Uses HTML5 Canvas API for client-side image generation
- Creates 1920x1080 resolution backgrounds
- Implements gradient backgrounds with customizable colors
- Clean text layout without boxes for professional appearance
- Person silhouette overlay in central area

### Layout Algorithm
The background generator strategically places elements:
- **Top area**: Headline and name with shadows
- **Left/Right sides**: Personal highlights with icons (alternating)
- **Upper left**: QR code placeholder
- **Center**: Person silhouette overlay

### Icon System
- Integration with lucide-react icon library
- AI-powered icon recommendations based on highlight content
- Click-to-recommend functionality for each highlight
- Fallback to generic icons if recommendations fail

### Color System
- Primary color input with color picker
- Automatic generation of lighter/darker variants
- Brightness adjustment algorithm for gradients

## Integration with Main Application

To use this package in the main application:

```tsx
import { BackgroundGenerator } from '@sonnenreich/bgmaker/generator';

function MyComponent() {
  return <BackgroundGenerator />;
}
```

Configure your main application's `next.config.js`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sonnenreich/bgmaker"],
  // other config
};
```

## Output Specifications

- **Resolution**: 1920x1080 (Full HD)
- **Format**: PNG with transparency support
- **Layout**: Central person silhouette area
- **Elements**: Personal highlights with icons, headline, optional QR code placeholder
- **Colors**: Customizable primary color with professional gradients
- **Typography**: Clean text with shadows for readability

## Next Steps

1. **Real QR Code Generation**: Implement actual QR code generation library
2. **Font Loading**: Add custom fonts for better typography
3. **Template System**: Multiple background templates/styles
4. **Export Options**: Multiple format support (JPG, PNG, different resolutions)
5. **Preview Enhancements**: Real-time preview updates
6. **Positioning Controls**: Manual positioning of elements
7. **Enhanced AI**: Better person research with web search integration 