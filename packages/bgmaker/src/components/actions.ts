"use client";

import QRCode from 'qrcode';
import { ta } from 'zod/v4/locales';

interface Highlight {
  text: string;
  icon: string;
}

interface BackgroundData {
  name: string;
  tagline: string;
  location: string;
  highlights: Highlight[];
  primaryColor: string;
  secondaryColor: string;
  qrCodeUrl?: string;
  fontSize: number;
  iconSize: number;
  fontFamily: string;
  backgroundStyle: 'gradient' | 'solid' | 'location' | 'skills' | 'tagline' | 'abstract';
  textOpacity: number;
  textColor: string;
  iconColor: string;
  backgroundImageUrl?: string; // For overlay-only updates
  displaySettings?: {
    showName: boolean;
    showTagline: boolean;
    showQRCode: boolean;
  };
}

interface GenerateBackgroundResult {
  success: boolean;
  imageUrl?: string;
  backgroundImageUrl?: string;
  error?: string;
}

async function generateBackgroundStyle(
  ctx: CanvasRenderingContext2D, 
  data: BackgroundData, 
  width: number, 
  height: number
) {
  const primaryColor = data.primaryColor || '#3B82F6';
  const secondaryColor = data.secondaryColor || adjustColorBrightness(primaryColor, -40);

  switch (data.backgroundStyle) {
    case 'solid':
      // Solid color background
      ctx.fillStyle = primaryColor;
      ctx.fillRect(0, 0, width, height);
      break;
      
    case 'gradient':
      // Gradient background (default)
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, primaryColor);
      gradient.addColorStop(1, secondaryColor);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      // Add subtle pattern overlay
      ctx.globalAlpha = 0.08;
      for (let i = 0; i < width; i += 200) {
        for (let j = 0; j < height; j += 200) {
          ctx.fillStyle = 'white';
          ctx.fillRect(i, j, 4, 4);
        }
      }
      ctx.globalAlpha = 1;
      break;
      
    case 'location':
    case 'skills':
    case 'tagline':
    case 'abstract':
      // Generate AI background
      try {
        const highlights = data.highlights.map(h => h.text).filter(t => t.trim() !== '');
        const response = await fetch('/api/generate-background-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            style: data.backgroundStyle,
            location: data.location,
            highlights: highlights,
            name: data.name,
            tagline: data.tagline
          })
        });
        
        const result = await response.json();
        
        if (result.success && result.imageData) {
          // Load and draw the AI-generated background
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          await new Promise((resolve, reject) => {
            img.onload = () => {
              // Draw the image to fill the canvas
              ctx.drawImage(img, 0, 0, width, height);
              resolve(null);
            };
            img.onerror = reject;
            img.src = result.imageData;
          });
        } else {
          throw new Error('Failed to generate AI background');
        }
      } catch (error) {
        console.warn('AI background generation failed, using gradient fallback:', error);
        // Fallback to gradient if AI generation fails
        const fallbackGradient = ctx.createLinearGradient(0, 0, width, height);
        fallbackGradient.addColorStop(0, primaryColor);
        fallbackGradient.addColorStop(1, secondaryColor);
        ctx.fillStyle = fallbackGradient;
        ctx.fillRect(0, 0, width, height);
      }
      break;
      
    default:
      // Default to gradient
      const defaultGradient = ctx.createLinearGradient(0, 0, width, height);
      defaultGradient.addColorStop(0, primaryColor);
      defaultGradient.addColorStop(1, secondaryColor);
      ctx.fillStyle = defaultGradient;
      ctx.fillRect(0, 0, width, height);
  }
}

