import { useState, useEffect, useCallback, useRef } from 'react';
import { ExecutionResultData, AIFeedbackData, SupportedLanguage, Problem } from '../types';

const API_GATEWAY_URL = 'http://localhost:4000/api';
const WS_GATEWAY_URL = 'ws://localhost:4001';

const DEFAULT_PROBLEMS: Problem[] = [
  {
    id: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
    title: 'Two Sum',
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.',
    constraints: '2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9, Only one valid answer exists.',
    sampleCode: {
      python: `def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n    return []\n\nprint(twoSum([2,7,11,15], 9))`,
      javascript: `function twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const diff = target - nums[i];\n        if (map.has(diff)) return [map.get(diff), i];\n        map.set(nums[i], i);\n    }\n    return [];\n}\nconsole.log(twoSum([2,7,11,15], 9));`,
      cpp: `#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nint main() {\n    vector<int> nums = {2, 7, 11, 15};\n    int target = 9;\n    unordered_map<int, int> mp;\n    for(int i = 0; i < nums.size(); i++) {\n        int diff = target - nums[i];\n        if(mp.count(diff)) {\n            cout << "[" << mp[diff] << ", " << i << "]" << endl;\n            return 0;\n        }\n        mp[nums[i]] = i;\n    }\n    return 0;\n}`,
      java: `import java.util.HashMap;\n\npublic class Solution {\n    public static void main(String[] args) {\n        int[] nums = {2, 7, 11, 15};\n        int target = 9;\n        HashMap<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int diff = target - nums[i];\n            if (map.containsKey(diff)) {\n                System.out.println("[" + map.get(diff) + ", " + i + "]");\n                return;\n            }\n            map.put(nums[i], i);\n        }\n    }\n}`,
    },
  },
  {
    id: 'a3b8d1b6-0b3b-4b1a-9c1a-1a2b3c4d5e6f',
    title: 'Reverse String',
    description: 'Write a function that reverses a string. The input string is given as an array of characters.',
    constraints: '1 <= s.length <= 10^5, s[i] is a printable ascii character.',
    sampleCode: {
      python: `def reverseString(s):\n    return s[::-1]\n\nprint(reverseString("hello"))`,
      javascript: `function reverseString(s) {\n    return s.split('').reverse().join('');\n}\nconsole.log(reverseString("hello"));`,
      cpp: `#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    string s = "hello";\n    reverse(s.begin(), s.end());\n    cout << s << endl;\n    return 0;\n}`,
      java: `public class Solution {\n    public static void main(String[] args) {\n        String s = "hello";\n        StringBuilder sb = new StringBuilder(s);\n        System.out.println(sb.reverse().toString());\n    }\n}`,
    },
  },
];

export function useRCEEngine() {
  const [userId] = useState<string>(() => {
    const saved = localStorage.getItem('rce_user_id');
    if (saved) return saved;
    const newId = 'user-' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('rce_user_id', newId);
    return newId;
  });

  const [problems, setProblems] = useState<Problem[]>(DEFAULT_PROBLEMS);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(DEFAULT_PROBLEMS[0]);
  const [language, setLanguage] = useState<SupportedLanguage>('cpp');
  const [code, setCode] = useState<string>(DEFAULT_PROBLEMS[0].sampleCode['cpp'] || '');

  const [status, setStatus] = useState<'IDLE' | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT'>('IDLE');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null);

  const [executionResult, setExecutionResult] = useState<ExecutionResultData | null>(null);
  const [aiFeedback, setAiFeedback] = useState<AIFeedbackData | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Fetch Problems catalog from backend API Gateway
  useEffect(() => {
    fetch(`${API_GATEWAY_URL}/problems`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.problems && data.problems.length > 0) {
          setProblems(data.problems);
          setSelectedProblem(data.problems[0]);
        }
      })
      .catch((err) => {
        console.warn('API Gateway problem fetch notice:', err.message);
      });
  }, []);

  // Sync code on problem or language change
  useEffect(() => {
    if (selectedProblem && selectedProblem.sampleCode[language]) {
      setCode(selectedProblem.sampleCode[language]);
    }
  }, [selectedProblem, language]);

  // Establish real-time WebSocket connection
  useEffect(() => {
    let ws: WebSocket;
    const connectWs = () => {
      try {
        ws = new WebSocket(`${WS_GATEWAY_URL}?userId=${userId}`);
        wsRef.current = ws;

        ws.onopen = () => console.log(`[WebSocket Hook] Connected for user ${userId}`);

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === 'EXECUTION_RESULT') {
              const res: ExecutionResultData = msg.data;
              setExecutionResult(res);
              setStatus(res.status);
              setIsSubmitting(false);
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
  }, [userId]);

  // Submit Code Endpoint Handler (Direct real compiler trigger)
  const submitCode = useCallback(async () => {
    if (!selectedProblem || !code) return;

    setIsSubmitting(true);
    setStatus('RUNNING');
    setExecutionResult(null);
    setAiFeedback(null);
    setRateLimitError(null);

    try {
      const response = await fetch(`${API_GATEWAY_URL}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          problemId: selectedProblem.id,
          language,
          code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setRateLimitError(data.error || 'Submission failed.');
        setStatus('IDLE');
        setIsSubmitting(false);
        return;
      }

      setCurrentSubmissionId(data.submissionId);

      if (data.executionResult) {
        setExecutionResult(data.executionResult);
        setStatus(data.executionResult.status);
      }

      if (data.aiFeedback) {
        setAiFeedback(data.aiFeedback);
      }
    } catch (err: any) {
      console.error('Submission failed:', err);
      setRateLimitError('Cannot connect to API Gateway.');
      setStatus('IDLE');
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, selectedProblem, language, code]);

  return {
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
    currentSubmissionId,
    executionResult,
    aiFeedback,
    rateLimitError,
    submitCode,
  };
}
