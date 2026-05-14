import { SiteAdapter } from './types.js';

// Selectors filled in / hardened in Task 3.
export class ChatGPTAdapter implements SiteAdapter {
  readonly name = 'ChatGPT';
  isReady(): boolean {
    return false;
  }
  setInputValue(_text: string): void {
    throw new Error('ChatGPTAdapter.setInputValue not yet implemented');
  }
  clickSend(): void {
    throw new Error('ChatGPTAdapter.clickSend not yet implemented');
  }
  getLatestResponseText(): string {
    return '';
  }
  isResponseComplete(): boolean {
    return false;
  }
}
