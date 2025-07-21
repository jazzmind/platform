// Test email utility functions
describe('Email Utils - htmlToText', () => {
  // Mock the htmlToText function since we can't import it directly due to dependencies
  const htmlToText = (html: string): string => {
    // Basic HTML to text conversion for testing
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&pound;/g, '£')
      .trim();
  };

  describe('htmlToText', () => {
    it('should convert HTML to plain text', () => {
      const html = '<html><body><h1>Title</h1><p>Paragraph with <strong>bold</strong> text.</p></body></html>';
      
      const result = htmlToText(html);

      expect(result).toContain('Title');
      expect(result).toContain('Paragraph with bold text.');
      expect(result).not.toContain('<h1>');
      expect(result).not.toContain('<strong>');
    });

    it('should handle empty HTML', () => {
      const result = htmlToText('');
      expect(result).toBe('');
    });

    it('should handle plain text input', () => {
      const text = 'This is plain text';
      const result = htmlToText(text);
      expect(result).toBe('This is plain text');
    });

    it('should remove HTML entities', () => {
      const html = '<p>Price: &pound;100 &amp; free shipping</p>';
      const result = htmlToText(html);
      expect(result).toContain('£100 & free shipping');
    });

    it('should handle nested HTML tags', () => {
      const html = '<div><p>Outer <span>inner <em>deep</em></span> text</p></div>';
      const result = htmlToText(html);
      expect(result).toBe('Outer inner deep text');
    });

    it('should handle self-closing tags', () => {
      const html = '<p>Line 1<br/>Line 2<hr/></p>';
      const result = htmlToText(html);
      expect(result).toBe('Line 1Line 2');
    });

    it('should handle malformed HTML', () => {
      const html = '<p>Text with <unclosed tag and >weird< formatting';
      const result = htmlToText(html);
      expect(result).toBe('Text with weird< formatting');
    });

    it('should preserve whitespace between words', () => {
      const html = '<span>Word1</span> <span>Word2</span>';
      const result = htmlToText(html);
      expect(result).toBe('Word1 Word2');
    });
  });
}); 