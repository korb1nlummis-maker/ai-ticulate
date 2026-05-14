import { SiteAdapter } from './types.js';

// Selectors filled in / hardened in Task 4.
export class ClaudeAdapter implements SiteAdapter {
  readonly name = 'Claude';
  isReady(): boolean {
    return false;
  }
  setInputValue(_text: string): void {
    throw new Error('ClaudeAdapter.setInputValue not yet implemented');
  }
  clickSend(): void {
    throw new Error('ClaudeAdapter.clickSend not yet implemented');
  }
  getLatestResponseText(): string {
    return '';
  }
  isResponseComplete(): boolean {
    return false;
  }
}
