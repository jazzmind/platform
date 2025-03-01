#!/bin/bash

# Convert SVG to PNG for presentation
# Requires Inkscape or another SVG converter

echo "Converting SVG files to PNG..."

# Check if Inkscape is installed
if command -v inkscape &>/dev/null; then
  echo "Using Inkscape for conversion"
  
  # Architecture diagram
  inkscape -w 800 -h 500 architecture.svg -o architecture.png
  
  # Notion documentation example
  inkscape -w 800 -h 600 notion-doc-example.svg -o notion-doc-example.png
  
  echo "Conversion complete!"
elif command -v convert &>/dev/null; then
  echo "Using ImageMagick for conversion"
  
  # Architecture diagram
  convert -density 150 architecture.svg architecture.png
  
  # Notion documentation example
  convert -density 150 notion-doc-example.svg notion-doc-example.png
  
  echo "Conversion complete!"
else
  echo "Error: Could not find Inkscape or ImageMagick's convert utility."
  echo "Please install one of these tools or manually convert the SVG files to PNG."
  exit 1
fi

# Make script executable
chmod +x convert-images.sh

echo "Images are now ready for the presentation!" 