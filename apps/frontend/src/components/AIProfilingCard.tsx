import React from 'react';
import { AIFeedbackData } from '../types';
import { Sparkles, Brain, Cpu, CheckCircle } from 'lucide-react';

interface AIProfilingCardProps {
  feedback: AIFeedbackData | null;
  isProcessing: boolean;
}

export const AIProfilingCard: React.FC<AIProfilingCardProps> = ({ feedback, isProcessing }) => {
  return (
    <div className="glass-panel p-4 rounded-xl flex flex-col h-full space-y-3">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2 text-purple-400">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider">AI Complexity Telemetry</span>
        </div>
        {feedback && (
          <span className="text-[10px] text-slate-500 font-mono">
            Analyzed {new Date(feedback.analyzedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {!feedback && !isProcessing && (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-2 py-8 text-center">
            <Brain className="w-8 h-8 opacity-40" />
            <p className="text-xs">Submit code to trigger asynchronous Big-O complexity profiling via LLM engine.</p>
          </div>
        )}

        {isProcessing && !feedback && (
          <div className="flex flex-col items-center justify-center h-full text-purple-400 space-y-2 py-8 text-center animate-pulse">
            <Sparkles className="w-6 h-6 animate-spin" />
            <p className="text-xs font-medium">Analyzing algorithmic structure & space/time bounds...</p>
          </div>
        )}

        {feedback && (
          <div className="space-y-4">
            {/* Big-O Badges */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <span className="text-[10px] font-bold uppercase text-purple-300">Time Complexity</span>
                <div className="text-lg font-mono font-extrabold text-purple-200 mt-0.5">
                  {feedback.timeComplexity}
                </div>
              </div>

              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                <span className="text-[10px] font-bold uppercase text-indigo-300">Space Complexity</span>
                <div className="text-lg font-mono font-extrabold text-indigo-200 mt-0.5">
                  {feedback.spaceComplexity}
                </div>
              </div>
            </div>

            {/* Recommendations & Optimizations */}
            <div className="space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-300">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>Algorithmic Optimization Tips</span>
              </div>

              <div className="space-y-2">
                {feedback.suggestions.map((suggestion, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-start space-x-2">
                    <CheckCircle className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-300 leading-relaxed">{suggestion}</p>
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
