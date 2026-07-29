import React from 'react';
import { Problem } from '../types';
import { BookOpen, FileText, AlertCircle } from 'lucide-react';

interface ProblemDetailsProps {
  problems: Problem[];
  selectedProblem: Problem | null;
  onSelectProblem: (problem: Problem) => void;
}

export const ProblemDetails: React.FC<ProblemDetailsProps> = ({
  problems,
  selectedProblem,
  onSelectProblem,
}) => {
  if (!selectedProblem) {
    return <div className="glass-panel p-6 rounded-xl">Loading problem...</div>;
  }

  return (
    <div className="glass-panel p-5 rounded-xl flex flex-col h-full space-y-4">
      {/* Problem Selector Dropdown */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2 text-cyan-400">
          <BookOpen className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Problem Statement</span>
        </div>
        <select
          value={selectedProblem.id}
          onChange={(e) => {
            const p = problems.find((item) => item.id === e.target.value);
            if (p) onSelectProblem(p);
          }}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 transition-colors"
        >
          {problems.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      {/* Problem Content */}
      <div className="space-y-3 overflow-y-auto flex-1 pr-1">
        <h2 className="text-xl font-bold text-white tracking-tight">{selectedProblem.title}</h2>
        
        <div className="flex items-start space-x-2 text-slate-300 text-sm leading-relaxed">
          <FileText className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
          <p>{selectedProblem.description}</p>
        </div>

        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">Constraints</h4>
            <p className="text-xs font-mono text-amber-200/90">{selectedProblem.constraints}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