export async function generateBackground(data: BackgroundData): Promise<GenerateBackgroundResult> {
  try {
    // Canvas dimensions for 1920x1080 background
    const width = 1920;
    const height = 1080;
    
    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    let backgroundImageUrl = data.backgroundImageUrl;

    // Generate or load background
    if (data.backgroundImageUrl) {
      // Load existing background image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(null);
        };
        img.onerror = reject;
        img.src = data.backgroundImageUrl!;
      });
    } else {
      // Generate new background based on style
      await generateBackgroundStyle(ctx, data, width, height);
      // Store the background without overlay for future use
      backgroundImageUrl = canvas.toDataURL('image/png');
    }

    // Use provided tagline or generate one
    const displayTagline = data.tagline || generateHeadline(data.name);

    // Parse text color for RGB values with fallback
    const textColor = data.textColor || '#FFFFFF';
    const iconColor = data.iconColor || data.textColor || '#FFFFFF';
    const textRgb = hexToRgb(textColor);
    const iconRgb = hexToRgb(iconColor);

    // Draw name at the top (larger) - only if enabled
    if (data.displaySettings?.showName !== false) {
      ctx.fillStyle = `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, ${0.95 * data.textOpacity})`;
      ctx.font = `bold 64px ${data.fontFamily}, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = `rgba(0, 0, 0, ${0.4 * data.textOpacity})`;
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      ctx.fillText(data.name, width / 2, 90);
    }

    // Draw tagline below name (smaller) - only if enabled
    if (data.displaySettings?.showTagline !== false) {
      ctx.font = `32px ${data.fontFamily}, Arial, sans-serif`;
      ctx.fillStyle = `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, ${0.85 * data.textOpacity})`;
      ctx.shadowColor = `rgba(0, 0, 0, ${0.4 * data.textOpacity})`;
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      // Position tagline based on whether name is shown
      const taglineY = data.displaySettings?.showName !== false ? 140 : 90;
      ctx.fillText(displayTagline, width / 2, taglineY);
    }
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Draw highlights with proper 30/40/30 layout and word wrapping
    await drawHighlightsWithLayout(ctx, data.highlights, width, height, data.fontSize, data.iconSize, data.fontFamily, data.textOpacity, textRgb, iconRgb);

    // Add real QR code if URL provided
    if (data.qrCodeUrl && data.displaySettings?.showQRCode !== false) {
      await addRealQRCode(ctx, data.qrCodeUrl, 50, 50, 90);
    }

    // Convert canvas to base64 data URL
    const imageUrl = canvas.toDataURL('image/png');

    return {
      success: true,
      imageUrl,
      backgroundImageUrl: backgroundImageUrl
    };
  } catch (error) {
    console.error('Error generating background:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

function generateHeadline(name: string): string {
  const headlines = [
    'Driving Innovation Forward',
    'Transforming Ideas into Reality',
    'Leading with Purpose',
    'Building the Future',
    'Passionate Problem Solver',
    'Creating Impact Through Technology',
    'Empowering Teams to Excel',
    'Strategic Thinker & Innovator'
  ];
  
  return headlines[Math.floor(Math.random() * headlines.length)];
}

async function drawHighlightsWithLayout(
  ctx: CanvasRenderingContext2D, 
  highlights: Highlight[], 
  width: number, 
  height: number,
  fontSize: number,
  iconSize: number,
  fontFamily: string,
  textOpacity: number,
  textColor: { r: number; g: number; b: number },
  iconColor: { r: number; g: number; b: number }
) {
  if (highlights.length === 0) return;

  // 30/40/30 layout - 30% left, 40% center (blank), 30% right
  const leftColumnWidth = width * 0.30;
  const centerColumnWidth = width * 0.40;
  const rightColumnWidth = width * 0.30;
  
  const leftColumnStart = 40; // Small margin from edge
  const leftColumnEnd = leftColumnWidth - 40;
  const rightColumnStart = leftColumnWidth + centerColumnWidth + 40;
  const rightColumnEnd = width - 40;

  // Start below QR code and title area
  const startY = 290;
  const lineHeight = fontSize + 20; // Dynamic line height based on font size
  const maxY = height - 100;

  // Split highlights between left and right columns
  const leftHighlights = highlights.filter((_, index) => index % 2 === 0);
  const rightHighlights = highlights.filter((_, index) => index % 2 === 1);

  // Draw left column highlights
  let currentY = startY;
  for (const highlight of leftHighlights) {
    if (currentY > maxY) break;
    
    const wrappedLines = wrapText(ctx, highlight.text, leftColumnEnd - leftColumnStart - iconSize - 20, fontSize, fontFamily);
    
    for (let i = 0; i < wrappedLines.length; i++) {
      if (currentY > maxY) break;
      
      await drawHighlightLine(
        ctx, 
        { text: wrappedLines[i], icon: i === 0 ? highlight.icon : '' }, 
        leftColumnStart + iconSize + 20, 
        currentY, 
        'left',
        fontSize,
        iconSize,
        fontFamily,
        textOpacity,
        textColor,
        iconColor,
        i === 0 ? leftColumnStart + iconSize / 2 : -1 // Only show icon on first line
      );
      
      currentY += lineHeight;
    }
    
    currentY += 10; // Extra space between different highlights
  }

  // Draw right column highlights
  currentY = startY;
  for (const highlight of rightHighlights) {
    if (currentY > maxY) break;
    
    const wrappedLines = wrapText(ctx, highlight.text, rightColumnEnd - rightColumnStart - iconSize - 20, fontSize, fontFamily);
    
    for (let i = 0; i < wrappedLines.length; i++) {
      if (currentY > maxY) break;
      
      await drawHighlightLine(
        ctx, 
        { text: wrappedLines[i], icon: i === 0 ? highlight.icon : '' }, 
        rightColumnEnd - iconSize - 20, 
        currentY, 
        'right',
        fontSize,
        iconSize,
        fontFamily,
        textOpacity,
        textColor,
        iconColor,
        i === 0 ? rightColumnEnd - iconSize / 2 : -1 // Only show icon on first line
      );
      
      currentY += lineHeight;
    }
    
    currentY += 10; // Extra space between different highlights
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, fontSize: number, fontFamily: string): string[] {
  ctx.font = `bold ${fontSize}px ${fontFamily}, Arial, sans-serif`;
  
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.length > 0 ? lines : [text];
}

async function drawHighlightLine(
  ctx: CanvasRenderingContext2D,
  highlight: { text: string; icon: string },
  x: number,
  y: number,
  align: 'left' | 'right',
  fontSize: number,
  iconSize: number,
  fontFamily: string,
  textOpacity: number,
  textColor: { r: number; g: number; b: number },
  iconColor: { r: number; g: number; b: number },
  iconX: number = -1
) {
  // Set text styling with dynamic font size and font family
  ctx.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${0.92 * textOpacity})`;
  ctx.font = `bold ${fontSize}px ${fontFamily}, Arial, sans-serif`;
  ctx.textAlign = align;
  
  // Add stronger shadow for better readability
  ctx.shadowColor = `rgba(0, 0, 0, ${0.5 * textOpacity})`;
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  
  // Draw the highlight text
  ctx.fillText(highlight.text, x, y);
  
  // Reset shadow for icon
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  
  // Draw icon only if iconX is provided and icon exists
  if (iconX !== -1 && highlight.icon) {
    await drawLucideIconDirect(ctx, highlight.icon, iconX, y - (fontSize / 2) * .7, iconSize, textOpacity, iconColor);
  }
}

