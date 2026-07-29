import OpenAI from 'openai';
import { SupportedLanguage, AITelemetryPayload } from '@rce/shared';

let openaiClient: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface AnalysisInput {
  submissionId: string;
  userId: string;
  language: SupportedLanguage;
  code: string;
  timeMs: number;
  memoryKb: number;
  stdout: string;
  stderr: string;
}

/**
 * Analyzes code time and space complexity (Big-O) and provides algorithmic optimizations.
 * Uses OpenAI GPT model if API key is provided, or falls back to an intelligent AST/Heuristic profiler.
 */
export async function profileCodeWithAI(input: AnalysisInput): Promise<AITelemetryPayload> {
  const { submissionId, userId, language, code, timeMs, memoryKb } = input;

  if (openaiClient) {
    try {
      const prompt = `You are a Senior Algorithms Engineer. Analyze the following ${language} code submission.\n` +
        `Execution Metrics: Time Taken = ${timeMs}ms, Memory Used = ${memoryKb}KB.\n\n` +
        `SOURCE CODE:\n\`\`\`${language}\n${code}\n\`\`\`\n\n` +
        `Provide a strict JSON response matching this structure EXACTLY:\n` +
        `{\n` +
        `  "timeComplexity": "O(N)",\n` +
        `  "spaceComplexity": "O(1)",\n` +
        `  "suggestions": ["Use a hash map instead of nested loops.", "Optimize memory allocation."]\n` +
        `}`;

      const response = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          submissionId,
          userId,
          timeComplexity: parsed.timeComplexity || 'O(N)',
          spaceComplexity: parsed.spaceComplexity || 'O(1)',
          suggestions: parsed.suggestions || [],
          analyzedAt: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.warn('[AI Telemetry] LLM API call failed, falling back to heuristic profiling engine:', error);
    }
  }

  // Fallback: Intelligent Static Analysis & Metrics Heuristic Profiler
  return runHeuristicProfiler(input);
}

function runHeuristicProfiler(input: AnalysisInput): AITelemetryPayload {
  const { submissionId, userId, code, timeMs } = input;

  const hasNestedLoops = /for\s*\(.*for\s*\(|while\s*\(.*while\s*\(|for\s+.*:\s*for\s+/s.test(code);
  const hasSingleLoop = /for|while/s.test(code);
  const hasRecursion = /def\s+(\w+).*?\1\(|function\s+(\w+).*?\2\(|(\w+)\s*\(.*?\3\(/s.test(code);
  const usesMapSet = /Map|Set|dict|\{\}|unordered_map|hash_map/i.test(code);

  let timeComplexity = 'O(1)';
  let spaceComplexity = 'O(1)';
  const suggestions: string[] = [];

  if (hasNestedLoops) {
    timeComplexity = 'O(N²)';
    suggestions.push('Nested loop detected. Consider using a Hash Map or Two-Pointer technique to reduce time complexity to O(N).');
  } else if (hasRecursion) {
    timeComplexity = 'O(2^N) or O(N)';
    spaceComplexity = 'O(N) call stack';
    suggestions.push('Recursive calls detected. Ensure memoization (Dynamic Programming) is applied to prevent redundant subproblem computation.');
  } else if (hasSingleLoop) {
    timeComplexity = 'O(N)';
    suggestions.push('Single iteration detected. Ensure array pre-allocation if working with large inputs.');
  }

  if (usesMapSet) {
    spaceComplexity = 'O(N)';
    suggestions.push('Auxiliary hash table/set utilized for O(1) lookups.');
  }

  if (timeMs > 2000) {
    suggestions.push(`High execution duration (${timeMs}ms). Check for inefficient I/O operations or redundant operations.`);
  }

  if (suggestions.length === 0) {
    suggestions.push('Code execution is optimal. Good adherence to algorithmic standards.');
  }

  return {
    submissionId,
    userId,
    timeComplexity,
    spaceComplexity,
    suggestions,
    analyzedAt: new Date().toISOString(),
  };
}
