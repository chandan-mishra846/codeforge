import React from 'react';
import { AIFeedbackData } from '../types';
import { Sparkles, Brain, Cpu, CheckCircle } from 'lucide-react';

interface AIProfilingCardProps {
  feedback: AIFeedbackData | null;
  isProcessing: boolean;
}

export const AIProfilingCard: React.FC<AIProfilingCardProps> = ({ feedback, isProcessing }) => {
  return (
    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full space-y-3 shadow-sm">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider">AI Complexity Telemetry</span>
        </div>
        {feedback && (
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            Analyzed {new Date(feedback.analyzedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {!feedback && !isProcessing && (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 dark:text-slate-300 space-y-3 py-8 text-center px-2">
            <Brain className="w-10 h-10 text-purple-500 dark:text-purple-400" />
            <p className="text-xs leading-relaxed font-medium">
              Submit your code to trigger Big-O time and space complexity profiling via the LLM engine.
            </p>
          </div>
        )}

        {isProcessing && !feedback && (
          <div className="flex flex-col items-center justify-center h-full text-purple-600 dark:text-purple-400 space-y-3 py-8 text-center animate-pulse">
            <Sparkles className="w-8 h-8 animate-spin" />
            <p className="text-xs font-bold">Analyzing algorithmic structure & space/time bounds...</p>
          </div>
        )}

        {feedback && (
          <div className="space-y-4">
            {/* Big-O Badges */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 rounded-lg">
                <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300">Time Complexity</span>
                <div className="text-lg font-mono font-extrabold text-purple-900 dark:text-purple-200 mt-0.5">
                  {feedback.timeComplexity}
                </div>
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 rounded-lg">
                <span className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300">Space Complexity</span>
                <div className="text-lg font-mono font-extrabold text-indigo-900 dark:text-indigo-200 mt-0.5">
                  {feedback.spaceComplexity}
                </div>
              </div>
            </div>

            {/* Recommendations & Optimizations */}
            <div className="space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Cpu className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Algorithmic Optimization Tips</span>
              </div>

              <div className="space-y-2">
                {feedback.suggestions.map((suggestion, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex items-start space-x-2">
                    <CheckCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
