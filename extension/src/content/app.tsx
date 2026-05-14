import { createRoot } from 'react-dom/client';
import { AIBridge } from '../bridge/ai-bridge.js';
import { Orchestrator } from '../orchestrator/orchestrator.js';
import { ParsedResponse } from '../parser/response-parser.js';
import { Panel, PanelView } from '../ui/Panel.js';
import { Launcher } from '../ui/Launcher.js';

type Subscriber = () => void;

/**
 * Owns the panel view state and wraps the orchestrator. UI callbacks call
 * these methods; each maps the orchestrator's ParsedResponse to the next
 * PanelView, and catches thrown errors into a calm error view.
 */
export class AppController {
  private _view: PanelView = { kind: 'idle' };
  private subscribers: Subscriber[] = [];
  private orchestrator: Orchestrator;
  private bridge: AIBridge;
  open = false;

  constructor(bridge: AIBridge) {
    this.bridge = bridge;
    this.orchestrator = new Orchestrator(bridge);
  }

  get view(): PanelView {
    return this._view;
  }

  subscribe(fn: Subscriber): void {
    this.subscribers.push(fn);
  }

  private notify(): void {
    for (const fn of this.subscribers) fn();
  }

  private setView(v: PanelView): void {
    this._view = v;
    this.notify();
  }

  setOpen(open: boolean): void {
    this.open = open;
    this.notify();
  }

  private mapResponse(parsed: ParsedResponse): PanelView {
    if (parsed.kind === 'questions') {
      if (parsed.questions.length === 0 && parsed.status === 'ready') {
        return { kind: 'loading', message: 'Getting your 5 options…' };
      }
      return { kind: 'questions', questions: parsed.questions };
    }
    if (parsed.kind === 'options') {
      return { kind: 'options', options: parsed.options };
    }
    return {
      kind: 'error',
      message: "The AI's reply could not be read. Try again, or send your prompt as-is.",
    };
  }

  /**
   * Build an error view that carries BOTH the friendly message and a compact
   * technical diagnostic line. Also logs the full diagnostics + raw error to
   * the console so a live-test failure is precisely diagnosable.
   */
  private errorView(err: unknown): PanelView {
    const diag = this.bridge.diagnose();
    console.log('[ai-ticulate] failure diagnostics:', diag);
    console.log('[ai-ticulate] error was:', err);
    const diagLine =
      `[diagnostic] input:${diag.inputFound ? '✓' : '✗'} ` +
      `send-button:${diag.sendButtonFound ? '✓' : '✗'} ` +
      `response-area:${diag.responseContainerFound ? '✓' : '✗'} — ${diag.site}`;
    return { kind: 'error', message: `${errorMessage(err)}\n\n${diagLine}` };
  }

  async submitRequest(text: string): Promise<void> {
    this.setView({ kind: 'loading', message: 'Asking your AI to help sharpen this…' });
    try {
      const parsed = await this.orchestrator.start(text);
      const next = this.mapResponse(parsed);
      this.setView(next);
      if (next.kind === 'loading') {
        await this.fetchOptions();
      }
    } catch (err) {
      this.setView(this.errorView(err));
    }
  }

  async answerQuestions(answers: { question: string; answer: string }[]): Promise<void> {
    try {
      for (const a of answers) this.orchestrator.recordAnswer(a.question, a.answer);
      this.setView({ kind: 'loading', message: 'Getting your 5 options…' });
      await this.fetchOptions();
    } catch (err) {
      this.setView(this.errorView(err));
    }
  }

  private async fetchOptions(): Promise<void> {
    const parsed = await this.orchestrator.requestOptions();
    this.setView(this.mapResponse(parsed));
  }

  async pickOption(finalPrompt: string): Promise<void> {
    this.setView({ kind: 'loading', message: 'Sending your refined prompt…' });
    try {
      const answer = await this.orchestrator.finalize(finalPrompt);
      this.setView({ kind: 'done', finalAnswerPreview: answer.slice(0, 280) });
    } catch (err) {
      this.setView(this.errorView(err));
    }
  }

  close(): void {
    this.setOpen(false);
  }

  /** Reset back to the idle state so the user can start a fresh request. */
  reset(): void {
    this.orchestrator.reset();
    this.setView({ kind: 'idle' });
  }
}

function errorMessage(err: unknown): string {
  // Never leak raw internals; give the user a calm, actionable message.
  if (err instanceof Error && /not ready/i.test(err.message)) {
    return "Couldn't find the chat box on this page yet. Wait for the page to finish loading and try again.";
  }
  if (err instanceof Error && /timed out/i.test(err.message)) {
    return 'Your AI took too long to respond. Try again.';
  }
  if (err instanceof Error && /no readable response/i.test(err.message)) {
    return "Couldn't read your AI's reply off the page.";
  }
  return 'Something went wrong. Try again, or send your prompt as-is.';
}

/** Mount the panel + launcher into a host element on the page. */
export function mountApp(
  bridge: AIBridge,
  container: HTMLElement,
  settings?: { panelSide: 'left' | 'right'; autoOpenOnLoad: boolean },
): AppController {
  const controller = new AppController(bridge);
  const root = createRoot(container);

  if (settings?.autoOpenOnLoad) {
    controller.open = true;
  }
  if (settings?.panelSide === 'left') {
    container.classList.add('ait-panel-side-left');
  }

  const renderAll = (): void => {
    root.render(
      <>
        <Launcher onClick={() => controller.setOpen(!controller.open)} />
        {controller.open && (
          <Panel
            view={controller.view}
            onSubmitRequest={(t) => void controller.submitRequest(t)}
            onAnswerQuestions={(a) => void controller.answerQuestions(a)}
            onPickOption={(p) => void controller.pickOption(p)}
            onClose={() => controller.close()}
            onRestart={() => controller.reset()}
          />
        )}
      </>,
    );
  };

  controller.subscribe(renderAll);
  renderAll();
  return controller;
}
