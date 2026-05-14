import { useState } from 'react';
import { RequestInput } from './RequestInput.js';
import { QuestionsView } from './QuestionsView.js';
import { OptionsView } from './OptionsView.js';
import './styles.css';

export type PanelView =
  | { kind: 'idle' }
  | { kind: 'loading'; message: string }
  | { kind: 'questions'; questions: { question: string; suggestions: string[] }[] }
  | { kind: 'options'; options: string[] }
  | { kind: 'done'; finalAnswerPreview: string }
  | { kind: 'error'; message: string; diagnostics?: string };

export type PanelProps = {
  view: PanelView;
  onSubmitRequest: (text: string) => void;
  onAnswerQuestions: (answers: { question: string; answer: string }[]) => void;
  onPickOption: (finalPrompt: string) => void;
  onClose: () => void;
  onRestart?: () => void;
};

export function Panel(props: PanelProps) {
  const { view } = props;
  return (
    <div className="ait-panel" role="dialog" aria-label="ai-ticulate">
      <div className="ait-header">
        <span className="ait-header-title">
          <span className="ait-header-mark" aria-hidden="true">
            ✨
          </span>
          ai-ticulate
        </span>
        <button className="ait-close" onClick={props.onClose} aria-label="Close panel">
          ×
        </button>
      </div>

      <div className="ait-body">
        {view.kind === 'idle' && <RequestInput onSubmit={props.onSubmitRequest} />}

        {view.kind === 'loading' && (
          <div className="ait-loading" role="status" aria-live="polite">
            <span className="ait-spinner" aria-hidden="true" />
            <span className="ait-loading-text">{view.message}</span>
          </div>
        )}

        {view.kind === 'questions' && (
          <QuestionsView questions={view.questions} onSubmit={props.onAnswerQuestions} />
        )}

        {view.kind === 'options' && (
          <OptionsView options={view.options} onPick={props.onPickOption} />
        )}

        {view.kind === 'done' && (
          <div className="ait-done">
            <div className="ait-done-headline">Sent! ✨</div>
            <div className="ait-done-sub">
              Your AI is answering the refined prompt. Here&apos;s a preview:
            </div>
            <p className="ait-preview">{view.finalAnswerPreview}</p>
            {props.onRestart && (
              <button
                className="ait-button ait-button-secondary ait-button-block"
                onClick={props.onRestart}
              >
                Start over
              </button>
            )}
          </div>
        )}

        {view.kind === 'error' && (
          <ErrorView
            message={view.message}
            diagnostics={view.diagnostics}
            onRestart={props.onRestart}
          />
        )}
      </div>
    </div>
  );
}

/**
 * The error view. Shows the friendly message, and — when present — the full
 * plain-text diagnostics in a calm monospace box with a one-click
 * "Copy diagnostics" button so a non-technical user can paste it straight back.
 */
function ErrorView({
  message,
  diagnostics,
  onRestart,
}: {
  message: string;
  diagnostics?: string;
  onRestart?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!diagnostics) return;
    void navigator.clipboard.writeText(diagnostics).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="ait-error">
      <div className="ait-error-box" role="alert">
        {message}
      </div>
      {diagnostics && (
        <>
          <pre className="ait-diagnostics">{diagnostics}</pre>
          <button
            className="ait-button ait-button-secondary ait-button-block"
            onClick={copy}
          >
            {copied ? 'Copied!' : 'Copy diagnostics'}
          </button>
        </>
      )}
      {onRestart && (
        <button
          className="ait-button ait-button-secondary ait-button-block"
          onClick={onRestart}
        >
          Start over
        </button>
      )}
    </div>
  );
}
