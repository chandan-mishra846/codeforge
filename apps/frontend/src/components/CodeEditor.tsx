import React from 'react';
import { SupportedLanguage } from '../types';
import { Play, Code2, AlertTriangle, Send } from 'lucide-react';

interface CodeEditorProps {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  code: string;
  setCode: (code: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  isRunning: boolean;
  isSubmitting: boolean;
  rateLimitError: string | null;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  language,
  setLanguage,
  code,
  setCode,
  onRun,
  onSubmit,
  isRunning,
  isSubmitting,
  rateLimitError,
}) => {
  return (
    <div className="flex flex-col h-full space-y-2">
      {/* Editor Controls Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
          <Code2 className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Solution Editor</span>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 rounded px-2.5 py-1 focus:outline-none focus:border-blue-500"
          >
            <option value="python">Python 3.10</option>
            <option value="javascript">JavaScript (Node 20)</option>
            <option value="cpp">C++ 17 (GCC)</option>
            <option value="java">Java 17</option>
          </select>

          {/* Run Code Button */}
          <button
            onClick={onRun}
            disabled={isRunning || isSubmitting}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-xs px-3 py-1 rounded transition disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Running...' : 'Run'}</span>
          </button>

          {/* Submit Code Button */}
          <button
            onClick={onSubmit}
            disabled={isRunning || isSubmitting}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-1 rounded shadow transition disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
            <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
          </button>
        </div>
      </div>

      {/* Rate Limit Alert Banner */}
      {rateLimitError && (
        <div className="p-2 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded flex items-center space-x-2 text-red-700 dark:text-red-300 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{rateLimitError}</span>
        </div>
      )}

      {/* Code Textarea Area */}
      <div className="relative flex-1 rounded overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 transition-colors">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="w-full h-full p-3 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none resize-none leading-relaxed transition-colors"
          placeholder="// Write your solution code here..."
        />
      </div>
    </div>
  );
};
