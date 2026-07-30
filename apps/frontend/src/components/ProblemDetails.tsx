import React, { useState } from 'react';
import { Problem, STANDARD_TOPICS } from '../types';
import { BookOpen, FileText, AlertCircle, Tag, Filter } from 'lucide-react';

interface ProblemDetailsProps {
  problems: Problem[];
  selectedProblem: Problem | null;
  onSelectProblem: (problem: Problem) => void;
  selectedTopicFilter?: string;
  onSelectTopicFilter?: (topic: string) => void;
}

export const ProblemDetails: React.FC<ProblemDetailsProps> = ({
  problems,
  selectedProblem,
  onSelectProblem,
  selectedTopicFilter = 'ALL',
  onSelectTopicFilter,
}) => {
  const [topicFilter, setTopicFilter] = useState<string>(selectedTopicFilter);

  const handleTopicChange = (topic: string) => {
    setTopicFilter(topic);
    if (onSelectTopicFilter) {
      onSelectTopicFilter(topic);
    }
  };

  const filteredProblems = problems.filter((p) => {
    if (topicFilter === 'ALL') return true;
    return p.topics && p.topics.includes(topicFilter);
  });

  if (!selectedProblem) {
    return <div className="p-4 text-sm text-slate-500">Loading problem details...</div>;
  }

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Problem Selector & Topic Filter Toolbar */}
      <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Problem Statement</span>
          </div>

          {/* Topic Filter Dropdown */}
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={topicFilter}
              onChange={(e) => handleTopicChange(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded px-2 py-1 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="ALL">All Topics</option>
              {STANDARD_TOPICS.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Select Problem Dropdown */}
        <select
          value={selectedProblem.id}
          onChange={(e) => {
            const p = problems.find((item) => item.id === e.target.value);
            if (p) onSelectProblem(p);
          }}
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 transition-colors"
        >
          {filteredProblems.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} ({p.difficulty || 'MEDIUM'})
            </option>
          ))}
        </select>
      </div>

      {/* Problem Content View */}
      <div className="space-y-3.5 overflow-y-auto flex-1 pr-1">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">{selectedProblem.title}</h2>
          {selectedProblem.difficulty && (
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                selectedProblem.difficulty === 'EASY'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : selectedProblem.difficulty === 'MEDIUM'
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
              }`}
            >
              {selectedProblem.difficulty}
            </span>
          )}
        </div>

        {/* Topic Badges */}
        {selectedProblem.topics && selectedProblem.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            {selectedProblem.topics.map((t, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[11px] font-semibold rounded"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        <div className="flex items-start space-x-2 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
          <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <p className="whitespace-pre-wrap">{selectedProblem.description}</p>
        </div>

        {/* Constraints Section */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="w-full">
            <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1">Constraints</h4>
            {selectedProblem.constraints ? (
              <ul className="text-xs font-mono text-amber-900 dark:text-amber-200/90 space-y-0.5 list-disc list-inside">
                {selectedProblem.constraints.split('\n').map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            ) : (
              <ul className="text-xs font-mono text-amber-900 dark:text-amber-200/90 space-y-0.5 list-disc list-inside">
                <li>1 ≤ N ≤ 10^5</li>
                <li>-10^9 ≤ Value ≤ 10^9</li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
