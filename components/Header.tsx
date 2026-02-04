
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 py-3 px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-slate-900 text-white p-2 rounded-xl shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-black tracking-tight text-slate-800 leading-none">PIXANA</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Clean HTML Utility</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:flex flex-col items-end mr-2">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter leading-none">Status</span>
          <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Standalone / Private</span>
        </div>
        <span className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-blue-100">Network Ready</span>
      </div>
    </header>
  );
};

export default Header;
