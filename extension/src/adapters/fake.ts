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
  scriptResponse(text: string, opts: { complete: boolean }): void {
    // Each `complete: true` call represents an assistant turn arriving — that's
    // what the bridge keys off via getResponseSignal(). We bump the signal
    // unconditionally on complete:true (regardless of text content), modelling
    // the live-site DOM where a new <assistant message> element appears even
    // if the rendered text happens to be empty / unreadable / identical to a
    // prior turn. Streaming-only (complete:false) updates don't count.
    const becomingNewTurn = opts.complete;
    this.responseText = text;
    this.complete = opts.complete;
    if (becomingNewTurn) this._signal += 1;
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
