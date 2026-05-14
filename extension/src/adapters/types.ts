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

  /**
   * True if the latest assistant response has finished generating
   * (not still streaming). Adapters detect this via site-specific signals
   * (e.g. the "stop generating" control disappearing).
   */
  isResponseComplete(): boolean;

  /** Report what the adapter can and cannot find on the current page — for debugging. */
  diagnose(): AdapterDiagnostics;
}
