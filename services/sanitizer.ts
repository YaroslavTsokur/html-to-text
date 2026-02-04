
const ALLOWED_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 
  'UL', 'OL', 'LI', 
  'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 
  'STRONG', 'EM', 'B', 'I', 'U', 'BR'
]);

const TAG_MAP: Record<string, string> = {
  'B': 'STRONG',
  'I': 'EM'
};

/**
 * Clean HTML string by removing all attributes and non-whitelisted tags.
 * Preserves the hierarchy and text content.
 */
export const cleanHTML = (rawHtml: string): string => {
  if (!rawHtml) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  const body = doc.body;

  const processNode = (node: Node): Node | null => {
    // Handle Text Nodes
    if (node.nodeType === Node.TEXT_NODE) {
      // Clean up whitespace in text nodes but keep content
      return document.createTextNode(node.textContent || '');
    }

    // Handle Element Nodes
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      let tagName = el.tagName.toUpperCase();

      // Transform tags (e.g., B to STRONG)
      if (TAG_MAP[tagName]) {
        tagName = TAG_MAP[tagName];
      }

      // If tag is allowed
      if (ALLOWED_TAGS.has(tagName)) {
        // Create a fresh element with NO attributes
        const newEl = document.createElement(tagName);
        
        // Recursively process children
        el.childNodes.forEach(child => {
          const processedChild = processNode(child);
          if (processedChild) newEl.appendChild(processedChild);
        });

        // Skip truly empty semantic tags except for specific ones
        const isBr = tagName === 'BR';
        const isEmpty = newEl.childNodes.length === 0 && (newEl.textContent || '').trim() === '';
        
        if (!isBr && isEmpty && !['TD', 'TH'].includes(tagName)) {
          return null;
        }

        return newEl;
      } else {
        // If tag is not allowed, unwrap it: process its children and add them to a fragment
        const fragment = document.createDocumentFragment();
        el.childNodes.forEach(child => {
          const processedChild = processNode(child);
          if (processedChild) fragment.appendChild(processedChild);
        });
        return fragment;
      }
    }

    return null;
  };

  const finalFragment = document.createDocumentFragment();
  body.childNodes.forEach(child => {
    const processed = processNode(child);
    if (processed) finalFragment.appendChild(processed);
  });

  const container = document.createElement('div');
  container.appendChild(finalFragment);
  
  // Final cleanup and formatting
  return container.innerHTML
    .replace(/&nbsp;/g, ' ')
    // Ensure headings and structural blocks start on new lines for readability
    .replace(/><(P|H1|H2|H3|H4|H5|H6|UL|OL|TABLE|TR|LI)/gi, '>\n<$1')
    .trim();
};
