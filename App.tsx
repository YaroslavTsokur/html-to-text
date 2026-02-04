
import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import { cleanHTML } from './services/sanitizer';

const App: React.FC = () => {
  const [currentHtml, setCurrentHtml] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const visualEditorRef = useRef<HTMLDivElement>(null);
  const skipSync = useRef(false);

  // Sync Visual Editor when state changes
  useEffect(() => {
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    if (visualEditorRef.current && visualEditorRef.current.innerHTML !== currentHtml) {
      visualEditorRef.current.innerHTML = currentHtml;
    }
  }, [currentHtml]);

  const handleVisualInput = () => {
    if (visualEditorRef.current) {
      const html = visualEditorRef.current.innerHTML;
      skipSync.current = true;
      setCurrentHtml(html);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentHtml(e.target.value);
  };

  const handleSanitize = () => {
    const sanitized = cleanHTML(currentHtml);
    setCurrentHtml(sanitized);
    // After cleaning, force update visual editor to match the sanitized state
    if (visualEditorRef.current) {
      visualEditorRef.current.innerHTML = sanitized;
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
    
    // Immediate cleaning on paste
    const sanitized = cleanHTML(html);
    
    // Insert into visual editor at cursor
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const div = document.createElement('div');
      div.innerHTML = sanitized;
      const frag = document.createDocumentFragment();
      while (div.firstChild) {
        frag.appendChild(div.firstChild);
      }
      range.insertNode(frag);
      
      // Move cursor to end of inserted content
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } else if (visualEditorRef.current) {
      visualEditorRef.current.innerHTML += sanitized;
    }
    
    handleVisualInput();
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentHtml);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const clearAll = () => {
    if (confirm("Clear all content?")) {
      setCurrentHtml('');
      if (visualEditorRef.current) visualEditorRef.current.innerHTML = '';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <Header />
      
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSanitize}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
            title="Clean formatting and attributes"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Clean Markup
          </button>
          <div className="h-4 w-px bg-slate-200 mx-2"></div>
          <button 
            onClick={clearAll}
            className="px-3 py-2 text-slate-400 hover:text-red-500 text-sm font-bold transition-colors"
          >
            Clear
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={copyToClipboard}
            className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-lg transition-all border shadow-sm active:scale-95 ${
              isCopied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy HTML
              </>
            )}
          </button>
        </div>
      </div>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white">
        {/* Left Pane: Visual Editor */}
        <div className="flex-1 flex flex-col border-r border-slate-200 min-w-0">
          <div className="bg-slate-50 px-4 py-1.5 border-b border-slate-200 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visual Editor / Document Preview</span>
            <span className="text-[9px] text-slate-300 font-bold">PASTE WORD/DOCS CONTENT HERE</span>
          </div>
          <div 
            ref={visualEditorRef}
            contentEditable
            onInput={handleVisualInput}
            onPaste={handlePaste}
            suppressContentEditableWarning
            className="flex-1 overflow-auto p-12 focus:outline-none visual-editor-container selection:bg-blue-100"
            data-placeholder="Paste your content here from Word or Google Docs..."
          />
        </div>

        {/* Right Pane: HTML Code Editor */}
        <div className="flex-1 flex flex-col bg-slate-900 min-w-0">
          <div className="bg-slate-800 px-4 py-1.5 border-b border-slate-700 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Clean HTML Source Code</span>
            <span className="text-[9px] text-slate-600 font-bold">READ-ONLY OUTPUT</span>
          </div>
          <textarea
            value={currentHtml}
            onChange={handleCodeChange}
            spellCheck={false}
            autoComplete="off"
            className="flex-1 p-8 code-font text-xs sm:text-sm bg-transparent text-slate-300 resize-none outline-none leading-relaxed focus:ring-0 placeholder-slate-700 selection:bg-slate-700"
            placeholder="Cleaned HTML will automatically appear here..."
          />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            <span>System: Active</span>
          </div>
          <span>Mode: Semantic Strict</span>
        </div>
        <div className="hidden sm:block">
          All processing is performed locally in your browser
        </div>
      </footer>
    </div>
  );
};

export default App;
