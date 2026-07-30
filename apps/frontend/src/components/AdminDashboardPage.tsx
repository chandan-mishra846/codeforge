import React, { useEffect, useState, useCallback } from 'react';
import { ProblemDTO, ContestDTO } from '../types';
import { UserManagementView } from './UserManagementView';
import { AdminContestModal } from './AdminContestModal';
import { BookOpen, Users, Trophy, Trash2, Plus } from 'lucide-react';

interface AdminDashboardPageProps {
  token: string;
  onOpenCreateModal: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ token, onOpenCreateModal }) => {
  const [adminTab, setAdminTab] = useState<'problems' | 'users' | 'contests'>('problems');

  const [problems, setProblems] = useState<ProblemDTO[]>([]);
  const [contests, setContests] = useState<ContestDTO[]>([]);
  const [isLoadingProblems, setIsLoadingProblems] = useState(true);
  const [isLoadingContests, setIsLoadingContests] = useState(true);
  const [isContestModalOpen, setIsContestModalOpen] = useState(false);

  const fetchAdminProblems = useCallback(() => {
    setIsLoadingProblems(true);
    fetch('http://localhost:4000/api/v1/admin/problems', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.problems) {
          setProblems(data.problems);
        }
      })
      .catch((err) => console.warn('Fetch admin problems error:', err))
      .finally(() => setIsLoadingProblems(false));
  }, [token]);

  const fetchAdminContests = useCallback(() => {
    setIsLoadingContests(true);
    fetch('http://localhost:4000/api/v1/contests')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.contests) {
          setContests(data.contests);
        }
      })
      .catch((err) => console.warn('Fetch admin contests error:', err))
      .finally(() => setIsLoadingContests(false));
  }, []);

  useEffect(() => {
    fetchAdminProblems();
    fetchAdminContests();
  }, [fetchAdminProblems, fetchAdminContests]);

  const handleDeleteProblem = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this problem?')) return;

    try {
      const res = await fetch(`http://localhost:4000/api/v1/admin/problems/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        fetchAdminProblems();
      } else {
        alert(data.error || 'Failed to delete problem.');
      }
    } catch {
      alert('Error deleting problem');
    }
  };

  const handleDeleteContest = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this contest?')) return;

    try {
      const res = await fetch(`http://localhost:4000/api/v1/admin/contests/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        fetchAdminContests();
      } else {
        alert(data.error || 'Failed to delete contest.');
      }
    } catch {
      alert('Error deleting contest');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-5">
      {/* Header & Sub-Tab Navigation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-lg shadow-sm transition-colors space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">CodeForge Admin Dashboard</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manage platform problems, user accounts, and competitive programming contests.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {adminTab === 'problems' && (
              <button
                onClick={onOpenCreateModal}
                className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2 rounded shadow transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Problem</span>
              </button>
            )}

            {adminTab === 'contests' && (
              <button
                onClick={() => setIsContestModalOpen(true)}
                className="flex items-center space-x-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-3.5 py-2 rounded shadow transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Contest</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 font-medium text-xs space-x-2">
          <button
            onClick={() => setAdminTab('problems')}
            className={`flex items-center space-x-1.5 py-2 px-3 border-b-2 transition ${
              adminTab === 'problems'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Problem Catalog ({problems.length})</span>
          </button>

          <button
            onClick={() => setAdminTab('users')}
            className={`flex items-center space-x-1.5 py-2 px-3 border-b-2 transition ${
              adminTab === 'users'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Management</span>
          </button>

          <button
            onClick={() => setAdminTab('contests')}
            className={`flex items-center space-x-1.5 py-2 px-3 border-b-2 transition ${
              adminTab === 'contests'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Contest Management ({contests.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Problem Catalog Management */}
      {adminTab === 'problems' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden transition-colors">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-100 text-sm">
            Problem Catalog ({problems.length})
          </div>

          {isLoadingProblems ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">Loading problems...</div>
          ) : problems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">No problems found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Topics</th>
                    <th className="px-6 py-3">Difficulty</th>
                    <th className="px-6 py-3">Time Limit</th>
                    <th className="px-6 py-3">Memory Limit</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-sans">
                  {problems.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-100">{p.title}</td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap gap-1">
                          {p.topics && p.topics.length > 0 ? (
                            p.topics.slice(0, 3).map((t, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] rounded border border-blue-200 dark:border-blue-900 font-semibold">
                                {t}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[10px]">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                            p.difficulty === 'EASY'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : p.difficulty === 'MEDIUM'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                          }`}
                        >
                          {p.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-mono">{p.timeLimitMs} ms</td>
                      <td className="px-6 py-3 font-mono">{p.memoryLimitMb} MB</td>
                      <td className="px-6 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleDeleteProblem(p.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Admin User Management */}
      {adminTab === 'users' && <UserManagementView token={token} />}

      {/* Tab 3: Contest Management */}
      {adminTab === 'contests' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden transition-colors">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-100 text-sm flex justify-between items-center">
            <span>Contest System Management ({contests.length})</span>
            <button
              onClick={() => setIsContestModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-3 py-1.5 rounded shadow transition"
            >
              + Add New Contest
            </button>
          </div>

          {isLoadingContests ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">Loading contests...</div>
          ) : contests.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">No contests created yet. Click '+ Add New Contest' to publish your first contest.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3">Contest Title</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Start Time</th>
                    <th className="px-6 py-3">End Time</th>
                    <th className="px-6 py-3">Duration</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-sans">
                  {contests.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        <div>{c.title}</div>
                        <div className="text-[10px] font-mono text-slate-400">/{c.slug}</div>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                            c.status === 'RUNNING'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : c.status === 'UPCOMING'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-mono text-[11px]">
                        {new Date(c.startTime).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 font-mono text-[11px]">
                        {new Date(c.endTime).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 font-mono">{c.durationMinutes} mins</td>
                      <td className="px-6 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleDeleteContest(c.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Contest Modal */}
      <AdminContestModal
        isOpen={isContestModalOpen}
        onClose={() => setIsContestModalOpen(false)}
        onSuccess={() => {
          fetchAdminContests();
        }}
        problems={problems}
      />
    </div>
  );
};
