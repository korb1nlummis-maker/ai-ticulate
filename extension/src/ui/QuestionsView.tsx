import { useState } from 'react';

type Question = { question: string; suggestions: string[] };
type Answer = { question: string; answer: string };

type QuestionsViewProps = {
  questions: Question[];
  onSubmit: (answers: Answer[]) => void;
};

export function QuestionsView({ questions, onSubmit }: QuestionsViewProps) {
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''));

  function setAnswer(index: number, value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleContinue() {
    onSubmit(
      questions.map((q, i) => ({ question: q.question, answer: answers[i] ?? '' })),
    );
  }

  return (
    <div className="ait-questions">
      <div className="ait-subtitle">
        A few quick details so your prompt lands well. Tap a suggestion or type your own.
      </div>
      {questions.map((q, i) => (
        <div className="ait-question-block" key={i}>
          <div className="ait-question">{q.question}</div>
          {q.suggestions.length > 0 && (
            <div className="ait-chips">
              {q.suggestions.map((s, j) => (
                <button
                  key={j}
                  className={
                    answers[i] === s ? 'ait-chip ait-chip-selected' : 'ait-chip'
                  }
                  type="button"
                  aria-pressed={answers[i] === s}
                  onClick={() => setAnswer(i, s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <input
            className="ait-input"
            value={answers[i] ?? ''}
            placeholder="Or type your own answer"
            aria-label={`Your answer to: ${q.question}`}
            onChange={(e) => setAnswer(i, e.target.value)}
          />
        </div>
      ))}
      <button className="ait-button ait-button-block" onClick={handleContinue}>
        Continue
      </button>
    </div>
  );
}
