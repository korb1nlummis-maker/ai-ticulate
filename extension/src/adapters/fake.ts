import { SiteAdapter } from './types.js';

/**
 * In-memory adapter for tests. Lets a test drive the "AI" deterministically:
 * setInputValue/clickSend record sent messages; scriptResponse sets what the
 * "AI" replied and whether it's done.
 */
export class FakeAdapter implements SiteAdapter {
  readonly name = 'Fake';
  inputValue = '';
  sentMessages: string[] = [];
  private responseText = '';
  private complete = false;
  private ready = true;

  setReady(ready: boolean): void {
    this.ready = ready;
  }

  isReady(): boolean {
    return this.ready;
  }

  setInputValue(text: string): void {
    this.inputValue = text;
  }

  clickSend(): void {
    this.sentMessages.push(this.inputValue);
    this.inputValue = '';
    this.responseText = '';
    this.complete = false;
  }

  getLatestResponseText(): string {
    return this.responseText;
  }

  isResponseComplete(): boolean {
    return this.complete;
  }

  /** Test helper: script what the AI "replied" to the last sent message. */
  scriptResponse(text: string, opts: { complete: boolean }): void {
    this.responseText = text;
    this.complete = opts.complete;
  }
}
