import React, { useEffect, useState, useCallback } from 'react';
import { ContestDTO } from '../types';
import { Trophy, Clock, Calendar, Users, CheckCircle2, ArrowRight } from 'lucide-react';

interface ContestsListPageProps {
  token: string | null;
  user: any;
  onOpenContest: (slug: string) => void;
}

export const ContestsListPage: React.FC<ContestsListPageProps> = ({
  token,
  user,
  onOpenContest,
}) => {
  const [contests, setContests] = useState<ContestDTO[]>([]);
  const [serverTime, setServerTime] = useState<string>(new Date().toISOString());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchContests = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const url = user?.id
        ? `http://localhost:4000/api/v1/contests?userId=${user.id}`
        : 'http://localhost:4000/api/v1/contests';

      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch contests.');

      setContests(data.contests || []);
      if (data.serverTime) setServerTime(data.serverTime);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error connecting to API Gateway.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  const handleRegister = async (contestId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) {
      alert('Please sign in to register for contests.');
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/api/v1/contests/${contestId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchContests();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to register');
      }
    } catch {
      alert('Error registering for contest');
    }
  };

  const runningContests = contests.filter((c) => c.status === 'RUNNING');
  const upcomingContests = contests.filter((c) => c.status === 'UPCOMING');
  const endedContests = contests.filter((c) => c.status === 'ENDED');

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Contest Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-900 dark:to-slate-900 border border-blue-500/30 text-white p-6 rounded-lg shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-amber-300" />
            <h1 className="text-xl font-bold tracking-tight">CodeForge Competitive Contests</h1>
          </div>
          <p className="text-xs text-blue-100 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
            Test your algorithmic skills in timed speed contests. Climb the live leaderboard, earn ranking points, and sharpen your problem-solving streak!
          </p>
        </div>
        <div className="text-right text-xs font-mono bg-white/10 dark:bg-black/30 border border-white/20 px-3 py-1.5 rounded">
          <span className="text-blue-200">Server Time: </span>
          <span className="font-bold text-white">{new Date(serverTime).toLocaleTimeString()}</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-sm text-slate-500 italic">Loading competitive contests...</div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Running Contests */}
          {runningContests.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Running Contests Now</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {runningContests.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onOpenContest(c.slug)}
                    className="bg-white dark:bg-slate-900 border-2 border-emerald-500/60 dark:border-emerald-500/40 hover:border-emerald-500 p-5 rounded-lg shadow-sm cursor-pointer transition flex flex-col justify-between space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded uppercase">
                          ● LIVE NOW
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">{c.title}</h3>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {c.durationMinutes} Mins
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{c.description}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center space-x-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.registeredCount || 0} Joined</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Ends {new Date(c.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenContest(c.slug);
                        }}
                        className="flex items-center space-x-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow text-xs transition"
                      >
                        <span>Enter Contest</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Upcoming Contests */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-bold text-sm uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>Upcoming Contests</span>
            </div>

            {upcomingContests.length === 0 ? (
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-500 italic">
                No upcoming contests scheduled at the moment. Stay tuned!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingContests.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onOpenContest(c.slug)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 p-5 rounded-lg shadow-sm cursor-pointer transition flex flex-col justify-between space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded uppercase">
                          UPCOMING
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">{c.title}</h3>
                      </div>
                      <span className="text-xs font-mono text-slate-500">{c.durationMinutes} Mins</span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{c.description}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Starts: </span>
                        <span className="font-mono text-blue-600 dark:text-blue-400">
                          {new Date(c.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {c.isRegistered ? (
                        <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Registered</span>
                        </span>
                      ) : (
                        <button
                          onClick={(e) => handleRegister(c.id, e)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow text-xs transition"
                        >
                          Register Now
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Past / Ended Contests */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 font-bold text-sm uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>Past Contests & Leaderboards</span>
            </div>

            {endedContests.length === 0 ? (
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-500 italic">
                No past contest archives recorded yet.
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="p-3.5">Contest Name</th>
                      <th className="p-3.5">Ended Date</th>
                      <th className="p-3.5">Duration</th>
                      <th className="p-3.5">Participants</th>
                      <th className="p-3.5 text-right">View Leaderboard</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-sans">
                    {endedContests.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/50 transition">
                        <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">{c.title}</td>
                        <td className="p-3.5 font-mono text-slate-500">
                          {new Date(c.endTime).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 font-mono">{c.durationMinutes} mins</td>
                        <td className="p-3.5 font-semibold text-slate-600 dark:text-slate-400">
                          {c.registeredCount || 0} Solvers
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => onOpenContest(c.slug)}
                            className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded border border-slate-300 dark:border-slate-700 text-xs transition"
                          >
                            Leaderboard
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
