import React from 'react';
import { UserDTO } from '../types';
import { Sun, Moon, Trophy } from 'lucide-react';

interface NavbarProps {
  user: UserDTO | null;
  activeTab: 'problems' | 'contests' | 'profile' | 'admin';
  setActiveTab: (tab: 'problems' | 'contests' | 'profile' | 'admin') => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  theme,
  toggleTheme,
  onLogout,
}) => {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 px-5 py-2.5 flex items-center justify-between shadow-sm transition-colors">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight">CodeForge</span>
        </div>

        {/* Clean Industry Navigation Tabs */}
        {user && (
          <nav className="flex items-center space-x-1 text-sm font-medium">
            <button
              onClick={() => setActiveTab('problems')}
              className={`px-3 py-1.5 rounded transition ${
                activeTab === 'problems'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Problems
            </button>

            <button
              onClick={() => setActiveTab('contests')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded transition ${
                activeTab === 'contests'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Contests</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded transition ${
                activeTab === 'profile'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Profile & Stats
            </button>

            {user.role === 'ADMIN' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 rounded transition ${
                  activeTab === 'admin'
                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Admin Dashboard
              </button>
            )}
          </nav>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {/* Dark / Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {user && (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Hello,</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{user.name || user.username}</span>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                  user.role === 'ADMIN'
                    ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {user.role}
              </span>
            </div>

            <button
              onClick={onLogout}
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900 transition"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
