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

/**
 * Inline sparkle SVG used in the header. Rendered in the accent gradient
 * via currentColor so it matches the logo identity without loading the PNG.
 */
function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="ait-spark-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path
        d="M12 2 L13 10 L21 12 L13 14 L12 22 L11 14 L3 12 L11 10 Z"
        fill="url(#ait-spark-grad)"
      />
      <circle cx="19" cy="5" r="1.4" fill="#a855f7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M5 12.5 L10 17.5 L19 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M12 3 L22 20 L2 20 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M12 10 L12 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

export function Panel(props: PanelProps) {
  const { view } = props;
  return (
    <div className="ait-panel" role="dialog" aria-label="ai-ticulate">
      <div className="ait-header">
        <div className="ait-header-main">
          <span className="ait-header-title">
            <span className="ait-header-mark" aria-hidden="true">
              <SparkleIcon />
            </span>
            ai-ticulate
          </span>
          {view.kind === 'idle' && (
            <span className="ait-header-subtitle">
              Sharpen your prompt for better answers.
            </span>
          )}
        </div>
        <button className="ait-close" onClick={props.onClose} aria-label="Close panel">
          ×
        </button>
      </div>

      <div className="ait-body">
        {view.kind === 'idle' && <RequestInput onSubmit={props.onSubmitRequest} />}

        {view.kind === 'loading' && (
          <div className="ait-loading" role="status" aria-live="polite">
            <span className="ait-loading-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
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
            <span className="ait-done-check" aria-hidden="true">
              <CheckIcon />
            </span>
            <div className="ait-done-headline">Sent! ✨</div>
            <div className="ait-done-sub">
              Your AI is answering the refined prompt. Here&apos;s a preview:
            </div>
            <p className="ait-preview">{view.finalAnswerPreview}</p>
            {props.onRestart && (
              <button
                className="ait-button ait-button-primary ait-button-block"
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
        <span className="ait-error-icon" aria-hidden="true">
          <WarningIcon />
        </span>
        <span className="ait-error-message">{message}</span>
      </div>
      {diagnostics && (
        <>
          <pre className="ait-diagnostics">{diagnostics}</pre>
          <button
            className="ait-button ait-button-block"
            onClick={copy}
          >
            {copied ? 'Copied!' : 'Copy diagnostics'}
          </button>
        </>
      )}
      {onRestart && (
        <button
          className="ait-button ait-button-primary ait-button-block"
          onClick={onRestart}
        >
          Start over
        </button>
      )}
    </div>
  );
}
