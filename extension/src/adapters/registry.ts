import { SiteAdapter } from './types.js';
import { ChatGPTAdapter } from './chatgpt.js';
import { ClaudeAdapter } from './claude.js';
import { GeminiAdapter } from './gemini.js';

/**
 * Pick the SiteAdapter for a given hostname. Returns null if the host is
 * not a supported AI site.
 */
export function pickAdapter(hostname: string): SiteAdapter | null {
  if (hostname.endsWith('chatgpt.com')) return new ChatGPTAdapter();
  if (hostname.endsWith('claude.ai')) return new ClaudeAdapter();
  if (hostname.endsWith('gemini.google.com')) return new GeminiAdapter();
  return null;
}
