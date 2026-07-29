import React from 'react';
import { ExecutionResultData } from '../types';
import { Terminal, Clock, HardDrive, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ExecutionConsoleProps {
  status: 'IDLE' | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';
  result: ExecutionResultData | null;
}

export const ExecutionConsole: React.FC<ExecutionConsoleProps> = ({ status, result }) => {
  return (
    <div className="glass-panel p-4 rounded-xl flex flex-col h-full space-y-3">
      {/* Console Header & Status Badges */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2 text-cyan-400">
          <Terminal className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Live Execution Console</span>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-2">
          {status === 'PENDING' && (
            <span className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-full">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Kafka Queued</span>
            </span>
          )}

          {status === 'RUNNING' && (
            <span className="flex items-center space-x-1.5 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs rounded-full">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Docker Executing...</span>
            </span>
          )}

          {status === 'COMPLETED' && (
            <span className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed</span>
            </span>
          )}

          {(status === 'FAILED' || status === 'TIMEOUT') && (
            <span className="flex items-center space-x-1.5 px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-full">
              <XCircle className="w-3.5 h-3.5" />
              <span>{status === 'TIMEOUT' ? 'Time Limit Exceeded' : 'Execution Error'}</span>
            </span>
          )}

          {status === 'IDLE' && (
            <span className="text-slate-500 text-xs font-mono">Idle - Submit Code</span>
          )}
        </div>
      </div>

      {/* Execution Output Console Box */}
      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs overflow-y-auto space-y-3">
        {!result && status === 'IDLE' && (
          <div className="text-slate-600 italic">Click 'Run Code' to execute inside ephemeral Docker sandbox.</div>
        )}

        {(status === 'PENDING' || status === 'RUNNING') && !result && (
          <div className="text-cyan-400 animate-pulse flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Transmitting binary payload to Kafka cluster 'code-submissions'...</span>
          </div>
        )}

        {result && (
          <>
            {result.stdout && (
              <div>
                <div className="text-slate-500 font-bold mb-1">[STDOUT Output]</div>
                <pre className="text-emerald-400 whitespace-pre-wrap">{result.stdout}</pre>
              </div>
            )}

            {result.stderr && (
              <div>
                <div className="text-slate-500 font-bold mb-1">[STDERR / Traceback]</div>
                <pre className="text-rose-400 whitespace-pre-wrap">{result.stderr}</pre>
              </div>
            )}

            {/* Performance Metrics Card */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center space-x-6 text-slate-300">
              <div className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-500">Duration:</span>
                <span className="font-semibold text-cyan-300">{result.metrics.timeMs} ms</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-500">Memory:</span>
                <span className="font-semibold text-cyan-300">{(result.metrics.memoryKb / 1024).toFixed(2)} MB</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
