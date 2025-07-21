/**
 * Simple diff utility for generating HTML differences between two text strings
 */

interface DiffOptions {
  fromTitle?: string;
  toTitle?: string;
}

interface DiffLine {
  type: 'unchanged' | 'removed' | 'added';
  content: string;
  lineNumber?: number;
}

/**
 * Generate HTML diff between two text strings
 */
export function generateDiff(
  oldText: string, 
  newText: string, 
  options: DiffOptions = {}
): string {
  const { fromTitle = 'Original', toTitle = 'Updated' } = options;
  
  // Split texts into lines
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  // Generate diff lines
  const diffLines = calculateDiff(oldLines, newLines);
  
  // Generate HTML
  return generateDiffHtml(diffLines, fromTitle, toTitle);
}

/**
 * Calculate differences between old and new lines
 */
function calculateDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const diffLines: DiffLine[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    const oldLine = oldLines[oldIndex];
    const newLine = newLines[newIndex];
    
    if (oldIndex >= oldLines.length) {
      // Only new lines remaining
      diffLines.push({
        type: 'added',
        content: newLine,
        lineNumber: newIndex + 1
      });
      newIndex++;
    } else if (newIndex >= newLines.length) {
      // Only old lines remaining  
      diffLines.push({
        type: 'removed',
        content: oldLine,
        lineNumber: oldIndex + 1
      });
      oldIndex++;
    } else if (oldLine === newLine) {
      // Lines are identical
      diffLines.push({
        type: 'unchanged',
        content: oldLine,
        lineNumber: oldIndex + 1
      });
      oldIndex++;
      newIndex++;
    } else {
      // Lines are different - look ahead to see if we can find matching lines
      const oldInNew = newLines.slice(newIndex + 1, newIndex + 5).indexOf(oldLine);
      const newInOld = oldLines.slice(oldIndex + 1, oldIndex + 5).indexOf(newLine);
      
      if (oldInNew >= 0 && (newInOld < 0 || oldInNew <= newInOld)) {
        // Old line appears later in new - treat intermediate new lines as additions
        for (let i = 0; i <= oldInNew; i++) {
          diffLines.push({
            type: 'added',
            content: newLines[newIndex + i],
            lineNumber: newIndex + i + 1
          });
        }
        newIndex += oldInNew + 1;
      } else if (newInOld >= 0) {
        // New line appears later in old - treat intermediate old lines as removals
        for (let i = 0; i <= newInOld; i++) {
          diffLines.push({
            type: 'removed',
            content: oldLines[oldIndex + i],
            lineNumber: oldIndex + i + 1
          });
        }
        oldIndex += newInOld + 1;
      } else {
        // Lines are different and no matches found nearby
        diffLines.push({
          type: 'removed',
          content: oldLine,
          lineNumber: oldIndex + 1
        });
        diffLines.push({
          type: 'added',
          content: newLine,
          lineNumber: newIndex + 1
        });
        oldIndex++;
        newIndex++;
      }
    }
  }
  
  return diffLines;
}

/**
 * Generate HTML from diff lines
 */
function generateDiffHtml(diffLines: DiffLine[], fromTitle: string, toTitle: string): string {
  const styles = `
    <style>
      .diff-header {
        display: flex;
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-bottom: none;
        font-weight: bold;
        font-size: 14px;
      }
      .diff-header-from {
        flex: 1;
        padding: 8px 12px;
        background: #fff5f5;
        border-right: 1px solid #e9ecef;
      }
      .diff-header-to {
        flex: 1;
        padding: 8px 12px;
        background: #f0fff4;
      }
      .diff-container {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 13px;
        line-height: 1.4;
        border: 1px solid #e9ecef;
        max-height: 500px;
        overflow: auto;
      }
      .diff-line {
        display: flex;
        margin: 0;
        padding: 0;
        border-bottom: 1px solid #f1f3f4;
      }
      .diff-line-number {
        width: 50px;
        padding: 2px 8px;
        text-align: right;
        color: #666;
        background: #f8f9fa;
        border-right: 1px solid #e9ecef;
        user-select: none;
        flex-shrink: 0;
      }
      .diff-line-content {
        flex: 1;
        padding: 2px 8px;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .diff-line.unchanged {
        background: white;
      }
      .diff-line.removed {
        background: #ffeef0;
      }
      .diff-line.removed .diff-line-content {
        color: #d73a49;
      }
      .diff-line.added {
        background: #e6ffed;
      }
      .diff-line.added .diff-line-content {
        color: #28a745;
      }
      .diff-line.removed .diff-line-content::before {
        content: '- ';
        font-weight: bold;
      }
      .diff-line.added .diff-line-content::before {
        content: '+ ';
        font-weight: bold;
      }
    </style>
  `;
  
  const header = `
    <div class="diff-header">
      <div class="diff-header-from">${escapeHtml(fromTitle)}</div>
      <div class="diff-header-to">${escapeHtml(toTitle)}</div>
    </div>
  `;
  
  const lines = diffLines.map(line => {
    const lineNumber = line.lineNumber || '';
    const content = escapeHtml(line.content || '');
    
    return `
      <div class="diff-line ${line.type}">
        <div class="diff-line-number">${lineNumber}</div>
        <div class="diff-line-content">${content}</div>
      </div>
    `;
  }).join('');
  
  return `
    ${styles}
    ${header}
    <div class="diff-container">
      ${lines}
    </div>
  `;
}

/**
 * Escape HTML characters (works in both browser and Node.js)
 */
function escapeHtml(text: string): string {
  if (typeof document !== 'undefined') {
    // Browser environment
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  } else {
    // Node.js environment
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
} 