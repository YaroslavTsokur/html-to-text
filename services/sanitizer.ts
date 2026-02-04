
const ALLOWED_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 
  'UL', 'OL', 'LI', 
  'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 
  'STRONG', 'EM', 'B', 'I', 'U', 'BR', 'A'
]);

const TAG_MAP: Record<string, string> = {
  'B': 'STRONG',
  'I': 'EM',
  'DIV': 'P' // Often used in some editors as block wrappers
};

/**
 * Clean HTML string by removing all attributes and non-whitelisted tags.
 * Preserves the hierarchy and text content.
 */
export const cleanHTML = (rawHtml: string): string => {
  if (!rawHtml) return '';

  const parser = new DOMParser();
  // Remove comments before parsing to avoid Word's [if !supportLists] junk
  const noComments = rawHtml.replace(/<!--[\s\S]*?-->/g, '');
  const doc = parser.parseFromString(noComments, 'text/html');
  const body = doc.body;

  const processNode = (node: Node): Node | null => {
    // Handle Text Nodes
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || '');
    }

    // Handle Element Nodes
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      let tagName = el.tagName.toUpperCase();

      // Skip specific "junk" tags often found in Word
      if (tagName.startsWith('O:') || tagName === 'STYLE' || tagName === 'META' || tagName === 'LINK') {
        return null;
      }

      // Transform tags
      if (TAG_MAP[tagName]) {
        tagName = TAG_MAP[tagName];
      }

      // If tag is allowed
      if (ALLOWED_TAGS.has(tagName)) {
        const newEl = document.createElement(tagName);
        
        // Preserve ONLY href for anchors
        if (tagName === 'A' && el.hasAttribute('href')) {
          newEl.setAttribute('href', el.getAttribute('href') || '#');
        }
        
        // Recursively process children
        el.childNodes.forEach(child => {
          const processedChild = processNode(child);
          if (processedChild) newEl.appendChild(processedChild);
        });

        // Skip truly empty semantic tags
        const isBr = tagName === 'BR';
        const hasChildren = newEl.childNodes.length > 0;
        const hasText = (newEl.textContent || '').trim().length > 0;
        
        if (!isBr && !hasChildren && !hasText && !['TD', 'TH'].includes(tagName)) {
          return null;
        }

        return newEl;
      } else {
        // Unwrap tag: keep children but remove the container
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
  
  return formatHTML(container.innerHTML);
};

/**
 * Simple pretty-printer for HTML output
 */
function formatHTML(html: string): string {
  let formatted = '';
  let indent = 0;
  
  // Basic cleaning
  html = html
    .replace(/&nbsp;/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();

  const tags = html.split(/(?=<)|(?<=>)/);
  
  tags.forEach(tag => {
    if (tag.match(/^<\/\w/)) {
      // Closing tag
      indent--;
      formatted += '\n' + '  '.repeat(Math.max(0, indent)) + tag;
    } else if (tag.match(/^<\w[^>]*[^\/]>$/) && !tag.match(/<(br|hr|img|input)/i)) {
      // Opening tag (not self-closing)
      formatted += '\n' + '  '.repeat(Math.max(0, indent)) + tag;
      // Only indent if it's a block-level-like structure we want to see on new lines
      if (tag.match(/<(p|h\d|ul|ol|li|table|thead|tbody|tr|th|td)/i)) {
        indent++;
      }
    } else {
      // Text content or self-closing tag
      const content = tag.trim();
      if (content) {
        // If it's a long text node, don't necessarily indent, but wrap if part of a block
        formatted += content;
      }
    }
  });

  return formatted.trim();
}
