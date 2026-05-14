import { AIBridge } from '../bridge/ai-bridge.js';
import { TaskTracker } from './task-tracker.js';
import { parseResponse, ParsedResponse } from '../parser/response-parser.js';
import {
  buildRefinePrompt,
  buildOptionsPrompt,
  buildFinalizePrompt,
} from '../prompts/templates.js';
import { trace } from '../trace.js';

export type OrchestratorState =
  | 'idle'
  | 'refining'
  | 'presenting-options'
  | 'finalizing'
  | 'done';

/**
 * Drives the multi-turn refinement flow. Owns the state machine and the
 * task tracker; uses the AI bridge to talk to the user's AI and the parser
 * to read the replies.
 */
export class Orchestrator {
  private _state: OrchestratorState = 'idle';
  private tracker: TaskTracker | null = null;

  constructor(private readonly bridge: AIBridge) {}

  get state(): OrchestratorState {
    return this._state;
  }

  /** Begin: send the refine meta-prompt for the user's vague request. */
  async start(userRequest: string): Promise<ParsedResponse> {
    trace('Orchestrator.start');
    this.tracker = new TaskTracker(userRequest);
    this._state = 'refining';
    const raw = await this.bridge.sendAndAwaitResponse(buildRefinePrompt(userRequest));
    const parsed = parseResponse(raw);
    trace('Orchestrator.start: parsed', parsed.kind);
    return parsed;
  }

  /** Record a user's answer to a clarifying question. */
  recordAnswer(question: string, answer: string): void {
    if (!this.tracker) throw new Error('Orchestrator: start() must be called first');
    this.tracker.recordAnswer(question, answer);
  }

  /** Ask the AI for the 5 detailed option prompts. */
  async requestOptions(): Promise<ParsedResponse> {
    trace('Orchestrator.requestOptions');
    if (!this.tracker) throw new Error('Orchestrator: start() must be called first');
    const snap = this.tracker.snapshot();
    const raw = await this.bridge.sendAndAwaitResponse(
      buildOptionsPrompt({ goalSummary: snap.goalSummary, answers: snap.answers }),
    );
    const parsed = parseResponse(raw);
    trace('Orchestrator.requestOptions: parsed', parsed.kind);
    this._state = 'presenting-options';
    return parsed;
  }

  /** Send the user's chosen final prompt and return the AI's real answer. */
  async finalize(chosenPrompt: string): Promise<string> {
    trace('Orchestrator.finalize');
    this._state = 'finalizing';
    const answer = await this.bridge.sendAndAwaitResponse(buildFinalizePrompt(chosenPrompt));
    this._state = 'done';
    return answer;
  }

  reset(): void {
    this._state = 'idle';
    this.tracker = null;
  }
}
