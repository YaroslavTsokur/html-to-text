import React, { useState, useRef, useEffect, useMemo } from 'react';
import Header from './components/Header';
import { cleanHTML } from './services/sanitizer';

type RightPanelMode = 'html' | 'seo';

interface SEOStats {
  title: string;
  description: string;
  wordCount: number;
  charCount: number;
  headings: { [key: string]: number };
  images: { total: number; missingAlt: number };
  links: number;
}

const App: React.FC = () => {
  const [currentHtml, setCurrentHtml] = useState('');
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('html');
  const [isCopied, setIsCopied] = useState(false);
  const visualEditorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Synchronize visual editor when HTML state is updated
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (visualEditorRef.current && visualEditorRef.current.innerHTML !== currentHtml) {
      visualEditorRef.current.innerHTML = currentHtml;
    }
  }, [currentHtml]);

  const syncStateFromVisual = () => {
    if (visualEditorRef.current) {
      const html = visualEditorRef.current.innerHTML;
      isInternalChange.current = true;
      setCurrentHtml(html);
    }
  };

  const handleVisualInput = () => {
    syncStateFromVisual();
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentHtml(e.target.value);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const htmlData = e.clipboardData.getData('text/html');
    const plainData = e.clipboardData.getData('text/plain');
    const content = htmlData ? cleanHTML(htmlData) : (plainData || '');
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const fragment = range.createContextualFragment(content);
      range.insertNode(fragment);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } else if (visualEditorRef.current) {
      visualEditorRef.current.innerHTML += content;
    }
    syncStateFromVisual();
  };

  // SEO Data Extraction
  const seoData = useMemo((): SEOStats => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(currentHtml, 'text/html');
    
    const h1 = doc.querySelector('h1')?.textContent || '';
    const firstP = doc.querySelector('p')?.textContent || '';
    const textContent = doc.body.textContent || '';
    
    const headings: { [key: string]: number } = { h1: 0, h2: 0, h3: 0, h4: 0 };
    doc.querySelectorAll('h1, h2, h3, h4').forEach(h => {
      headings[h.tagName.toLowerCase()]++;
    });

    const imgs = doc.querySelectorAll('img');
    let missingAlt = 0;
    imgs.forEach(img => { if (!img.hasAttribute('alt') || !img.getAttribute('alt')) missingAlt++; });

    return {
      title: h1,
      description: firstP.length > 160 ? firstP.substring(0, 157) + '...' : firstP,
      wordCount: textContent.split(/\s+/).filter(w => w.length > 0).length,
      charCount: textContent.length,
      headings,
      images: { total: imgs.length, missingAlt },
      links: doc.querySelectorAll('a').length
    };
  }, [currentHtml]);

  const copyToClipboard = async () => {
    if (!currentHtml) return;
    const textToCopy = rightPanelMode === 'html' ? currentHtml : JSON.stringify(seoData, null, 2);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  const handleClear = () => {
    if (currentHtml && confirm("Clear all content?")) {
      setCurrentHtml('');
      if (visualEditorRef.current) visualEditorRef.current.innerHTML = '';
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    syncStateFromVisual();
    visualEditorRef.current?.focus();
  };

  const ToolButton = ({ icon, onClick, title }: { icon: React.ReactNode, onClick: () => void, title: string }) => (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-slate-100 transition-colors flex items-center justify-center text-slate-500"
    >
      {icon}
    </button>
  );

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <Header />
      
      {/* Top Actions Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleClear}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 hover:text-red-500 transition-all active:scale-95 shadow-sm"
          >
            Clear Editor
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={copyToClipboard}
            disabled={!currentHtml}
            className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-lg transition-all border shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              isCopied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {isCopied ? 'Copied!' : `Copy ${rightPanelMode.toUpperCase()}`}
          </button>
        </div>
      </div>

      {/* Editor Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex items-center gap-4 flex-wrap z-10">
        <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 gap-0.5">
          <ToolButton title="Undo" onClick={() => execCommand('undo')} icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v.5" /></svg>} />
          <ToolButton title="Redo" onClick={() => execCommand('redo')} icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 14l5-5-5-5" /><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v.5" /></svg>} />
        </div>
        <div className="h-6 w-[1px] bg-slate-300 mx-1"></div>
        <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 gap-0.5">
          <select 
            onChange={(e) => execCommand('formatBlock', e.target.value)}
            className="text-xs font-bold bg-transparent px-2 py-1 outline-none text-slate-600 cursor-pointer"
            defaultValue="P"
          >
            <option value="P">Paragraph</option>
            <option value="H1">Heading 1</option>
            <option value="H2">Heading 2</option>
            <option value="H3">Heading 3</option>
            <option value="H4">Heading 4</option>
            <option value="BLOCKQUOTE">Quote</option>
          </select>
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 gap-0.5">
          <ToolButton title="Bold" onClick={() => execCommand('bold')} icon={<span className="font-black text-sm w-4 text-center">B</span>} />
          <ToolButton title="Italic" onClick={() => execCommand('italic')} icon={<span className="italic font-serif font-bold text-sm w-4 text-center">I</span>} />
          <ToolButton title="Underline" onClick={() => execCommand('underline')} icon={<span className="underline font-bold text-sm w-4 text-center">U</span>} />
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 gap-0.5">
          <ToolButton title="Bullet List" onClick={() => execCommand('insertUnorderedList')} icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>} />
          <ToolButton title="Numbered List" onClick={() => execCommand('insertOrderedList')} icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>} />
        </div>
      </div>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white">
        {/* Visual Editor Pane */}
        <div className="flex-1 flex flex-col border-r border-slate-200 min-w-0">
          <div className="bg-slate-50 px-4 py-1.5 border-b border-slate-200 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Editing</span>
          </div>
          <div 
            ref={visualEditorRef}
            contentEditable
            onInput={handleVisualInput}
            onPaste={handlePaste}
            suppressContentEditableWarning
            className="flex-1 overflow-auto p-12 focus:outline-none visual-editor-container selection:bg-blue-100"
            data-placeholder="Start typing or paste content..."
          />
        </div>

        {/* Right Panel (HTML / SEO) */}
        <div className="flex-1 flex flex-col bg-slate-900 min-w-0">
          <div className="bg-slate-800 border-b border-slate-700 flex">
            <button 
              onClick={() => setRightPanelMode('html')}
              className={`flex-1 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                rightPanelMode === 'html' ? 'text-white bg-slate-900 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              HTML Output
            </button>
            <button 
              onClick={() => setRightPanelMode('seo')}
              className={`flex-1 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                rightPanelMode === 'seo' ? 'text-white bg-slate-900 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              SEO Meta
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {rightPanelMode === 'html' ? (
              <textarea
                value={currentHtml}
                onChange={handleCodeChange}
                spellCheck={false}
                className="w-full h-full p-8 code-font text-xs sm:text-sm bg-transparent text-slate-300 resize-none outline-none leading-relaxed focus:ring-0 placeholder-slate-700"
                placeholder="Cleaned HTML will appear here..."
              />
            ) : (
              <div className="p-8 space-y-6 text-slate-300">
                {/* SEO View */}
                <section>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 block">Meta Title (H1)</label>
                  <div className={`p-3 rounded border ${seoData.title ? 'bg-slate-800 border-slate-700' : 'bg-red-900/20 border-red-900/40 text-red-400'}`}>
                    {seoData.title || 'H1 Missing!'}
                  </div>
                </section>

                <section>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 block">Meta Description (First P)</label>
                  <div className={`p-3 rounded border ${seoData.description ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-orange-900/20 border-orange-900/40 text-orange-400'}`}>
                    {seoData.description || 'Description Missing!'}
                  </div>
                </section>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                    <div className="text-2xl font-black text-white">{seoData.wordCount}</div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase mt-1">Words</div>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                    <div className="text-2xl font-black text-white">{seoData.charCount}</div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase mt-1">Chars</div>
                  </div>
                </div>

                <section className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3 block">Heading Structure</label>
                  <div className="flex justify-between items-center text-xs">
                    {Object.entries(seoData.headings).map(([tag, count]) => (
                      <div key={tag} className="flex flex-col items-center">
                        <span className={`font-black uppercase ${count === 0 ? 'text-slate-600' : 'text-blue-400'}`}>{tag}</span>
                        <span className="text-white font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Links</span>
                      <span className="text-white font-black">{seoData.links}</span>
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl border ${seoData.images.missingAlt > 0 ? 'bg-red-900/20 border-red-900/40' : 'bg-slate-800 border-slate-700'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Images</span>
                      <span className="text-white font-black">{seoData.images.total}</span>
                    </div>
                    {seoData.images.missingAlt > 0 && (
                      <div className="text-[8px] text-red-400 font-bold uppercase mt-1">
                        {seoData.images.missingAlt} missing alt
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            <span>Status: Operational</span>
          </div>
          <span>Mode: Semantic Purifier</span>
        </div>
        <div className="hidden sm:block">
          {rightPanelMode === 'html' ? 'HTML Output Mode' : 'SEO Analysis Mode'}
        </div>
      </footer>
    </div>
  );
};

export default App;