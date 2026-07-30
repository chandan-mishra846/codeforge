import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ContestDTO, ContestProblemDTO, ContestLeaderboardEntry } from '../types';
import { ProblemDetails } from './ProblemDetails';
import { CodeEditor } from './CodeEditor';
import { ExecutionConsole } from './ExecutionConsole';
import { useRCEEngine } from '../hooks/useRCEEngine';
import { Trophy, Clock, CheckCircle2, ArrowLeft, Lock, Zap } from 'lucide-react';

interface ContestViewPageProps {
  contestSlug: string;
  token: string | null;
  user: any;
  onBackToList: () => void;
}

export const ContestViewPage: React.FC<ContestViewPageProps> = ({
  contestSlug,
  token,
  user,
  onBackToList,
}) => {
  const [contest, setContest] = useState<ContestDTO | null>(null);
  const [activeTab, setActiveTab] = useState<'problems' | 'leaderboard'>('problems');
  const [leaderboard, setLeaderboard] = useState<ContestLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Restore Problem Index from URL or LocalStorage on Page Refresh
  const getInitialProblemIndex = () => {
    const params = new URLSearchParams(window.location.search);
    const probParam = params.get('problem');
    if (probParam !== null && !isNaN(Number(probParam))) {
      return Number(probParam);
    }
    const saved = localStorage.getItem(`codeforge_contest_${contestSlug}_problem`);
    return saved ? Number(saved) : 0;
  };

  const [selectedProblemIndex, setSelectedProblemIndex] = useState<number>(getInitialProblemIndex());

  // Server Time Offset Calculation for Tamper-Proof Timer
  const serverTimeOffsetRef = useRef<number>(0);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(0);

  // RCE Engine Hook for problem execution
  const rce = useRCEEngine();

  // Sync problem index to URL and localStorage
  const handleSelectProblem = (idx: number) => {
    setSelectedProblemIndex(idx);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'contests');
    params.set('contest', contestSlug);
    params.set('problem', idx.toString());
    localStorage.setItem(`codeforge_contest_${contestSlug}_problem`, idx.toString());
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  };

  // Fetch Contest Details & Problem list
  const fetchContestDetails = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const url = user?.id
        ? `http://localhost:4000/api/v1/contests/${contestSlug}?userId=${user.id}`
        : `http://localhost:4000/api/v1/contests/${contestSlug}`;

      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch contest details.');

      setContest(data.contest);

      // Server time offset calculation
      if (data.serverTime) {
        const sTime = new Date(data.serverTime).getTime();
        serverTimeOffsetRef.current = sTime - Date.now();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error connecting to server.');
    } finally {
      setIsLoading(false);
    }
  }, [contestSlug, user?.id]);

  // Fetch Leaderboard
  const fetchLeaderboard = useCallback(async () => {
    if (!contest) return;
    try {
      const res = await fetch(`http://localhost:4000/api/v1/contests/${contest.id}/leaderboard`);
      const data = await res.json();
      if (data.success && data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    } catch {
      console.warn('Failed to fetch leaderboard');
    }
  }, [contest?.id]);

  useEffect(() => {
    fetchContestDetails();
  }, [fetchContestDetails]);

  useEffect(() => {
    if (contest) {
      fetchLeaderboard();
    }
  }, [contest, fetchLeaderboard]);

  // Real-Time WebSocket Listener for Instant Leaderboard Updates
  useEffect(() => {
    if (!contest) return;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`ws://localhost:4001?userId=${user?.id || 'guest'}&contestId=${contest.id}`);

      ws.onopen = () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'SUBSCRIBE_CONTEST', contestId: contest.id }));
        }
      };

      ws.onmessage = (_msg) => {
        // Instant update on any contest activity
        fetchLeaderboard();
      };
    } catch (wsErr) {
      console.warn('[WebSocket Contest Gateway] Notice:', wsErr);
    }

    // Fallback polling interval every 15 seconds
    const interval = setInterval(fetchLeaderboard, 15000);

    return () => {
      if (ws) ws.close();
      clearInterval(interval);
    };
  }, [contest?.id, user?.id, fetchLeaderboard]);

  // Sync selected problem into RCE engine hook
  useEffect(() => {
    if (contest?.problems && contest.problems[selectedProblemIndex]?.problem) {
      const currentProb = contest.problems[selectedProblemIndex].problem!;
      rce.setSelectedProblem(currentProb);
    }
  }, [contest, selectedProblemIndex]);

  // Server-Synced Tamper-Proof Countdown Timer
  useEffect(() => {
    if (!contest) return;

    const calculateRemaining = () => {
      const currentServerTime = Date.now() + serverTimeOffsetRef.current;
      const targetTime = new Date(contest.status === 'UPCOMING' ? contest.startTime : contest.endTime).getTime();
      const diffSecs = Math.max(0, Math.floor((targetTime - currentServerTime) / 1000));
      setTimeRemainingSeconds(diffSecs);
    };

    calculateRemaining();
    const timerInterval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(timerInterval);
  }, [contest]);

  // Format seconds to HH:MM:SS
  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return <div className="p-12 text-center text-sm text-slate-500 italic">Loading contest environment...</div>;
  }

  if (!contest) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="text-red-500 text-sm font-semibold">{errorMsg || 'Contest not found.'}</div>
        <button onClick={onBackToList} className="px-3 py-1 bg-slate-800 text-white rounded text-xs">
          Back to Contests
        </button>
      </div>
    );
  }

  const currentContestProblem = contest.problems?.[selectedProblemIndex];
  const isContestEnded = timeRemainingSeconds <= 0 && contest.status !== 'UPCOMING';

  return (
    <div className="max-w-[1920px] mx-auto p-3 space-y-3 font-sans">
      {/* Contest Top Banner Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-colors">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToList}
            className="p-1.5 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Back to Contests List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{contest.title}</h1>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                  isContestEnded || contest.status === 'ENDED'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    : contest.status === 'RUNNING'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                }`}
              >
                {isContestEnded ? 'ENDED' : contest.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Duration: {contest.durationMinutes} Minutes</p>
          </div>
        </div>

        {/* Live Countdown Timer & Tab Switcher */}
        <div className="flex items-center space-x-4">
          {/* Live Countdown Timer */}
          <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-slate-900 text-slate-100 dark:bg-slate-950 border border-slate-700 dark:border-slate-800 rounded shadow-sm">
            <Clock className="w-4 h-4 text-cyan-400" />
            <div className="text-xs font-mono">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider block">
                {contest.status === 'UPCOMING' ? 'Starts In' : 'Time Remaining'}
              </span>
              <span className="font-bold text-cyan-300 text-sm">{formatTimer(timeRemainingSeconds)}</span>
            </div>
          </div>

          {/* Sub-Tab Navigation */}
          <div className="flex border border-slate-200 dark:border-slate-800 rounded p-0.5 bg-slate-50 dark:bg-slate-950 text-xs font-medium">
            <button
              onClick={() => setActiveTab('problems')}
              className={`px-3 py-1 rounded transition ${
                activeTab === 'problems'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Problems List
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center space-x-1 px-3 py-1 rounded transition ${
                activeTab === 'leaderboard'
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Real-Time Leaderboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Contest Problems View */}
      {activeTab === 'problems' && (
        <div className="flex flex-col md:flex-row gap-3 h-[calc(100vh-140px)] min-h-[500px]">
          {/* Left Sub-Sidebar: Contest Problems Navigation List */}
          <div className="w-full md:w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm flex flex-col space-y-2 overflow-y-auto flex-shrink-0 transition-colors">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
              Contest Problems ({contest.problems?.length || 0})
            </h3>

            <div className="space-y-1.5 flex-1">
              {contest.problems?.map((cp, idx) => {
                const isSelected = selectedProblemIndex === idx;
                return (
                  <button
                    key={cp.id}
                    onClick={() => handleSelectProblem(idx)}
                    className={`w-full flex items-center justify-between p-2.5 rounded text-left transition ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/70 border border-blue-400 dark:border-blue-700 text-blue-900 dark:text-blue-100 font-bold'
                        : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="w-5 h-5 flex items-center justify-center bg-slate-800 text-white font-bold rounded text-xs flex-shrink-0">
                        {cp.problemLabel}
                      </span>
                      <span className="text-xs truncate">{cp.problem?.title || `Problem ${cp.problemLabel}`}</span>
                    </div>

                    {cp.solved ? (
                      <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-[10px]">Solved</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">{cp.points} pts</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Submission Lock Banner on Contest End */}
            {isContestEnded && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-xs flex items-center space-x-1.5 font-semibold">
                <Lock className="w-4 h-4 flex-shrink-0" />
                <span>Contest Ended. Submissions Locked.</span>
              </div>
            )}
          </div>

          {/* Right Area: Interactive Editor Environment */}
          <div className="flex-1 flex gap-2 h-full overflow-hidden">
            {/* Window 1: Problem Statement */}
            <div className="w-1/3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm overflow-hidden flex flex-col transition-colors">
              <ProblemDetails
                problems={[]}
                selectedProblem={rce.selectedProblem}
                onSelectProblem={() => {}}
              />
            </div>

            {/* Window 2 & 3: Code Editor & Console */}
            <div className="w-2/3 flex flex-col gap-2 h-full">
              <div className="h-[60%] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-2 flex flex-col overflow-hidden transition-colors">
                <CodeEditor
                  language={rce.language}
                  setLanguage={rce.setLanguage}
                  code={rce.code}
                  setCode={rce.setCode}
                  onRun={rce.runCode}
                  onSubmit={() => {
                    if (isContestEnded) {
                      alert('Contest has ended. Submissions are now locked.');
                      return;
                    }
                    rce.submitCode();
                  }}
                  isRunning={rce.isRunningCode}
                  isSubmitting={rce.isSubmittingCode}
                  rateLimitError={rce.rateLimitError}
                />
              </div>

              <div className="h-[40%] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-2 flex flex-col overflow-hidden transition-colors">
                <ExecutionConsole
                  status={rce.status}
                  sampleRunResult={rce.sampleRunResult}
                  submissionProgress={rce.submissionProgress}
                  result={rce.executionResult}
                  cacheHitNotice={rce.cacheHitNotice}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Real-time Contest Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden transition-colors space-y-4 p-5">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>Real-Time Contest Leaderboard</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Updates live via WebSockets whenever participants submit solutions.
              </p>
            </div>

            <button
              onClick={fetchLeaderboard}
              className="px-3 py-1 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 text-xs font-semibold rounded hover:bg-purple-100 transition"
            >
              Refresh Rank
            </button>
          </div>

          <div className="overflow-x-auto">
            {leaderboard.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 italic">No participant scores recorded yet.</div>
            ) : (
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Rank</th>
                    <th className="p-3">Participant</th>
                    <th className="p-3">Problems Solved</th>
                    <th className="p-3">Total Score</th>
                    <th className="p-3">Penalty Time</th>
                    <th className="p-3 text-right">Submissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {leaderboard.map((entry) => (
                    <tr key={entry.userId} className="hover:bg-slate-50 dark:hover:bg-slate-950/50 transition">
                      <td className="p-3 font-bold font-mono">
                        {entry.rank === 1 ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded font-bold">
                            🥇 Rank 1
                          </span>
                        ) : entry.rank === 2 ? (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 rounded font-bold">
                            🥈 Rank 2
                          </span>
                        ) : entry.rank === 3 ? (
                          <span className="px-2 py-0.5 bg-amber-900/30 text-amber-600 rounded font-bold">
                            🥉 Rank 3
                          </span>
                        ) : (
                          `#${entry.rank}`
                        )}
                      </td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                        {entry.name || entry.username}
                        <span className="text-[10px] text-slate-400 font-mono ml-1.5">(@{entry.username})</span>
                      </td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">✓ {entry.problemsSolved} Solved</td>
                      <td className="p-3 font-bold font-mono text-blue-600 dark:text-blue-400">{entry.totalScore} pts</td>
                      <td className="p-3 font-mono text-slate-500">{entry.penaltySeconds}s</td>
                      <td className="p-3 text-right font-mono">{entry.submissionsCount} Attempts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
