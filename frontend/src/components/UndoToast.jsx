import React, { useEffect, useState } from 'react';

export default function UndoToast({ message, onUndo, onDismiss, duration = 5000 }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start  = Date.now();
    const timer  = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct     = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
      if (pct === 0) clearInterval(timer);
    }, 50);
    const dismiss = setTimeout(onDismiss, duration);
    return () => { clearInterval(timer); clearTimeout(dismiss); };
  }, [duration, onDismiss]);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] animate-slideUp">
      <div className="bg-gray-900 text-white rounded-2xl shadow-2xl overflow-hidden min-w-72 max-w-sm">
        {/* Progress bar */}
        <div className="h-0.5 bg-gray-700 relative">
          <div className="h-full bg-blue-500 transition-none" style={{ width: `${progress}%` }}/>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🗑️</span>
            <span className="text-sm font-medium">{message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onUndo}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition-colors">
              Undo
            </button>
            <button onClick={onDismiss} className="text-gray-500 hover:text-gray-300 transition-colors">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity:0; transform: translateX(-50%) translateY(20px); }
          to   { opacity:1; transform: translateX(-50%) translateY(0); }
        }
        .animate-slideUp { animation: slideUp 200ms ease; }
      `}</style>
    </div>
  );
}
