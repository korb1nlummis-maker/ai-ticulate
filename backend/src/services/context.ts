import { z } from 'zod';
import { LLMClient, parseJsonResponse } from '../llm/types.js';
import { renderPrompt, loadPrompt } from '../prompts/loader.js';

export type ContextInput = { chatHistory: string };

export type ContextOutput = {
  topic: string | null;
  inferredUserRole: string | null;
  priorDecisions: string[];
  activeGoal: string | null;
};

const ResponseSchema = z.object({
  topic: z.string().nullable(),
  inferred_user_role: z.string().nullable(),
  prior_decisions: z.array(z.string()),
  active_goal: z.string().nullable(),
});

const MAX_HISTORY_CHARS = 30_000;

export async function summarizeContext(llm: LLMClient, input: ContextInput): Promise<ContextOutput> {
  const tpl = loadPrompt('context-summarize');
  const trimmed = input.chatHistory.slice(-MAX_HISTORY_CHARS);

  const userMessage = renderPrompt('context-summarize', { chat_history: trimmed });
  const response = await llm.complete({
    messages: [{ role: 'user', content: userMessage }],
    temperature: tpl.temperature,
  });

  const parsed = parseJsonResponse(response.text, ResponseSchema);
  return {
    topic: parsed.topic,
    inferredUserRole: parsed.inferred_user_role,
    priorDecisions: parsed.prior_decisions,
    activeGoal: parsed.active_goal,
  };
}
