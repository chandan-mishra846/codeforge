import React, { useState, useEffect, useRef } from 'react';
import { useRCEEngine } from './hooks/useRCEEngine';
import { Navbar } from './components/Navbar';
import { AuthPage } from './components/AuthPage';
import { UserProfilePage } from './components/UserProfilePage';
import { AdminDashboardPage } from './components/AdminDashboardPage';
import { ProblemDetails } from './components/ProblemDetails';
import { CodeEditor } from './components/CodeEditor';
import { ExecutionConsole } from './components/ExecutionConsole';
import { AIProfilingCard } from './components/AIProfilingCard';
import { AdminProblemModal } from './components/AdminProblemModal';
import { ContestsListPage } from './components/ContestsListPage';
import { ContestViewPage } from './components/ContestViewPage';

export function App() {
  const {
    token,
    user,
    theme,
    toggleTheme,
    problems,
    selectedProblem,
    setSelectedProblem,
    language,
    setLanguage,
    code,
    setCode,
    status,
    isRunningCode,
    isSubmittingCode,
    sampleRunResult,
    submissionProgress,
    executionResult,
    cacheHitNotice,
    aiFeedback,
    rateLimitError,
    runCode,
    submitCode,
    fetchProblems,
    handleAuthSuccess,
    handleLogout,
  } = useRCEEngine();

  // URL & LocalStorage State Persistence for Page Refreshes
  const getInitialState = () => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const contestParam = params.get('contest');

    const validTabs = ['problems', 'contests', 'profile', 'admin'];
    const initialTab = validTabs.includes(tabParam || '')
      ? (tabParam as 'problems' | 'contests' | 'profile' | 'admin')
      : (localStorage.getItem('codeforge_active_tab') as any) || (user?.role === 'ADMIN' ? 'admin' : 'problems');

    const initialContest = contestParam || localStorage.getItem('codeforge_contest_slug') || null;

    return { initialTab, initialContest };
  };

  const { initialTab, initialContest } = getInitialState();

  const [activeTab, setActiveTab] = useState<'problems' | 'contests' | 'profile' | 'admin'>(initialTab);
  const [selectedContestSlug, setSelectedContestSlug] = useState<string | null>(initialContest);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Sync state to URL & LocalStorage on every change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    localStorage.setItem('codeforge_active_tab', activeTab);

    if (activeTab === 'contests' && selectedContestSlug) {
      params.set('contest', selectedContestSlug);
      localStorage.setItem('codeforge_contest_slug', selectedContestSlug);
    } else if (activeTab !== 'contests') {
      params.delete('contest');
      params.delete('problem');
      localStorage.removeItem('codeforge_contest_slug');
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [activeTab, selectedContestSlug]);

  // Resizable Panels State for Main Problem Workspace
  const [leftWidthPercent, setLeftWidthPercent] = useState(30);
  const [rightWidthPercent, setRightWidthPercent] = useState(25);
  const [editorHeightPercent, setEditorHeightPercent] = useState(60);

  const isDraggingLeftRef = useRef(false);
  const isDraggingRightRef = useRef(false);
  const isDraggingVerticalRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag Event Handlers for Resizable Dividers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (isDraggingLeftRef.current) {
        const newLeftPct = Math.max(15, Math.min(50, ((e.clientX - rect.left) / rect.width) * 100));
        setLeftWidthPercent(newLeftPct);
      } else if (isDraggingRightRef.current) {
        const newRightPct = Math.max(15, Math.min(45, ((rect.right - e.clientX) / rect.width) * 100));
        setRightWidthPercent(newRightPct);
      } else if (isDraggingVerticalRef.current) {
        const centerCol = containerRef.current.querySelector('#center-col');
        if (centerCol) {
          const centerRect = centerCol.getBoundingClientRect();
          const newEditorPct = Math.max(20, Math.min(80, ((e.clientY - centerRect.top) / centerRect.height) * 100));
          setEditorHeightPercent(newEditorPct);
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingLeftRef.current = false;
      isDraggingRightRef.current = false;
      isDraggingVerticalRef.current = false;
      document.body.style.userSelect = 'auto';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startDraggingLeft = () => {
    isDraggingLeftRef.current = true;
    document.body.style.userSelect = 'none';
  };

  const startDraggingRight = () => {
    isDraggingRightRef.current = true;
    document.body.style.userSelect = 'none';
  };

  const startDraggingVertical = () => {
    isDraggingVerticalRef.current = true;
    document.body.style.userSelect = 'none';
  };

  if (!token || !user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  const centerWidthPercent = Math.max(20, 100 - leftWidthPercent - rightWidthPercent);

  return (
    <div className={`${theme} min-h-screen transition-colors`}>
      <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        <Navbar
          user={user}
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            if (tab !== 'contests') setSelectedContestSlug(null);
          }}
          theme={theme}
          toggleTheme={toggleTheme}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-2 max-w-[1920px] mx-auto w-full">
          {/* Profile Tab */}
          {activeTab === 'profile' && <UserProfilePage user={user} token={token} />}

          {/* Admin Dashboard Tab */}
          {activeTab === 'admin' && user.role === 'ADMIN' && (
            <AdminDashboardPage
              token={token}
              onOpenCreateModal={() => setIsAdminModalOpen(true)}
            />
          )}

          {/* Contests Tab */}
          {activeTab === 'contests' && (
            selectedContestSlug ? (
              <ContestViewPage
                contestSlug={selectedContestSlug}
                token={token}
                user={user}
                onBackToList={() => {
                  setSelectedContestSlug(null);
                  const params = new URLSearchParams(window.location.search);
                  params.delete('contest');
                  params.delete('problem');
                  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
                }}
              />
            ) : (
              <ContestsListPage
                token={token}
                user={user}
                onOpenContest={(slug) => {
                  setSelectedContestSlug(slug);
                  const params = new URLSearchParams(window.location.search);
                  params.set('tab', 'contests');
                  params.set('contest', slug);
                  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
                }}
              />
            )
          )}

          {/* Problems Workspace Tab with Resizable 4 Windows */}
          {activeTab === 'problems' && (
            <div
              ref={containerRef}
              className="flex h-[calc(100vh-70px)] min-h-[500px] w-full select-none"
            >
              {/* Window 1: Problem Details (Left Column) */}
              <div
                style={{ width: `${leftWidthPercent}%` }}
                className="h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm overflow-hidden flex flex-col transition-colors"
              >
                <ProblemDetails
                  problems={problems}
                  selectedProblem={selectedProblem}
                  onSelectProblem={setSelectedProblem}
                  onSelectTopicFilter={(t) => fetchProblems(t)}
                />
              </div>

              {/* Horizontal Divider 1 (Left/Center Splitter) */}
              <div
                onMouseDown={startDraggingLeft}
                className="w-2 hover:w-2 cursor-col-resize flex items-center justify-center group z-10 mx-0.5"
                title="Drag to resize Problem Details panel"
              >
                <div className="w-1 h-8 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-500 transition-colors" />
              </div>

              {/* Center Column: Code Editor & Execution Console */}
              <div
                id="center-col"
                style={{ width: `${centerWidthPercent}%` }}
                className="flex flex-col h-full overflow-hidden"
              >
                {/* Window 2: Code Editor (Center Top) */}
                <div
                  style={{ height: `${editorHeightPercent}%` }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-2 flex flex-col overflow-hidden transition-colors"
                >
                  <CodeEditor
                    language={language}
                    setLanguage={setLanguage}
                    code={code}
                    setCode={setCode}
                    onRun={runCode}
                    onSubmit={submitCode}
                    isRunning={isRunningCode}
                    isSubmitting={isSubmittingCode}
                    rateLimitError={rateLimitError}
                  />
                </div>

                {/* Vertical Divider (Editor/Console Splitter) */}
                <div
                  onMouseDown={startDraggingVertical}
                  className="h-2 hover:h-2 cursor-row-resize flex items-center justify-center group z-10 my-0.5"
                  title="Drag to resize Code Editor & Execution Console height"
                >
                  <div className="h-1 w-8 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-500 transition-colors" />
                </div>

                {/* Window 3: Live Execution Console (Center Bottom) */}
                <div
                  style={{ height: `${100 - editorHeightPercent}%` }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-2 flex flex-col overflow-hidden transition-colors"
                >
                  <ExecutionConsole
                    status={status}
                    sampleRunResult={sampleRunResult}
                    submissionProgress={submissionProgress}
                    result={executionResult}
                    cacheHitNotice={cacheHitNotice}
                  />
                </div>
              </div>

              {/* Horizontal Divider 2 (Center/Right Splitter) */}
              <div
                onMouseDown={startDraggingRight}
                className="w-2 hover:w-2 cursor-col-resize flex items-center justify-center group z-10 mx-0.5"
                title="Drag to resize AI Telemetry panel"
              >
                <div className="w-1 h-8 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-500 transition-colors" />
              </div>

              {/* Window 4: AI Telemetry (Right Column) */}
              <div
                style={{ width: `${rightWidthPercent}%` }}
                className="h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm overflow-hidden transition-colors"
              >
                <AIProfilingCard
                  feedback={aiFeedback}
                  isProcessing={status === 'RUNNING' || (status === 'COMPLETED' && !aiFeedback)}
                />
              </div>
            </div>
          )}
        </main>

        {/* Admin Create Problem Modal */}
        <AdminProblemModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          onSuccess={() => {
            fetchProblems();
          }}
        />
      </div>
    </div>
  );
}

export default App;
