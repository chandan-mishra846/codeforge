import React from 'react';
import { Cpu, ShieldCheck, Zap } from 'lucide-react';

interface NavbarProps {
  userId: string;
}

export const Navbar: React.FC<NavbarProps> = ({ userId }) => {
  return (
    <header className="glass-panel sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between border-b border-slate-800">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-lg shadow-lg shadow-cyan-500/20">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            RCE Engine <span className="text-cyan-400 text-sm font-semibold">AI Profiler</span>
          </h1>
          <p className="text-xs text-slate-400">Distributed Event-Driven Sandboxed Execution</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <Zap className="w-3.5 h-3.5" />
          <span>Kafka Cluster Active</span>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1 bg-slate-800/80 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-300">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-400">User UUID:</span>
          <span className="text-cyan-300 font-semibold">{userId}</span>
        </div>
      </div>
    </header>
  );
};
