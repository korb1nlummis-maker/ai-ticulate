export type TaskSnapshot = {
  goalSummary: string;
  answers: string[];
};

/**
 * Holds the evolving understanding of what the user is trying to accomplish.
 * Fed into meta-prompts so context compounds across turns.
 */
export class TaskTracker {
  private _goalSummary: string;
  private _answers: string[] = [];

  constructor(originalRequest: string) {
    this._goalSummary = originalRequest;
  }

  get goalSummary(): string {
    return this._goalSummary;
  }

  get answers(): string[] {
    return [...this._answers];
  }

  recordAnswer(question: string, answer: string): void {
    this._answers.push(`${question} — ${answer}`);
  }

  refineGoal(newSummary: string): void {
    this._goalSummary = newSummary;
  }

  snapshot(): TaskSnapshot {
    return { goalSummary: this._goalSummary, answers: [...this._answers] };
  }
}
