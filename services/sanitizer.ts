const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'DIV', 'BLOCKQUOTE']);
const INLINE_TAGS = new Set(['STRONG', 'EM', 'B', 'I', 'U', 'A']);
const ALLOWED_TAGS = new Set([...BLOCK_TAGS, ...INLINE_TAGS, 'BR']);

const TAG_MAP: Record<string, string> = {
  'B': 'STRONG',
  'I': 'EM',
  'DIV': 'P'
};

/**
 * Форматирует HTML строку с правильными отступами
 */
const beautifyHTML = (html: string): string => {
  let formatted = '';
  let indent = '';
  const tab = '  '; // 2 пробела

  // Разбиваем на теги и текст
  const parts = html.split(/(<\/?[^>]+>)/g);

  parts.forEach((part) => {
    if (!part.trim()) return;

    if (part.match(/^<[^/]/)) {
      // Открывающий тег
      formatted += indent + part + '\n';
      // Если это не самозакрывающийся тег и не BR, увеличиваем отступ
      if (!part.match(/\/>/) && !part.match(/<br/i)) {
        indent += tab;
      }
    } else if (part.match(/^<\//)) {
      // Закрывающий тег
      indent = indent.substring(0, indent.length - tab.length);
      formatted += indent + part + '\n';
    } else {
      // Текст
      formatted += indent + part.trim() + '\n';
    }
  });

  return formatted.trim();
};

/**
 * Очищает HTML от мусорных тегов и атрибутов, соблюдая семантику.
 */
export const cleanHTML = (rawHtml: string): string => {
  if (!rawHtml) return '';

  const parser = new DOMParser();
  const preCleaned = rawHtml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<meta[\s\S]*?>/gi, '')
    .replace(/<link[\s\S]*?>/gi, '');

  const doc = parser.parseFromString(preCleaned, 'text/html');
  const body = doc.body;

  const processNode = (node: Node): Node | Node[] | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim() === '' && text.includes('\n')) return null;
      return document.createTextNode(text.replace(/\s+/g, ' ')); // Схлопываем лишние пробелы в тексте
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      let tagName = el.tagName.toUpperCase();

      if (tagName.startsWith('O:') || tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'XML') return null;

      if (tagName === 'SPAN') {
        const children: Node[] = [];
        el.childNodes.forEach(child => {
          const processed = processNode(child);
          if (Array.isArray(processed)) children.push(...processed);
          else if (processed) children.push(processed);
        });
        return children;
      }

      if (TAG_MAP[tagName]) tagName = TAG_MAP[tagName];

      if (ALLOWED_TAGS.has(tagName)) {
        const children: Node[] = [];
        el.childNodes.forEach(child => {
          const processed = processNode(child);
          if (Array.isArray(processed)) children.push(...processed);
          else if (processed) children.push(processed);
        });

        const hasVisibleContent = children.some(c => 
          (c.nodeType === Node.TEXT_NODE && c.textContent?.trim() !== '') || 
          (c.nodeType === Node.ELEMENT_NODE)
        );

        if (!hasVisibleContent && !['BR', 'TD', 'TH'].includes(tagName)) return null;

        const containsBlock = children.some(c => c.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((c as HTMLElement).tagName));
        if (INLINE_TAGS.has(tagName) && containsBlock) {
          return children;
        }

        if (tagName.match(/^H[1-6]$/)) {
            const cleanedChildren: Node[] = [];
            children.forEach(child => {
                if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName === 'STRONG') {
                    child.childNodes.forEach(c => cleanedChildren.push(c.cloneNode(true)));
                } else {
                    cleanedChildren.push(child);
                }
            });
            return createCleanElement(tagName, cleanedChildren, el);
        }

        return createCleanElement(tagName, children, el);
      } else {
        const children: Node[] = [];
        el.childNodes.forEach(child => {
          const processed = processNode(child);
          if (Array.isArray(processed)) children.push(...processed);
          else if (processed) children.push(processed);
        });
        return children;
      }
    }
    return null;
  };

  function createCleanElement(tag: string, children: Node[], originalEl?: HTMLElement): HTMLElement {
    const newEl = document.createElement(tag);
    if (tag === 'A' && originalEl?.hasAttribute('href')) {
      newEl.setAttribute('href', originalEl.getAttribute('href') || '#');
      newEl.setAttribute('target', '_blank');
      newEl.setAttribute('rel', 'noopener noreferrer');
    }
    children.forEach(child => newEl.appendChild(child));
    return newEl;
  }

  const resultFragment = document.createDocumentFragment();
  body.childNodes.forEach(child => {
    const processed = processNode(child);
    if (Array.isArray(processed)) processed.forEach(p => resultFragment.appendChild(p));
    else if (processed) resultFragment.appendChild(processed);
  });

  const container = document.createElement('div');
  container.appendChild(resultFragment);

  const cleanRawHtml = container.innerHTML
    .replace(/&nbsp;/g, ' ')
    .replace(/>\s+</g, '><') 
    .replace(/(<br\s*\/?>){3,}/gi, '<br><br>') 
    .replace(/<p>\s*<\/p>/gi, '') 
    .replace(/<strong>\s*<\/strong>/gi, '') 
    .replace(/<em>\s*<\/em>/gi, '')
    .trim();

  return beautifyHTML(cleanRawHtml);
};
