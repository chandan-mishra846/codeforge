import React, { useEffect, useState } from 'react';
import { UserDTO, SubmissionHistoryItem } from '../types';

interface UserProfilePageProps {
  user: UserDTO;
  token: string;
}

interface DetailedStats {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  currentStreak: number;
  longestStreak: number;
  totalSubmissions: number;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({ user, token }) => {
  const [history, setHistory] = useState<SubmissionHistoryItem[]>([]);
  const [stats, setStats] = useState<DetailedStats>({
    totalSolved: user.questionsSolved || 0,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0,
    currentStreak: user.currentStreak || 0,
    longestStreak: Math.max(user.currentStreak || 0, 1),
    totalSubmissions: 0,
  });

  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Fetch Fresh Detailed Stats from API Gateway
  useEffect(() => {
    setIsLoadingStats(true);
    fetch('http://localhost:4000/api/v1/auth/stats', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.stats) {
          setStats(data.stats);
        }
      })
      .catch((err) => console.warn('Fetch stats notice:', err))
      .finally(() => setIsLoadingStats(false));
  }, [token]);

  // Fetch Submission History
  useEffect(() => {
    setIsLoadingHistory(true);
    fetch('http://localhost:4000/api/v1/submissions/my', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.submissions) {
          setHistory(data.submissions);
        }
      })
      .catch((err) => console.warn('Fetch submission history notice:', err))
      .finally(() => setIsLoadingHistory(false));
  }, [token]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-5">
      {/* Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{user.name || user.username}</h1>
            <span
              className={`px-2.5 py-0.5 text-xs font-semibold rounded uppercase ${
                user.role === 'ADMIN'
                  ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                  : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              }`}
            >
              {user.role}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{user.email}</p>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Member since: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
        </div>
      </div>

      {/* Main Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm text-center transition-colors">
          <div className="text-3xl font-bold text-amber-500">{stats.currentStreak} 🔥</div>
          <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mt-1">Current Streak</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm text-center transition-colors">
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalSolved} 🎯</div>
          <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mt-1">Total Unique Solved</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm text-center transition-colors">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalSubmissions || history.length} 📝</div>
          <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mt-1">Total Submissions</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm text-center transition-colors">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.longestStreak} ⚡</div>
          <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mt-1">Longest Streak</div>
        </div>
      </div>

      {/* Difficulty Solved Breakdown Progress Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-3 transition-colors">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Difficulty Solved Breakdown
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Easy */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded space-y-1">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-emerald-600 dark:text-emerald-400 uppercase">Easy</span>
              <span className="font-mono text-slate-900 dark:text-slate-100">{stats.easySolved} Solved</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (stats.easySolved / Math.max(1, stats.totalSolved)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Medium */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded space-y-1">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-amber-600 dark:text-amber-400 uppercase">Medium</span>
              <span className="font-mono text-slate-900 dark:text-slate-100">{stats.mediumSolved} Solved</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (stats.mediumSolved / Math.max(1, stats.totalSolved)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Hard */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded space-y-1">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-red-600 dark:text-red-400 uppercase">Hard</span>
              <span className="font-mono text-slate-900 dark:text-slate-100">{stats.hardSolved} Solved</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-red-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (stats.hardSolved / Math.max(1, stats.totalSolved)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submission History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-100 text-sm">
          Recent Submission History
        </div>

        {isLoadingHistory ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">Loading submission history...</div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">No submissions recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Problem Title</th>
                  <th className="px-6 py-3">Language</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Test Cases</th>
                  <th className="px-6 py-3">Runtime</th>
                  <th className="px-6 py-3">Cache Hit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-6 py-3 font-sans text-slate-500 dark:text-slate-400">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 font-sans font-semibold text-slate-900 dark:text-slate-100">
                      {item.problemTitle}
                    </td>
                    <td className="px-6 py-3 uppercase">{item.language}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-0.5 rounded font-sans font-semibold text-[11px] ${
                          item.status === 'ACCEPTED'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : item.status === 'WRONG_ANSWER'
                            ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {item.passedCount} / {item.totalCount}
                    </td>
                    <td className="px-6 py-3">{item.maxRuntimeMs} ms</td>
                    <td className="px-6 py-3 font-sans">
                      {item.cacheHit ? (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded font-semibold text-[11px] border border-purple-200 dark:border-purple-800">
                          ⚡ Cache Hit
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
