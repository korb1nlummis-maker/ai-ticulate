import { AdapterDiagnostics, SiteAdapter } from './types.js';

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
  private _signal = 0;

  setReady(ready: boolean): void {
    this.ready = ready;
  }

  isReady(): boolean {
    return this.ready;
  }

  async setInputValue(text: string): Promise<void> {
    this.inputValue = text;
  }

  clickSend(): void {
    this.sentMessages.push(this.inputValue);
    this.inputValue = '';
  }

  getLatestResponseText(): string {
    return this.responseText;
  }

  getCurrentInputText(): string {
    return this.inputValue;
  }

  isResponseComplete(): boolean {
    return this.complete;
  }

  getResponseSignal(): number {
    return this._signal;
  }

  /** Test helper: script what the AI "replied" to the last sent message. */
  scriptResponse(text: string, opts: { complete: boolean; newTurn?: boolean }): void {
    // `complete: true` implies a new assistant turn (matches live-site DOM:
    // a new <assistant message> element appears when the turn becomes
    // visible). `newTurn` can be set independently when the test needs to
    // model "a new turn rendered but the site never reports complete" —
    // e.g., a stuck stop-generating indicator while text has already
    // finished streaming.
    const isNewTurn = opts.newTurn ?? opts.complete;
    this.responseText = text;
    this.complete = opts.complete;
    if (isNewTurn) this._signal += 1;
  }

  diagnose(): AdapterDiagnostics {
    return {
      site: 'Fake',
      inputFound: true,
      sendButtonFound: true,
      responseContainerFound: true,
      inputCurrentText: this.inputValue,
      activeElement: 'fake',
      execCommandSupported: false,
      documentHasFocus: true,
      conversationTurns: 'n/a (fake)',
      notes: ['fake adapter'],
    };
  }
}