async function drawLucideIconDirect(
  ctx: CanvasRenderingContext2D,
  iconName: string,
  x: number,
  y: number,
  size: number,
  textOpacity: number,
  iconColor: { r: number; g: number; b: number }
) {
  // Get the exact SVG that matches the Lucide icon
  const svgContent = getLucideIconSVG(iconName, size);
  
  if (svgContent) {
    try {
      // Create a colored version of the icon using the iconColor
      const colorHex = `#${iconColor.r.toString(16).padStart(2, '0')}${iconColor.g.toString(16).padStart(2, '0')}${iconColor.b.toString(16).padStart(2, '0')}`;
      const coloredSvg = svgContent.replace(/stroke="currentColor"/g, `stroke="${colorHex}"`)
                                  .replace(/fill="currentColor"/g, `fill="${colorHex}"`)
                                  .replace(/fill="none"/g, 'fill="none"');
      
      const svgBlob = new Blob([coloredSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      
      return new Promise<void>((resolve) => {
        img.onload = () => {
          // Apply opacity to icon
          ctx.globalAlpha = textOpacity;
          // Draw icon directly without background circle
          ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
          // Reset opacity
          ctx.globalAlpha = 1;
          URL.revokeObjectURL(url);
          resolve();
        };
        
        img.onerror = () => {
          // Fallback to Star icon if SVG fails
          console.warn(`Failed to load icon: ${iconName}, using Star fallback`);
          const starSvg = getLucideIconSVG('Star', size);
          if (starSvg) {
            const fallbackColoredSvg = starSvg.replace(/stroke="currentColor"/g, `stroke="${colorHex}"`)
                                              .replace(/fill="currentColor"/g, `fill="${colorHex}"`)
                                              .replace(/fill="none"/g, 'fill="none"');
            const fallbackBlob = new Blob([fallbackColoredSvg], { type: 'image/svg+xml' });
            const fallbackUrl = URL.createObjectURL(fallbackBlob);
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
              ctx.globalAlpha = textOpacity;
              ctx.drawImage(fallbackImg, x - size / 2, y - size / 2, size, size);
              ctx.globalAlpha = 1;
              URL.revokeObjectURL(fallbackUrl);
              resolve();
            };
            fallbackImg.src = fallbackUrl;
          } else {
            resolve();
          }
          URL.revokeObjectURL(url);
        };
        
        img.src = url;
      });
    } catch (error) {
      console.warn(`Error rendering icon ${iconName}:`, error);
    }
  } else {
    console.warn(`No SVG found for icon: ${iconName}`);
  }
}

function getLucideIconSVG(iconName: string, size: number): string | null {
  // Comprehensive Lucide icon SVG paths that match the actual icons
  const iconPaths: { [key: string]: string } = {
    'Award': '<path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12c0 1-1 2-2 2H5c-1 0-2-1-2-2s1-2 2-2h14c1 0 2 1 2 2Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Star': '<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Trophy': '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m18 9h1.5a2.5 2.5 0 0 0 0-5H18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 9h12v6a6 6 0 0 1-12 0V9Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 22v-4h6v4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Medal': '<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.61 2.14a2 2 0 0 1 .13 2.2L16.79 15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 12 5.12 2.2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m13 12 5.88-9.8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 7h8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="17" r="5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Crown': '<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Target': '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="2" fill="none"/>',
    'Zap': '<polygon points="13,2 3,14 12,14 11,22 21,10 12,10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Flame': '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Heart': '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Brain': '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Eye': '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>',
    'Lightbulb': '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 18h6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 22h4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Rocket': '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 12h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 21h8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 17v4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'TrendingUp': '<polyline points="22,7 13.5,15.5 8.5,10.5 2,17" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polyline points="16,7 22,7 22,13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'BarChart3': '<path d="M3 3v18h18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 17V9" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 17V5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 17v-3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="m22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'User': '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" fill="none"/>',
    'Briefcase': '<rect width="20" height="14" x="2" y="7" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Building': '<rect width="16" height="20" x="4" y="2" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 22v-4h6v4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 6h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 6h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 6h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 10h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 10h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 14h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 14h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'GraduationCap': '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 10v6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Globe': '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Mic': '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    'Code': '<polyline points="16,18 22,12 16,6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polyline points="8,6 2,12 8,18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Terminal': '<polyline points="4,17 10,11 4,5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="19" x2="20" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    'Monitor': '<rect width="20" height="14" x="2" y="3" rx="2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    'CheckCircle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'ThumbsUp': '<path d="M7 10v12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h3.73a2 2 0 0 1 1.92 2.56z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'DollarSign': '<line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Calendar': '<rect width="18" height="18" x="3" y="4" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    'Clock': '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'MessageCircle': '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Camera': '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2" fill="none"/>',
    'Palette': '<circle cx="13.5" cy="6.5" r=".5" stroke="currentColor" stroke-width="2" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" stroke="currentColor" stroke-width="2" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" stroke="currentColor" stroke-width="2" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" stroke="currentColor" stroke-width="2" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'BookOpen': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'PieChart': '<path d="M21.21 15.89A10 10 0 1 1 8 2.83" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 12A10 10 0 0 0 12 2v10z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Settings': '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 1v6m0 6v6m5.66-13a9 9 0 0 1 0 4H21l-3.34 2-3.66-2H10l-3.66 2L3 12h3.34a9 9 0 0 1 0-4H3l3.34-2L10 8h4l3.66-2L21 8h-3.34z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Coffee': '<path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="6" y1="1" x2="6" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="14" y1="1" x2="14" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    'UserCheck': '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" fill="none"/><polyline points="16,11 18,13 22,9" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'UserPlus': '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" fill="none"/><line x1="19" y1="8" x2="19" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="22" y1="11" x2="16" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    'Users2': '<path d="M14 19a6 6 0 0 0-12 0" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="9" r="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="m15 11 2 2 4-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Team': '<path d="M8 21v-4a4 4 0 0 1 8 0v4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Building2': '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 12H4a2 2 0 0 0-2 2v8h4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 9h2a2 2 0 0 1 2 2v11h-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 6h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 6h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 10h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 10h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 14h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 14h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 18h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 18h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Factory': '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V6l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 18h1" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 18h1" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 18h1" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Home': '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'School': '<path d="M14 22v-4a2 2 0 1 0-4 0v4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 5v17" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m4 6 8-4 8 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 5v17" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Book': '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Library': '<path d="m16 6 4 14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 6v14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 8v12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m4 4 20 16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Microscope': '<path d="M6 18h8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 22h18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 22a7 7 0 1 0 0-14h-1" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 15v-1" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 6v-1" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Beaker': '<path d="M4.5 3h15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 14h12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Smartphone': '<rect width="14" height="20" x="5" y="2" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 18h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Tablet': '<rect width="16" height="20" x="4" y="2" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="18" x2="12.01" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    'Laptop': '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Map': '<polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="9" y1="3" x2="9" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="15" y1="6" x2="15" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    'MapPin': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2" fill="none"/>',
    'Navigation': '<polygon points="3,11 22,2 13,21 11,13 3,11" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Compass': '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Plane': '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Video': '<path d="m22 8-6 4 6 4V8Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Music': '<path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="2" fill="none"/>',
    'Headphones': '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Radio': '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Brush': '<path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Pen': '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Edit': '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m15 5 4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'FileText': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2v4a2 2 0 0 0 2 2h4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 9H8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 13H8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 17H8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Newspaper': '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 14h-8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 18h-3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 6h8v4h-8V6Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'MessageSquare': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Mail': '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Phone': '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Megaphone': '<path d="m3 11 18-5v12L3 14v-3z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Speaker': '<rect width="16" height="20" x="4" y="2" rx="2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="14" r="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 6h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Lock': '<rect width="18" height="11" x="3" y="11" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Key': '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m21 2-9.6 9.6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7.5" cy="15.5" r="5.5" stroke="currentColor" stroke-width="2" fill="none"/>',
    'Tool': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Wrench': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Timer': '<line x1="10" y1="2" x2="14" y2="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="14" x2="15" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="14" r="8" stroke="currentColor" stroke-width="2" fill="none"/>',
    'Stopwatch': '<circle cx="12" cy="13" r="8" stroke="currentColor" stroke-width="2" fill="none"/><path d="m12 9 2 2 2-2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 5V3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Watch': '<circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" fill="none"/><polyline points="12,10 12,12 13,13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m16.13 7.66-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-2 1.61l-.78 4.05" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m7.88 16.36.8 4a2 2 0 0 0 2 1.61h2.72a2 2 0 0 0 2-1.61l.81-4.05" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'AlarmClock': '<circle cx="12" cy="13" r="8" stroke="currentColor" stroke-width="2" fill="none"/><path d="m12 9 2 2 2-2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 5V3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m5 3 2 2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m17 3 2 2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'BarChart': '<line x1="12" y1="20" x2="12" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="18" y1="20" x2="18" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="6" y1="20" x2="6" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    'LineChart': '<path d="M3 3v18h18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m19 9-5 5-4-4-3 3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Activity': '<path d="m22 12-4-4-6 6-4-4-4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Pulse': '<path d="m22 12-4-4-6 6-4-4-4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Check': '<polyline points="20,6 9,17 4,12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Plus': '<line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    'Minus': '<line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    'X': '<line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    'ArrowUp': '<line x1="12" y1="19" x2="12" y2="5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="5,12 12,5 19,12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    'Smile': '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="9" y1="9" x2="9.01" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="15" y1="9" x2="15.01" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    'Laugh': '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><path d="M18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="9" y1="9" x2="9.01" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="15" y1="9" x2="15.01" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    'Pizza': '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><path d="M19.43 7.5c.57.87.57 2.13 0 3l-6.18 9.26a1 1 0 0 1-1.06.56c-.8-.2-1.69-.6-2.19-1.1a4 4 0 0 1-1.49-3.22 4 4 0 0 1 .23-1.4l1.63-4.83a4 4 0 0 1 1.78-2.38 4 4 0 0 1 3.22-.23 4 4 0 0 1 2.38 1.78c.5.5.9 1.39 1.1 2.19.1.45.1.91 0 1.37z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11.5" cy="12.5" r=".5" stroke="currentColor" stroke-width="2" fill="currentColor"/><circle cx="13.5" cy="10.5" r=".5" stroke="currentColor" stroke-width="2" fill="currentColor"/>',
    'Car': '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18.4 10H5.6L3.5 11.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="17" r="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M9 17h6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="17" cy="17" r="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M5 9 3 7l2-2h10l2 2-2 2H5Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
  };

  const path = iconPaths[iconName];
  if (!path) return null;

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${path}
  </svg>`;
}

function adjustColorBrightness(color: string, amount: number): string {
  // Remove # if present
  const hex = color.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Adjust brightness
  const newR = Math.max(0, Math.min(255, r + amount));
  const newG = Math.max(0, Math.min(255, g + amount));
  const newB = Math.max(0, Math.min(255, b + amount));
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Handle null/undefined values
  if (!hex) {
    return { r: 255, g: 255, b: 255 }; // Default to white
  }
  
  // Remove # if present and handle invalid formats
  const cleanHex = hex.replace('#', '');
  
  // Ensure we have a valid 6-character hex string
  if (cleanHex.length !== 6) {
    console.warn(`Invalid hex color: ${hex}, using white as fallback`);
    return { r: 255, g: 255, b: 255 };
  }
  
  // Parse RGB values
  const r = parseInt(cleanHex.substr(0, 2), 16);
  const g = parseInt(cleanHex.substr(2, 2), 16);
  const b = parseInt(cleanHex.substr(4, 2), 16);
  
  // Validate parsed values
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    console.warn(`Failed to parse hex color: ${hex}, using white as fallback`);
    return { r: 255, g: 255, b: 255 };
  }
  
  return { r, g, b };
}

async function addRealQRCode(
  ctx: CanvasRenderingContext2D, 
  url: string, 
  x: number, 
  y: number, 
  size: number
) {
  try {
    // Generate real QR code
    const qrCodeDataUrl = await QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    
    // Create image element and load QR code
    const qrImage = new Image();
    qrImage.src = qrCodeDataUrl;
    
    return new Promise<void>((resolve) => {
      qrImage.onload = () => {
        // Draw white background with rounded corners
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.roundRect(x - 8, y - 8, size + 16, size + 16, 8);
        ctx.fill();
        
        // Draw subtle border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw QR code
        ctx.drawImage(qrImage, x, y, size, size);
        
        // Add label below QR code
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = 'bold 14px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 2;
        ctx.fillText('Connect', x + size / 2, y + size + 25);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        
        resolve();
      };
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Fallback to placeholder if QR generation fails
    addQRCodePlaceholder(ctx, url, x, y, size);
  }
}

function addQRCodePlaceholder(
  ctx: CanvasRenderingContext2D, 
  url: string, 
  x: number, 
  y: number, 
  size: number
) {
  // Draw white background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.roundRect(x - 8, y - 8, size + 16, size + 16, 8);
  ctx.fill();
  
  // Draw border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, size, size);
  
  // Add QR pattern placeholder
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if ((i + j) % 2 === 0) {
        ctx.fillRect(x + i * (size / 8), y + j * (size / 8), size / 8, size / 8);
      }
    }
  }
  
  // Add label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 2;
  ctx.fillText('Connect', x + size / 2, y + size + 25);
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
} 