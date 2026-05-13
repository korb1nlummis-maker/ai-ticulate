import { z } from 'zod';
import { LLMClient, parseJsonResponse } from '../llm/types.js';
import { renderPrompt, loadPrompt } from '../prompts/loader.js';

export type QATurn = { q: string; a: string };

export type PretalkInput = {
  originalPrompt: string;
  contextSummary: string;
  qaHistory: QATurn[];
};

export type PretalkOutput = {
  question: string;
  chips: string[];
  allowFillIn: boolean;
  done: boolean;
};

const ResponseSchema = z.object({
  question: z.string(),
  chips: z.array(z.string()),
  allow_fill_in: z.boolean(),
  done: z.boolean(),
});

function formatQaHistory(qa: QATurn[]): string {
  if (qa.length === 0) return '(none yet)';
  return qa.map((t, i) => `Q${i + 1}: ${t.q}\nA${i + 1}: ${t.a}`).join('\n');
}

export async function runPretalk(llm: LLMClient, input: PretalkInput): Promise<PretalkOutput> {
  const tpl = loadPrompt('pretalk-next');
  const userMessage = renderPrompt('pretalk-next', {
    original_prompt: input.originalPrompt,
    context_summary: input.contextSummary || '(none)',
    qa_history: formatQaHistory(input.qaHistory),
  });

  const response = await llm.complete({
    messages: [{ role: 'user', content: userMessage }],
    temperature: tpl.temperature,
  });

  const parsed = parseJsonResponse(response.text, ResponseSchema);
  return {
    question: parsed.question,
    chips: parsed.chips,
    allowFillIn: parsed.allow_fill_in,
    done: parsed.done,
  };
}
