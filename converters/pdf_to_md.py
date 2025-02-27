#!/usr/bin/env python3

import os
import re
import pdfplumber
import argparse
from pathlib import Path

def clean_text(text):
    """Clean the extracted text by removing extra whitespace and fixing common issues."""
    if not text:
        return ""
    
    # Remove multiple spaces
    text = re.sub(r'\s+', ' ', text)
    
    # Fix line breaks that shouldn't be there
    text = re.sub(r'(\w) - (\w)', r'\1-\2', text)
    
    # Fix decimal points split by space
    text = re.sub(r'(\d) \. (\d)', r'\1.\2', text)
    
    return text.strip()

def extract_text_from_page(page):
    """Extract text from a page while maintaining some structure."""
    try:
        # Extract text with layout preservation
        text = page.extract_text()
        if not text:
            return ""
        return text
    except Exception as e:
        print(f"Error extracting text from page: {e}")
        return ""

def is_heading(line, prev_line=""):
    """Determine if a line is likely a heading based on content and context."""
    if not line:
        return False
        
    # Check for numbered headings (e.g., "1. Introduction")
    if re.match(r'^[A-Z\d]\.\s+[A-Z]', line):
        return True
        
    # Check for capitalized short lines that look like headings
    if (line.isupper() and len(line) < 100 and len(line) > 3):
        return True
        
    # Check for lines that end with colon and are relatively short
    if line.endswith(':') and len(line) < 60:
        return True
    
    # Common section headings
    heading_keywords = [
        'introduction', 'overview', 'background', 'purpose', 'scope', 
        'eligibility', 'requirements', 'criteria', 'evaluation', 'submission',
        'deadline', 'contact', 'appendix', 'reference'
    ]
    
    lower_line = line.lower()
    if any(keyword in lower_line and len(line) < 80 for keyword in heading_keywords):
        if prev_line and len(prev_line) > len(line) * 2:  # Heading usually shorter than surrounding text
            return True
    
    return False

def detect_list_item(line):
    """Detect if a line is a list item."""
    if not line:
        return False
        
    # Bullet points, numbers, or letters with parentheses
    return bool(re.match(r'^\s*(\•|\-|\*|\d+\.|\([a-zA-Z0-9]\)|\d+\))\s+', line))

def convert_pdf_to_markdown(pdf_path, output_path):
    """Convert a PDF file to Markdown format."""
    print(f"Converting {pdf_path} to {output_path}...")
    
    markdown_content = []
    current_section = []
    
    with pdfplumber.open(pdf_path) as pdf:
        previous_line = ""
        
        for i, page in enumerate(pdf.pages):
            try:
                page_text = extract_text_from_page(page)
                if not page_text:
                    continue
                
                # Process the page text line by line
                lines = page_text.split('\n')
                
                for line in lines:
                    clean_line = clean_text(line)
                    if not clean_line:
                        continue
                    
                    # Detect headings
                    if is_heading(clean_line, previous_line):
                        # If we have content in the current section, add it to markdown_content
                        if current_section:
                            markdown_content.append('\n'.join(current_section))
                            markdown_content.append('')  # Empty line
                            current_section = []
                        
                        # Add heading with appropriate markdown
                        heading_level = 2  # Default to H2
                        
                        # Check if it looks like a top-level heading
                        if clean_line.isupper() or re.match(r'^[IVX]+\.\s+', clean_line):
                            heading_level = 1
                        
                        markdown_content.append('#' * heading_level + ' ' + clean_line)
                        markdown_content.append('')  # Empty line after heading
                    
                    # Detect and format list items
                    elif detect_list_item(clean_line):
                        # If the previous line wasn't a list item, add a blank line
                        if current_section and not detect_list_item(previous_line):
                            current_section.append('')
                        
                        # Convert various bullet formats to markdown list
                        list_line = re.sub(r'^\s*(\•|\-|\*)\s+', '* ', clean_line)
                        list_line = re.sub(r'^\s*(\d+\.)\s+', '1. ', list_line)
                        list_line = re.sub(r'^\s*(\([a-zA-Z0-9]\)|\d+\))\s+', '* ', list_line)
                        
                        current_section.append(list_line)
                    else:
                        # Regular paragraph text
                        current_section.append(clean_line)
                    
                    previous_line = clean_line
                
                # Add a page break marker (optional)
                if i < len(pdf.pages) - 1:
                    current_section.append('\n<!-- Page Break -->\n')
            
            except Exception as e:
                print(f"Error processing page {i+1}: {e}")
    
    # Add any remaining content
    if current_section:
        markdown_content.append('\n'.join(current_section))
    
    # Write to the output file
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(markdown_content))
    
    print(f"Conversion completed. Markdown file saved to {output_path}")

def main():
    parser = argparse.ArgumentParser(description='Convert PDF to Markdown')
    parser.add_argument('pdf_path', help='Path to the PDF file')
    parser.add_argument('-o', '--output', help='Output Markdown file path')
    
    args = parser.parse_args()
    
    pdf_path = args.pdf_path
    
    if not args.output:
        # Generate output filename based on input
        output_path = os.path.splitext(pdf_path)[0] + '.md'
    else:
        output_path = args.output
    
    convert_pdf_to_markdown(pdf_path, output_path)

if __name__ == '__main__':
    main() 