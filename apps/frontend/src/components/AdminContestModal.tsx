import React, { useState } from 'react';
import { Problem } from '../types';

interface AdminContestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  problems: Problem[];
}

export const AdminContestModal: React.FC<AdminContestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  problems,
}) => {
  const now = new Date();
  const defaultStart = new Date(now.getTime() + 5 * 60000).toISOString().slice(0, 16); // 5 mins from now
  const defaultEnd = new Date(now.getTime() + 125 * 60000).toISOString().slice(0, 16); // 2 hrs 5 mins from now

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'UNLISTED'>('PUBLIC');
  const [rules, setRules] = useState('1. No plagiarism allowed.\n2. Equal score breaks tie by penalty time.');
  const [selectedProblemIds, setSelectedProblemIds] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleProblemSelection = (id: string) => {
    if (selectedProblemIds.includes(id)) {
      setSelectedProblemIds(selectedProblemIds.filter((pId) => pId !== id));
    } else {
      setSelectedProblemIds([...selectedProblemIds, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !startTime || !endTime) {
      setErrorMsg('Title, Description, Start Time, and End Time are required.');
      return;
    }

    if (selectedProblemIds.length === 0) {
      setErrorMsg('Please select at least one problem for the contest.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const token = localStorage.getItem('codeforge_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch('http://localhost:4000/api/v1/admin/contests', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          durationMinutes,
          visibility,
          rules,
          problemIds: selectedProblemIds,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create contest.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error connecting to API Gateway');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl max-w-2xl w-full p-6 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto transition-colors">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create New Contest</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title & Slug */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Contest Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CodeForge Weekly Contest 1"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                URL Slug (Optional)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. codeforge-weekly-1"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Timestamps & Duration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Start Time *
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                End Time *
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Duration (Mins)
              </label>
              <input
                type="number"
                min="10"
                max="1440"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Visibility & Rules */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="PUBLIC">PUBLIC</option>
                <option value="PRIVATE">PRIVATE</option>
                <option value="UNLISTED">UNLISTED</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Rules & Guidelines
              </label>
              <textarea
                rows={2}
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Contest rules..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Contest Description *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contest summary and instructions..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Select Contest Problems (A, B, C...) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1.5">
              Select Contest Problems ({selectedProblemIds.length} selected)
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded">
              {problems.map((prob, idx) => {
                const isSelected = selectedProblemIds.includes(prob.id);
                const problemIndex = selectedProblemIds.indexOf(prob.id);
                const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                const assignedLabel = problemIndex >= 0 ? labels[problemIndex] || `P${problemIndex + 1}` : null;

                return (
                  <div
                    key={prob.id}
                    onClick={() => toggleProblemSelection(prob.id)}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer border transition text-xs ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-900 dark:text-blue-200 font-semibold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {assignedLabel && (
                        <span className="w-5 h-5 flex items-center justify-center bg-blue-600 text-white font-bold rounded text-[11px]">
                          {assignedLabel}
                        </span>
                      )}
                      <span>{prob.title}</span>
                      <span className="text-[10px] text-slate-400">({prob.difficulty || 'MEDIUM'})</span>
                    </div>

                    <span className="text-xs">
                      {isSelected ? '✓ Selected' : '+ Select'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow transition disabled:opacity-50"
            >
              {isSubmitting ? 'Publishing...' : 'Create Contest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
