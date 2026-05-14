import { SiteAdapter } from './types.js';

// Selectors filled in / hardened in Task 5.
export class GeminiAdapter implements SiteAdapter {
  readonly name = 'Gemini';
  isReady(): boolean {
    return false;
  }
  setInputValue(_text: string): void {
    throw new Error('GeminiAdapter.setInputValue not yet implemented');
  }
  clickSend(): void {
    throw new Error('GeminiAdapter.clickSend not yet implemented');
  }
  getLatestResponseText(): string {
    return '';
  }
  isResponseComplete(): boolean {
    return false;
  }
}
