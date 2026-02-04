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
      
      // Place cursor after pasted content
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

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <Header />
      
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
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

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white">
        {/* Visual Editor Pane */}
        <div className="flex-1 flex flex-col border-r border-slate-200 min-w-0">
          <div className="bg-slate-50 px-4 py-1.5 border-b border-slate-200 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visual Input</span>
            <span className="text-[9px] text-slate-300 font-bold uppercase tracking-tight">Paste Content Here</span>
          </div>
          <div 
            ref={visualEditorRef}
            contentEditable
            onInput={handleVisualInput}
            onPaste={handlePaste}
            suppressContentEditableWarning
            className="flex-1 overflow-auto p-12 focus:outline-none visual-editor-container selection:bg-blue-100"
            data-placeholder="Paste your Word or Google Docs content here..."
          />
        </div>

        {/* Code Editor Pane */}
        <div className="flex-1 flex flex-col bg-slate-900 min-w-0">
          <div className="bg-slate-800 px-4 py-1.5 border-b border-slate-700 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">HTML Output</span>
            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tight">Pure Semantic Code</span>
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
          Auto-Cleaning on Paste
        </div>
      </footer>
    </div>
  );
};

export default App;