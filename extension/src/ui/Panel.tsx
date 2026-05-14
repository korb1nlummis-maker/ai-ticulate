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
  | { kind: 'error'; message: string };

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
          <div className="ait-error">
            <div className="ait-error-box" role="alert">
              {view.message}
            </div>
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
      </div>
    </div>
  );
}
