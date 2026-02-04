const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'DIV', 'BLOCKQUOTE']);
const INLINE_TAGS = new Set(['STRONG', 'EM', 'B', 'I', 'U', 'A']);
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
  // Предварительная очистка
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
      // Сохраняем только значащие пробелы
      if (text.trim() === '' && text.includes('\n')) return null;
      return document.createTextNode(text);
    }

    // 2. Элементы
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      let tagName = el.tagName.toUpperCase();

      // Пропуск Word-специфичных тегов и скриптов
      if (tagName.startsWith('O:') || tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'XML') return null;

      // Удаляем SPAN сразу, возвращая только его обработанных детей
      if (tagName === 'SPAN') {
        const children: Node[] = [];
        el.childNodes.forEach(child => {
          const processed = processNode(child);
          if (Array.isArray(processed)) children.push(...processed);
          else if (processed) children.push(processed);
        });
        return children;
      }

      // Маппинг тегов (B -> STRONG и т.д.)
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

        // ЛОГИКА: Инлайны (STRONG, EM, A) не могут содержать блочные теги
        const containsBlock = children.some(c => c.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((c as HTMLElement).tagName));
        if (INLINE_TAGS.has(tagName) && containsBlock) {
          return children; // Разворачиваем инлайн (убираем strong/em/a), оставляя только содержимое
        }

        // Удаляем STRONG/EM внутри заголовков (H1-H6 уже стилизованы)
        if (tagName.match(/^H[1-6]$/)) {
            const cleanedChildren: Node[] = [];
            children.forEach(child => {
                if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName === 'STRONG') {
                    // Вытаскиваем текст из STRONG внутри заголовка
                    child.childNodes.forEach(c => cleanedChildren.push(c.cloneNode(true)));
                } else {
                    cleanedChildren.push(child);
                }
            });
            return createCleanElement(tagName, cleanedChildren, el);
        }

        return createCleanElement(tagName, children, el);
      } else {
        // Если тег не в списке разрешенных — просто вытаскиваем его детей наружу (unwrap)
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
    // Сохраняем только HREF для ссылок
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

  return formatHTML(container.innerHTML);
};

function formatHTML(html: string): string {
  return html
    .replace(/&nbsp;/g, ' ')
    .replace(/>\s+</g, '><') // Убираем лишние пробелы между тегами
    .replace(/(<br\s*\/?>){3,}/gi, '<br><br>') // Не более 2 BR подряд
    .replace(/<p>\s*<\/p>/gi, '') // Удаляем пустые параграфы
    .replace(/<strong>\s*<\/strong>/gi, '') // Удаляем пустые strong
    .replace(/<em>\s*<\/em>/gi, '') // Удаляем пустые em
    .trim();
}
