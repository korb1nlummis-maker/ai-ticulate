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
  open = false;

  constructor(bridge: AIBridge) {
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
      this.setView({ kind: 'error', message: errorMessage(err) });
    }
  }

  async answerQuestions(answers: { question: string; answer: string }[]): Promise<void> {
    try {
      for (const a of answers) this.orchestrator.recordAnswer(a.question, a.answer);
      this.setView({ kind: 'loading', message: 'Getting your 5 options…' });
      await this.fetchOptions();
    } catch (err) {
      this.setView({ kind: 'error', message: errorMessage(err) });
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
      this.setView({ kind: 'error', message: errorMessage(err) });
    }
  }

  close(): void {
    this.setOpen(false);
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
  return 'Something went wrong. Try again, or send your prompt as-is.';
}

/** Mount the panel + launcher into a host element on the page. */
export function mountApp(bridge: AIBridge, container: HTMLElement): AppController {
  const controller = new AppController(bridge);
  const root = createRoot(container);

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
          />
        )}
      </>,
    );
  };

  controller.subscribe(renderAll);
  renderAll();
  return controller;
}
