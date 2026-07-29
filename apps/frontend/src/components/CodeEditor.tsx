import React from 'react';
import { SupportedLanguage } from '../types';
import { Play, Code2, AlertTriangle } from 'lucide-react';

interface CodeEditorProps {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  code: string;
  setCode: (code: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  rateLimitError: string | null;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  language,
  setLanguage,
  code,
  setCode,
  onSubmit,
  isSubmitting,
  rateLimitError,
}) => {
  return (
    <div className="glass-panel p-4 rounded-xl flex flex-col h-full space-y-3">
      {/* Editor Controls Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2 text-cyan-400">
          <Code2 className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Solution Editor</span>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
            className="bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="python">Python 3.10</option>
            <option value="javascript">JavaScript (Node 20)</option>
            <option value="cpp">C++ 17 (GCC)</option>
            <option value="java">Java 17</option>
          </select>

          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs px-4 py-1.5 rounded-lg shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all duration-200"
          >
            <Play className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
            <span>{isSubmitting ? 'Queueing Submission...' : 'Run Code'}</span>
          </button>
        </div>
      </div>

      {/* Rate Limit Alert Banner */}
      {rateLimitError && (
        <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center space-x-2 text-rose-400 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{rateLimitError}</span>
        </div>
      )}

      {/* Code Textarea Area */}
      <div className="relative flex-1 rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="w-full h-full p-4 bg-transparent font-mono text-sm text-slate-200 focus:outline-none resize-none leading-relaxed"
          placeholder="// Write your solution here..."
        />
      </div>
    </div>
  );
};
