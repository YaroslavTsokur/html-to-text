
import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import { cleanHTML } from './services/sanitizer';

const App: React.FC = () => {
  // Each window/tab has its own local state. No localStorage or shared database.
  const [currentHtml, setCurrentHtml] = useState('');
  const visualEditorRef = useRef<HTMLDivElement>(null);
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);
  
  // Track synchronization to avoid infinite loops and cursor jumps
  const skipSync = useRef(false);

  // Sync Visual Editor when Code changes (Bi-directional part 1)
  useEffect(() => {
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    if (visualEditorRef.current && visualEditorRef.current.innerHTML !== currentHtml) {
      visualEditorRef.current.innerHTML = currentHtml;
    }
  }, [currentHtml]);

  // Handler for Visual Editor input (typing/deleting) (Bi-directional part 2)
  const handleVisualInput = () => {
    if (visualEditorRef.current) {
      const html = visualEditorRef.current.innerHTML;
      skipSync.current = true;
      setCurrentHtml(html);
    }
  };

  // Handler for Code Editor change
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentHtml(e.target.value);
  };

  // Force clean the current content
  const handleSanitize = () => {
    const sanitized = cleanHTML(currentHtml);
    setCurrentHtml(sanitized);
  };

  // Handle paste specifically to strip junk immediately
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
    const sanitized = cleanHTML(html);
    
    // Insert sanitized HTML at cursor position
    document.execCommand('insertHTML', false, sanitized);
    handleVisualInput();
  };

  const copyToClipboard = async () => {
    try {
      const blobHtml = new Blob([currentHtml], { type: 'text/html' });
      const blobText = new Blob([currentHtml], { type: 'text/plain' });
      const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })];
      await navigator.clipboard.write(data);
      alert("Successfully copied to clipboard!");
    } catch (err) {
      navigator.clipboard.writeText(currentHtml);
      alert("HTML Source copied!");
    }
  };

  const clearAll = () => {
    if (confirm("Reset current editor? This action only affects your current window.")) {
      setCurrentHtml('');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <Header />
      
      {/* Control Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSanitize}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
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
            className="px-4 py-1.5 text-slate-400 hover:text-red-500 text-sm font-bold transition-colors"
          >
            Clear Editor
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition-all border border-slate-200 shadow-sm active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Copy Everything
          </button>
        </div>
      </div>

      {/* Main Split Editor */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white">
        
        {/* Left Pane: Visual Editor */}
        <div className="flex-1 flex flex-col border-r border-slate-200 min-w-0">
          <div className="bg-slate-50 px-4 py-1 border-b border-slate-200 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visual Editor / Preview</span>
            <div className="flex gap-2">
              <span className="text-[9px] text-slate-300 font-bold uppercase">H1-H4 • Tables • Lists</span>
            </div>
          </div>
          <div 
            ref={visualEditorRef}
            contentEditable
            onInput={handleVisualInput}
            onPaste={handlePaste}
            suppressContentEditableWarning
            className="flex-1 overflow-auto p-12 focus:outline-none visual-editor-container selection:bg-blue-100"
            data-placeholder="Start typing or paste content here. All styles and attributes will be stripped automatically when you click 'Clean Markup'."
          />
        </div>

        {/* Right Pane: HTML Code Editor */}
        <div className="flex-1 flex flex-col bg-slate-900 min-w-0">
          <div className="bg-slate-800 px-4 py-1 border-b border-slate-700 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Clean HTML Source</span>
            <span className="text-[9px] text-slate-600 font-bold">RAW OUTPUT</span>
          </div>
          <textarea
            ref={codeEditorRef}
            value={currentHtml}
            onChange={handleCodeChange}
            spellCheck={false}
            autoComplete="off"
            className="flex-1 p-8 code-font text-sm bg-transparent text-slate-400 resize-none outline-none leading-relaxed focus:ring-0 placeholder-slate-700 selection:bg-slate-700"
            placeholder="Clean HTML appears here. Editing here updates the Visual Editor live."
          />
        </div>

      </main>

      {/* Footer Info */}
      <footer className="bg-white border-t border-slate-200 px-6 py-1.5 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            <span>Private Session</span>
          </div>
          <span>Mode: Semantic Only</span>
        </div>
        <div className="hidden sm:block">
          Data is stored only in your browser memory
        </div>
      </footer>
    </div>
  );
};

export default App;
