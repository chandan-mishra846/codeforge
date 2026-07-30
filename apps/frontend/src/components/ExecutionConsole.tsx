import React from 'react';
import { ExecutionResultData, SampleRunResult, SubmissionProgressData, SubmissionStatus } from '../types';
import { Terminal, Clock, HardDrive, CheckCircle2, XCircle, Loader2, Zap } from 'lucide-react';

interface ExecutionConsoleProps {
  status: SubmissionStatus | 'IDLE';
  sampleRunResult: SampleRunResult | null;
  submissionProgress: SubmissionProgressData | null;
  result: ExecutionResultData | null;
  cacheHitNotice?: string | null;
}

export const ExecutionConsole: React.FC<ExecutionConsoleProps> = ({
  status,
  sampleRunResult,
  submissionProgress,
  result,
  cacheHitNotice,
}) => {
  return (
    <div className="flex flex-col h-full space-y-2">
      {/* Console Header & Status Badges */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
          <Terminal className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Live Execution Console</span>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-2">
          {(submissionProgress?.astCacheHit || cacheHitNotice) && (
            <span className="flex items-center space-x-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs rounded font-semibold">
              <Zap className="w-3 h-3 text-purple-600 dark:text-purple-400 fill-purple-400" />
              <span>Cache Hit</span>
            </span>
          )}

          {status === 'PENDING' && (
            <span className="flex items-center space-x-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs rounded font-semibold">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Evaluating...</span>
            </span>
          )}

          {status === 'RUNNING' && (
            <span className="flex items-center space-x-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs rounded font-semibold">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>
                {submissionProgress
                  ? `Testing ${submissionProgress.currentTestCaseIndex}/${submissionProgress.totalTestCases}...`
                  : 'Running...'}
              </span>
            </span>
          )}

          {status === 'ACCEPTED' && (
            <span className="flex items-center space-x-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              <span>Accepted</span>
            </span>
          )}

          {(status === 'WRONG_ANSWER' || status === 'FAILED') && (
            <span className="flex items-center space-x-1 px-2 py-0.5 bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded font-semibold">
              <XCircle className="w-3 h-3" />
              <span>Wrong Answer</span>
            </span>
          )}

          {status === 'TIME_LIMIT_EXCEEDED' && (
            <span className="flex items-center space-x-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs rounded font-semibold">
              <XCircle className="w-3 h-3" />
              <span>Time Limit Exceeded</span>
            </span>
          )}

          {status === 'COMPILATION_ERROR' && (
            <span className="flex items-center space-x-1 px-2 py-0.5 bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded font-semibold">
              <XCircle className="w-3 h-3" />
              <span>Compilation Error</span>
            </span>
          )}

          {status === 'RUNTIME_ERROR' && (
            <span className="flex items-center space-x-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs rounded font-semibold">
              <XCircle className="w-3 h-3" />
              <span>Runtime Error</span>
            </span>
          )}

          {status === 'IDLE' && (
            <span className="text-slate-500 dark:text-slate-400 text-xs font-mono">Idle</span>
          )}
        </div>
      </div>

      {/* Output Console Box */}
      <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded p-3 font-mono text-xs overflow-y-auto space-y-2 text-slate-900 dark:text-slate-100 transition-colors">
        {/* Cache Hit Notification Banner */}
        {cacheHitNotice && (
          <div className="p-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded text-purple-700 dark:text-purple-300 flex items-center space-x-2 font-sans font-semibold">
            <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 fill-purple-400" />
            <span>{cacheHitNotice}</span>
          </div>
        )}

        {!sampleRunResult && !submissionProgress && !result && !cacheHitNotice && status === 'IDLE' && (
          <div className="text-slate-500 dark:text-slate-400 italic">
            Click 'Run' to test sample test cases, or 'Submit' for full evaluation against hidden test cases.
          </div>
        )}

        {/* Live Submission Progress Bar */}
        {submissionProgress && (
          <div className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded space-y-1.5">
            <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 font-sans">
              <span className="font-semibold">Evaluating Test Cases</span>
              <span className="font-mono text-blue-600 dark:text-cyan-400 font-bold">
                Passed {submissionProgress.passCount} / {submissionProgress.totalTestCases}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-200 dark:border-slate-800">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{
                  width: `${Math.round(
                    (submissionProgress.currentTestCaseIndex / (submissionProgress.totalTestCases || 1)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Sample Run Code Results Diff View */}
        {sampleRunResult && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-sans border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-200">Sample Test Case Results</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  sampleRunResult.success
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}
              >
                {sampleRunResult.passCount} / {sampleRunResult.totalTestCases} Passed
              </span>
            </div>

            {sampleRunResult.testCaseResults.map((tc, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded border text-xs space-y-1 ${
                  tc.passed
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                    : 'bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-800/50'
                }`}
              >
                <div className="flex justify-between items-center font-sans">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Sample Case #{idx + 1}</span>
                  <span className={tc.passed ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'}>
                    {tc.passed ? '✓ PASSED' : `✕ ${tc.status}`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Input: </span>
                  <span className="text-slate-900 dark:text-slate-100 font-mono font-semibold">{tc.input}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Expected: </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold">{tc.expectedOutput}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Actual: </span>
                  <span className={tc.passed ? 'text-emerald-700 dark:text-emerald-300 font-mono font-semibold' : 'text-red-700 dark:text-red-300 font-mono font-semibold'}>
                    {tc.actualOutput || '(no output)'}
                  </span>
                </div>
                {tc.stderr && (
                  <div className="text-red-700 dark:text-red-400 text-[11px] pt-1">
                    <span className="text-slate-500 dark:text-slate-400">Error: </span>
                    {tc.stderr}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Final Execution Result View */}
        {result && (
          <>
            {result.stdout && (
              <div>
                <div className="text-slate-500 dark:text-slate-400 font-bold mb-0.5">[STDOUT]</div>
                <pre className="text-emerald-700 dark:text-emerald-400 font-semibold whitespace-pre-wrap">{result.stdout}</pre>
              </div>
            )}

            {result.stderr && (
              <div>
                <div className="text-slate-500 dark:text-slate-400 font-bold mb-0.5">[STDERR]</div>
                <pre className="text-red-700 dark:text-red-400 font-semibold whitespace-pre-wrap">{result.stderr}</pre>
              </div>
            )}

            {/* Performance Metrics */}
            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-6 text-slate-700 dark:text-slate-300 font-sans text-xs">
              <div className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-slate-500 dark:text-slate-400">Duration:</span>
                <span className="font-semibold text-blue-700 dark:text-blue-300">{result.metrics.timeMs} ms</span>
              </div>
              <div className="flex items-center space-x-1">
                <HardDrive className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-slate-500 dark:text-slate-400">Memory:</span>
                <span className="font-semibold text-blue-700 dark:text-blue-300">{(result.metrics.memoryKb / 1024).toFixed(2)} MB</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
