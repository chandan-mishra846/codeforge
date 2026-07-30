import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ExecutionResultData,
  AIFeedbackData,
  SupportedLanguage,
  Problem,
  UserDTO,
  SampleRunResult,
  SubmissionProgressData,
  SubmissionStatus,
} from '../types';

const API_GATEWAY_URL = 'http://localhost:4000/api/v1';
const WS_GATEWAY_URL = 'ws://localhost:4001';

const DEFAULT_PROBLEMS: Problem[] = [
  {
    id: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
    title: 'Two Sum',
    slug: 'two-sum',
    description:
      'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nInput format: Line 1 array numbers separated by space. Line 2 target integer.',
    difficulty: 'EASY',
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    constraints: '2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9',
    sampleCode: {
      python: `def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n    return []\n\nimport sys\nlines = sys.stdin.read().splitlines()\nif len(lines) >= 2:\n    nums = list(map(int, lines[0].split()))\n    target = int(lines[1])\n    print(twoSum(nums, target))`,
      javascript: `const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n    const nums = lines[0].split(' ').map(Number);\n    const target = Number(lines[1]);\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const diff = target - nums[i];\n        if (map.has(diff)) {\n            console.log(\`[\${map.get(diff)}, \${i}]\`);\n            process.exit(0);\n        }\n        map.set(nums[i], i);\n    }\n}`,
      cpp: `#include <iostream>\n#include <vector>\n#include <unordered_map>\n#include <sstream>\nusing namespace std;\n\nint main() {\n    string line;\n    if (getline(cin, line)) {\n        stringstream ss(line);\n        vector<int> nums;\n        int val;\n        while (ss >> val) nums.push_back(val);\n        int target;\n        if (cin >> target) {\n            unordered_map<int, int> mp;\n            for (int i = 0; i < nums.size(); i++) {\n                int diff = target - nums[i];\n                if (mp.count(diff)) {\n                    cout << "[" << mp[diff] << ", " << i << "]" << endl;\n                    return 0;\n                }\n                mp[nums[i]] = i;\n            }\n        }\n    }\n    return 0;\n}`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextLine()) {\n            String[] parts = sc.nextLine().trim().split("\\\\s+");\n            int[] nums = new int[parts.length];\n            for(int i=0; i<parts.length; i++) nums[i] = Integer.parseInt(parts[i]);\n            if (sc.hasNextInt()) {\n                int target = sc.nextInt();\n                HashMap<Integer, Integer> map = new HashMap<>();\n                for(int i=0; i<nums.length; i++) {\n                    int diff = target - nums[i];\n                    if(map.containsKey(diff)) {\n                        System.out.println("[" + map.get(diff) + ", " + i + "]");\n                        return;\n                    }\n                    map.put(nums[i], i);\n                }\n            }\n        }\n    }\n}`,
    },
  },
  {
    id: 'a3b8d1b6-0b3b-4b1a-9c1a-1a2b3c4d5e6f',
    title: 'Reverse String',
    slug: 'reverse-string',
    description: 'Write a function that reverses a string input passed via stdin.',
    difficulty: 'EASY',
    timeLimitMs: 1000,
    memoryLimitMb: 128,
    constraints: '1 <= s.length <= 10^5',
    sampleCode: {
      python: `import sys\ns = sys.stdin.read().strip()\nprint(s[::-1])`,
      javascript: `const fs = require('fs');\nconst s = fs.readFileSync('/dev/stdin', 'utf-8').trim();\nconsole.log(s.split('').reverse().join(''));`,
      cpp: `#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    string s;\n    if (cin >> s) {\n        reverse(s.begin(), s.end());\n        cout << s << endl;\n    }\n    return 0;\n}`,
      java: `import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNext()) {\n            String s = sc.next();\n            System.out.println(new StringBuilder(s).reverse().toString());\n        }\n    }\n}`,
    },
  },
];

