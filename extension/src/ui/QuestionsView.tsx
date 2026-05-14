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
    <div>
      {questions.map((q, i) => (
        <div key={i}>
          <div className="ait-question">{q.question}</div>
          <div>
            {q.suggestions.map((s, j) => (
              <button
                key={j}
                className="ait-chip"
                type="button"
                onClick={() => setAnswer(i, s)}
              >
                {s}
              </button>
            ))}
          </div>
          <input
            className="ait-input"
            value={answers[i] ?? ''}
            placeholder="Or type your own answer"
            onChange={(e) => setAnswer(i, e.target.value)}
          />
        </div>
      ))}
      <button className="ait-button" onClick={handleContinue}>
        Continue
      </button>
    </div>
  );
}
