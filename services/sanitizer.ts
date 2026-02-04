const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'DIV']);
const INLINE_TAGS = new Set(['STRONG', 'EM', 'B', 'I', 'U', 'A', 'SPAN']);
const ALLOWED_TAGS = new Set([...BLOCK_TAGS, ...INLINE_TAGS, 'BR']);

const TAG_MAP: Record<string, string> = {
  'B': 'STRONG',
  'I': 'EM',
  'DIV': 'P'
};

/**
 * Очищает HTML от мусорных тегов и атрибутов, соблюдая семантику.
 */
export const cleanHTML = (rawHtml: string): string => {
  if (!rawHtml) return '';

  const parser = new DOMParser();
  // Очистка от Word-комментариев и специфических тегов перед парсингом
  const preCleaned = rawHtml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<meta[\s\S]*?>/gi, '')
    .replace(/<link[\s\S]*?>/gi, '');

  const doc = parser.parseFromString(preCleaned, 'text/html');
  const body = doc.body;

  const processNode = (node: Node): Node | Node[] | null => {
    // 1. Текстовые узлы
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      return text.trim() === '' && text.length > 0 ? document.createTextNode(' ') : document.createTextNode(text);
    }

    // 2. Элементы
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      let tagName = el.tagName.toUpperCase();

      // Пропуск мусора
      if (tagName.startsWith('O:') || tagName === 'SCRIPT' || tagName === 'STYLE') return null;

      // Маппинг тегов
      if (TAG_MAP[tagName]) tagName = TAG_MAP[tagName];

      if (ALLOWED_TAGS.has(tagName)) {
        const children: Node[] = [];
        el.childNodes.forEach(child => {
          const processed = processNode(child);
          if (Array.isArray(processed)) children.push(...processed);
          else if (processed) children.push(processed);
        });

        // Проверка на пустоту (кроме BR и ячеек таблиц)
        const hasVisibleContent = children.some(c => 
          (c.nodeType === Node.TEXT_NODE && c.textContent?.trim() !== '') || 
          (c.nodeType === Node.ELEMENT_NODE)
        );

        if (!hasVisibleContent && !['BR', 'TD', 'TH'].includes(tagName)) return null;

        // ЛОГИКА: Инлайны не могут содержать блоки
        const containsBlock = children.some(c => c.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((c as HTMLElement).tagName));
        if (INLINE_TAGS.has(tagName) && containsBlock) {
          return children; // Разворачиваем инлайн, оставляя только вложенные блоки
        }

        // Удаляем STRONG/EM внутри заголовков (они и так жирные/курсивные)
        if (tagName.match(/^H[1-6]$/) && children.length === 1) {
          const firstChild = children[0] as HTMLElement;
          if (firstChild.nodeType === Node.ELEMENT_NODE && ['STRONG', 'B'].includes(firstChild.tagName)) {
             return createCleanElement(tagName, Array.from(firstChild.childNodes).map(c => processNode(c)).flat().filter(Boolean) as Node[]);
          }
        }

        return createCleanElement(tagName, children, el);
      } else {
        // Если тег не разрешен — вытаскиваем детей наружу
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

  return formatHTML(container.innerHTML);
};

function formatHTML(html: string): string {
  return html
    .replace(/&nbsp;/g, ' ')
    .replace(/>\s+</g, '><') // Убираем пробелы между тегами для чистоты
    .replace(/(<br\s*\/?>){3,}/gi, '<br><br>') // Не более 2 BR подряд
    .replace(/<p><\/p>/gi, '') // Чистим пустые параграфы на выходе
    .trim();
}
