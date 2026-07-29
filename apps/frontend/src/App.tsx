import React from 'react';
import { useRCEEngine } from './hooks/useRCEEngine';
import { Navbar } from './components/Navbar';
import { ProblemDetails } from './components/ProblemDetails';
import { CodeEditor } from './components/CodeEditor';
import { ExecutionConsole } from './components/ExecutionConsole';
import { AIProfilingCard } from './components/AIProfilingCard';

export function App() {
  const {
    userId,
    problems,
    selectedProblem,
    setSelectedProblem,
    language,
    setLanguage,
    code,
    setCode,
    status,
    isSubmitting,
    executionResult,
    aiFeedback,
    rateLimitError,
    submitCode,
  } = useRCEEngine();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar userId={userId} />

      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-[1920px] mx-auto w-full">
        {/* Left Column: Problem Description (4 cols) */}
        <div className="lg:col-span-4 h-[calc(100vh-90px)] min-h-[450px]">
          <ProblemDetails
            problems={problems}
            selectedProblem={selectedProblem}
            onSelectProblem={setSelectedProblem}
          />
        </div>

        {/* Center Column: Code Editor & Console (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4 h-[calc(100vh-90px)] min-h-[450px]">
          <div className="flex-1">
            <CodeEditor
              language={language}
              setLanguage={setLanguage}
              code={code}
              setCode={setCode}
              onSubmit={submitCode}
              isSubmitting={isSubmitting}
              rateLimitError={rateLimitError}
            />
          </div>
          <div className="h-48">
            <ExecutionConsole status={status} result={executionResult} />
          </div>
        </div>

        {/* Right Column: AI Complexity Telemetry (3 cols) */}
        <div className="lg:col-span-3 h-[calc(100vh-90px)] min-h-[450px]">
          <AIProfilingCard
            feedback={aiFeedback}
            isProcessing={status === 'RUNNING' || (status === 'COMPLETED' && !aiFeedback)}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
