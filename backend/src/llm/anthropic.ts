import Anthropic from '@anthropic-ai/sdk';
import { LLMClient, LLMCompleteOptions, LLMResponse } from './types.js';

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_MAX_TOKENS = 1024;

export class AnthropicLLM implements LLMClient {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model: string = DEFAULT_MODEL) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async complete(opts: LLMCompleteOptions): Promise<LLMResponse> {
    const systemMessages = opts.messages.filter((m) => m.role === 'system').map((m) => m.content);
    const conversation = opts.messages.filter((m) => m.role !== 'system');

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: opts.temperature ?? 0.7,
      system: systemMessages.length > 0 ? systemMessages.join('\n\n') : undefined,
      messages: conversation.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('AnthropicLLM: no text content in response');
    }
    return { text: textBlock.text };
  }
}
