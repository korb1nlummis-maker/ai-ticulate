/**
 * A diagnostic snapshot of what an adapter can and cannot find on the current
 * page. Surfaced on live-test failures so a screenshot becomes a precise
 * diagnosis instead of blind selector-guessing.
 */
export type AdapterDiagnostics = {
  site: string;
  inputFound: boolean;
  sendButtonFound: boolean;
  responseContainerFound: boolean;
  /** What's actually in the input RIGHT NOW (first 200 chars). */
  inputCurrentText: string;
  /** document.activeElement description — is focus where we expect? */
  activeElement: string;
  /** Does document.queryCommandSupported('insertText') return true? */
  execCommandSupported: boolean;
  /** document.hasFocus() */
  documentHasFocus: boolean;
  /** A short summary, e.g. "userMessages=1 responseBlocks=3". */
  conversationTurns: string;
  notes: string[];
};

/**
 * A SiteAdapter encapsulates everything site-specific about ONE AI chat site.
 * One adapter per site (chatgpt.com, claude.ai, gemini.google.com). When a site
 * redesigns, only its adapter changes.
 */
export interface SiteAdapter {
  /** Human-readable site name, e.g. "ChatGPT". */
  readonly name: string;

  /** True if the adapter's required elements are present and the page looks ready. */
  isReady(): boolean;

  /**
   * Set the chat input box's value to the given text. Async because typing
   * into a contenteditable editor may need retries with real time between
   * attempts for focus/render to settle.
   */
  setInputValue(text: string): Promise<void>;

  /** Trigger sending the current input (click send / press enter as appropriate). */
  clickSend(): void;

  /**
   * The text of the latest assistant response currently visible.
   * Returns '' if there is no assistant response yet.
   */
  getLatestResponseText(): string;

  /** The text currently in the input element (empty if nothing or input not found). */
  getCurrentInputText(): string;

  /**
   * True if the latest assistant response has finished generating
   * (not still streaming). Adapters detect this via site-specific signals
   * (e.g. the "stop generating" control disappearing).
   */
  isResponseComplete(): boolean;

  /**
   * A monotonically-increasing-ish number that increments when a new assistant
   * turn appears in the conversation. Used by the bridge to detect a new
   * response far more reliably than comparing response text strings (which
   * fails when a new response happens to byte-match a previous one).
   *
   * Simplest implementations: count the elements matching the adapter's
   * primary response-container selector.
   */
  getResponseSignal(): number;

  /** Report what the adapter can and cannot find on the current page — for debugging. */
  diagnose(): AdapterDiagnostics;
}