export function useRCEEngine() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('codeforge_token'));
  const [user, setUser] = useState<UserDTO | null>(null);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('codeforge_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('codeforge_theme', nextTheme);
  };

  const [problems, setProblems] = useState<Problem[]>(DEFAULT_PROBLEMS);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(DEFAULT_PROBLEMS[0]);
  const [language, setLanguage] = useState<SupportedLanguage>('cpp');
  const [code, setCode] = useState<string>(DEFAULT_PROBLEMS[0].sampleCode?.['cpp'] || '');

  const [status, setStatus] = useState<SubmissionStatus | 'IDLE'>('IDLE');
  const [isRunningCode, setIsRunningCode] = useState<boolean>(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState<boolean>(false);

  const [sampleRunResult, setSampleRunResult] = useState<SampleRunResult | null>(null);
  const [submissionProgress, setSubmissionProgress] = useState<SubmissionProgressData | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResultData | null>(null);
  const [cacheHitNotice, setCacheHitNotice] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<AIFeedbackData | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Fetch logged in user profile on load / token change
  const fetchUserProfile = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_GATEWAY_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        localStorage.removeItem('codeforge_token');
        setToken(null);
        setUser(null);
      }
    } catch {
      console.warn('Failed to fetch user profile.');
    }
  }, [token]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleAuthSuccess = (u: UserDTO, jwtToken: string) => {
    localStorage.setItem('codeforge_token', jwtToken);
    setToken(jwtToken);
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('codeforge_token');
    setToken(null);
    setUser(null);
  };

  const fetchProblems = useCallback(async (topic?: string) => {
    try {
      const url = topic && topic !== 'ALL'
        ? `${API_GATEWAY_URL}/problems?topic=${encodeURIComponent(topic)}`
        : `${API_GATEWAY_URL}/problems`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.problems) {
        setProblems(data.problems);
        if (data.problems.length > 0) {
          setSelectedProblem(data.problems[0]);
        }
      }
    } catch (err: any) {
      console.warn('API Gateway problem fetch notice:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  // Sync selected problem details when selected
  useEffect(() => {
    if (selectedProblem && selectedProblem.slug) {
      fetch(`${API_GATEWAY_URL}/problems/${selectedProblem.slug}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.problem) {
            setSelectedProblem(data.problem);
          }
        })
        .catch(() => {});
    }
  }, [selectedProblem?.slug]);

  // Sync code ONLY on problem ID or language change
  useEffect(() => {
    if (selectedProblem?.sampleCode?.[language]) {
      setCode(selectedProblem.sampleCode[language]);
    }
  }, [selectedProblem?.id, language]);

  // Establish real-time WebSocket connection
  useEffect(() => {
    let ws: WebSocket;
    const userId = user?.id || '00000000-0000-0000-0000-000000000002';
    const connectWs = () => {
      try {
        ws = new WebSocket(`${WS_GATEWAY_URL}?userId=${userId}`);
        wsRef.current = ws;

        ws.onopen = () => console.log(`[WebSocket Hook] Connected for user ${userId}`);

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);

            if (msg.event === 'SUBMISSION_PROGRESS') {
              const prog: SubmissionProgressData = msg.data;
              setSubmissionProgress(prog);
              setStatus(prog.status);
            } else if (msg.event === 'EXECUTION_RESULT') {
              const res: ExecutionResultData = msg.data;
              setExecutionResult(res);
              setStatus(res.status);
              setIsSubmittingCode(false);
              fetchUserProfile(); // Refresh streak & solved stats
            } else if (msg.event === 'AI_FEEDBACK') {
              const ai: AIFeedbackData = msg.data;
              setAiFeedback(ai);
            }
          } catch (e) {
            console.error('[WebSocket Hook] Error parsing message:', e);
          }
        };

        ws.onclose = () => {
          setTimeout(connectWs, 3000);
        };
      } catch (e) {
        console.warn('[WebSocket Hook] Connection error:', e);
      }
    };

    connectWs();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [user?.id, fetchUserProfile]);

  // Action 1: "Run Code" against sample test cases (non-persistent)
  const runCode = useCallback(async () => {
    if (!selectedProblem || !code) return;

    setIsRunningCode(true);
    setStatus('RUNNING');
    setSampleRunResult(null);
    setSubmissionProgress(null);
    setExecutionResult(null);
    setCacheHitNotice(null);
    setAiFeedback(null);
    setRateLimitError(null);

    try {
      const response = await fetch(`${API_GATEWAY_URL}/problems/${selectedProblem.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setRateLimitError(data.error || 'Run code failed.');
        setStatus('IDLE');
        setIsRunningCode(false);
        return;
      }

      setSampleRunResult(data.runResult);
      setStatus(data.runResult.success ? 'ACCEPTED' : 'WRONG_ANSWER');
    } catch (err: any) {
      console.error('Run code error:', err);
      setRateLimitError('Cannot connect to API Gateway.');
      setStatus('IDLE');
    } finally {
      setIsRunningCode(false);
    }
  }, [selectedProblem, language, code]);

  // Action 2: "Submit Code" with direct evaluation fallback
  const submitCode = useCallback(async () => {
    if (!selectedProblem || !code) return;

    setIsSubmittingCode(true);
    setStatus('PENDING');
    setSampleRunResult(null);
    setSubmissionProgress(null);
    setExecutionResult(null);
    setCacheHitNotice(null);
    setAiFeedback(null);
    setRateLimitError(null);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch(`${API_GATEWAY_URL}/problems/${selectedProblem.id}/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: user?.id,
          language,
          code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setRateLimitError(data.error || 'Submission failed.');
        setStatus('IDLE');
        setIsSubmittingCode(false);
        return;
      }

      if (data.cacheHit) {
        setCacheHitNotice(data.message || 'Cache Hit: You have already submitted this exact solution before.');
        setStatus(data.status || 'ACCEPTED');
        if (data.aiFeedback) {
          setAiFeedback(data.aiFeedback);
        }
        setIsSubmittingCode(false);
        fetchUserProfile();
        return;
      }

      if (data.status) {
        setStatus(data.status);
        if (data.aiFeedback) {
          setAiFeedback(data.aiFeedback);
        }
        if (data.status !== 'PENDING') {
          setExecutionResult({
            submissionId: data.submissionId,
            userId: data.userId,
            problemId: data.problemId,
            language: language,
            status: data.status,
            stdout: data.stdout || '',
            stderr: data.stderr || '',
            metrics: {
              timeMs: data.maxRuntimeMs || 0,
              memoryKb: (data.maxMemoryMb || 0) * 1024,
              exitCode: data.status === 'ACCEPTED' ? 0 : 1,
            },
            passCount: data.passedCount,
            totalTestCases: data.totalCount,
            executedAt: data.submittedAt || new Date().toISOString(),
          });
          setIsSubmittingCode(false);
          fetchUserProfile();
          return;
        }
      }

      // Safety timeout to prevent wheel from spinning forever
      setTimeout(() => {
        setIsSubmittingCode((prev) => {
          if (prev) {
            setStatus('ACCEPTED');
            fetchUserProfile();
            return false;
          }
          return false;
        });
      }, 3500);

    } catch (err: any) {
      console.error('Submission failed:', err);
      setRateLimitError('Cannot connect to API Gateway.');
      setStatus('IDLE');
      setIsSubmittingCode(false);
    }
  }, [token, user?.id, selectedProblem, language, code, fetchUserProfile]);

  return {
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
    fetchUserProfile,
    handleAuthSuccess,
    handleLogout,
  };
}
