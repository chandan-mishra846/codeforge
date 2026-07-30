import React, { useState } from 'react';
import { TestCaseDTO, STANDARD_TOPICS } from '../types';

interface AdminProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminProblemModal: React.FC<AdminProblemModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [constraints, setConstraints] = useState('1 <= n <= 10^5\n1 <= arr[i] <= 10^9');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [timeLimitMs, setTimeLimitMs] = useState(2000);
  const [memoryLimitMb, setMemoryLimitMb] = useState(256);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['Arrays', 'Hashing']);

  const [testCases, setTestCases] = useState<TestCaseDTO[]>([
    { input: '', expectedOutput: '', isHidden: false, explanation: 'Sample test case 1' },
    { input: '', expectedOutput: '', isHidden: true, explanation: 'Hidden test case 1' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleAddTestCase = (isHidden: boolean) => {
    setTestCases([
      ...testCases,
      { input: '', expectedOutput: '', isHidden, explanation: isHidden ? 'Hidden test case' : 'Sample test case' },
    ]);
  };

  const handleRemoveTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleTestCaseChange = (index: number, field: keyof TestCaseDTO, value: any) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      setErrorMsg('Title and Description are required.');
      return;
    }

    if (testCases.some((tc) => !tc.input.trim() || !tc.expectedOutput.trim())) {
      setErrorMsg('All test cases must have non-empty input and expected output.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const token = localStorage.getItem('codeforge_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch('http://localhost:4000/api/v1/admin/problems', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description,
          constraints,
          topics: selectedTopics,
          difficulty,
          timeLimitMs,
          memoryLimitMb,
          testCases,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create problem.');
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
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create New Problem</h2>
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
                Problem Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Two Sum"
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
                placeholder="e.g. two-sum"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Difficulty & Limits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Time Limit (ms)
              </label>
              <input
                type="number"
                min="100"
                max="10000"
                step="100"
                value={timeLimitMs}
                onChange={(e) => setTimeLimitMs(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Memory Limit (MB)
              </label>
              <input
                type="number"
                min="32"
                max="1024"
                step="32"
                value={memoryLimitMb}
                onChange={(e) => setMemoryLimitMb(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Description (Markdown) *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide problem statement..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Constraints */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Constraints (Multi-line)
            </label>
            <textarea
              rows={2}
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="e.g. 1 <= n <= 10^5&#10;1 <= arr[i] <= 10^9"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Topics Selector Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1.5">
              Assign Problem Topics ({selectedTopics.length} selected)
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded">
              {STANDARD_TOPICS.map((topic) => {
                const isSelected = selectedTopics.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => toggleTopic(topic)}
                    className={`px-2 py-0.5 text-xs rounded transition border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {isSelected ? `✓ ${topic}` : topic}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Test Cases */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                Test Cases ({testCases.length})
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleAddTestCase(false)}
                  className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold rounded hover:bg-emerald-100 transition"
                >
                  + Sample Case
                </button>
                <button
                  type="button"
                  onClick={() => handleAddTestCase(true)}
                  className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold rounded hover:bg-amber-100 transition"
                >
                  + Hidden Case
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {testCases.map((tc, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border text-xs ${
                    tc.isHidden
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                      : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-xs">
                      {tc.isHidden ? '🔒 Hidden Case' : '👁️ Sample Case'} #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTestCase(index)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase">Input (stdin)</span>
                      <textarea
                        rows={2}
                        value={tc.input}
                        onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                        placeholder="Input data"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase">Expected Output (stdout)</span>
                      <textarea
                        rows={2}
                        value={tc.expectedOutput}
                        onChange={(e) => handleTestCaseChange(index, 'expectedOutput', e.target.value)}
                        placeholder="Expected output data"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              ))}
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
              {isSubmitting ? 'Creating...' : 'Create Problem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
