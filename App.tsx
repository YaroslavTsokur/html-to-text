import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import { cleanHTML } from './services/sanitizer';

const App: React.FC = () => {
  const [currentHtml, setCurrentHtml] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const visualEditorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Synchronize visual editor when HTML state is updated via code editor or paste
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
    
    // Auto-clean if it's HTML from Word/Docs, otherwise use plain text
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

  const copyToClipboard = async () => {
    if (!currentHtml) return;
    try {
      await navigator.clipboard.writeText(currentHtml);
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

  const ToolButton = ({ icon, onClick, title, active = false }: { icon: React.ReactNode, onClick: () => void, title: string, active?: boolean }) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-slate-100 transition-colors flex items-center justify-center ${active ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
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
            {isCopied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy HTML
              </>
            )}
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
            <option value="BLOCKQUOTE">Quote</option>
          </select>
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 gap-0.5">
          <ToolButton title="Bold" onClick={() => execCommand('bold')} icon={<span className="font-black text-sm w-4 text-center">B</span>} />
          <ToolButton title="Italic" onClick={() => execCommand('italic')} icon={<span className="italic font-serif font-bold text-sm w-4 text-center">I</span>} />
          <ToolButton title="Underline" onClick={() => execCommand('underline')} icon={<span className="underline font-bold text-sm w-4 text-center">U</span>} />
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 gap-0.5">
          <ToolButton title="Align Left" onClick={() => execCommand('justifyLeft')} icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>} />
          <ToolButton title="Align Center" onClick={() => execCommand('justifyCenter')} icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>} />
          <ToolButton title="Align Right" onClick={() => execCommand('justifyRight')} icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>} />
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 gap-0.5">
          <ToolButton title="Bullet List" onClick={() => execCommand('insertUnorderedList')} icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>} />
          <ToolButton title="Numbered List" onClick={() => execCommand('insertOrderedList')} icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>} />
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 gap-0.5">
          <ToolButton title="Link" onClick={() => {
            const url = prompt('Enter URL:');
            if(url) execCommand('createLink', url);
          }} icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>} />
          <ToolButton title="Remove Formatting" onClick={() => execCommand('removeFormat')} icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><path d="m11 13 2 2m0-2-2 2"/></svg>} />
        </div>
      </div>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white">
        {/* Visual Editor Pane */}
        <div className="flex-1 flex flex-col border-r border-slate-200 min-w-0">
          <div className="bg-slate-50 px-4 py-1.5 border-b border-slate-200 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visual Input</span>
            <span className="text-[9px] text-slate-300 font-bold uppercase tracking-tight">Real-time Editing</span>
          </div>
          <div 
            ref={visualEditorRef}
            contentEditable
            onInput={handleVisualInput}
            onPaste={handlePaste}
            suppressContentEditableWarning
            className="flex-1 overflow-auto p-12 focus:outline-none visual-editor-container selection:bg-blue-100"
            data-placeholder="Paste your Word or Google Docs content here, or start typing..."
          />
        </div>

        {/* Code Editor Pane */}
        <div className="flex-1 flex flex-col bg-slate-900 min-w-0">
          <div className="bg-slate-800 px-4 py-1.5 border-b border-slate-700 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">HTML Output</span>
            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tight">Tabbed & Cleaned Code</span>
          </div>
          <textarea
            value={currentHtml}
            onChange={handleCodeChange}
            spellCheck={false}
            className="flex-1 p-8 code-font text-xs sm:text-sm bg-transparent text-slate-300 resize-none outline-none leading-relaxed focus:ring-0 placeholder-slate-700"
            placeholder="Cleaned HTML source code will appear here..."
          />
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
          Rich Text Toolbar Enabled
        </div>
      </footer>
    </div>
  );
};

export default App;