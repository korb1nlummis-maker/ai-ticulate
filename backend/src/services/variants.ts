import { z } from 'zod';
import { LLMClient, parseJsonResponse } from '../llm/types.js';
import { renderPrompt, loadPrompt } from '../prompts/loader.js';
import { QATurn, formatQaHistory } from './shared.js';

export type VariantsInput = {
  originalPrompt: string;
  contextSummary: string;
  qaHistory: QATurn[];
};

export type Variant = { id: string; text: string; label: string };
export type VariantsOutput = { variants: Variant[] };

const ResponseSchema = z.object({
  variants: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1),
        label: z.string(),
      }),
    )
    .length(5, 'must return exactly 5 variants'),
});

export async function generateVariants(llm: LLMClient, input: VariantsInput): Promise<VariantsOutput> {
  const tpl = loadPrompt('variants-generate');
  const userMessage = renderPrompt('variants-generate', {
    original_prompt: input.originalPrompt,
    context_summary: input.contextSummary || '(none)',
    qa_history: formatQaHistory(input.qaHistory),
  });

  const response = await llm.complete({
    messages: [{ role: 'user', content: userMessage }],
    temperature: tpl.temperature,
  });

  return parseJsonResponse(response.text, ResponseSchema);
}
