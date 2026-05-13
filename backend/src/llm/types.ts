import { z } from 'zod';

export type LLMMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type LLMCompleteOptions = {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
};

export type LLMResponse = {
  text: string;
};

export interface LLMClient {
  complete(opts: LLMCompleteOptions): Promise<LLMResponse>;
}

/**
 * Parse a JSON string against a Zod schema. Used by services that expect
 * the LLM to return structured output. Throws if the LLM returned
 * malformed JSON or JSON that fails schema validation.
 */
export function parseJsonResponse<T>(text: string, schema: z.ZodSchema<T>): T {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
  const parsed = JSON.parse(cleaned);
  return schema.parse(parsed);
}
