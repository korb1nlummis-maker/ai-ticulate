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
};

export function Panel(props: PanelProps) {
  const { view } = props;
  return (
    <div className="ait-panel">
      <div className="ait-header">
        <span>ai-ticulate</span>
        <button className="ait-button" onClick={props.onClose} aria-label="Close">
          ×
        </button>
      </div>
      {view.kind === 'idle' && <RequestInput onSubmit={props.onSubmitRequest} />}
      {view.kind === 'loading' && <p>{view.message}</p>}
      {view.kind === 'questions' && (
        <QuestionsView questions={view.questions} onSubmit={props.onAnswerQuestions} />
      )}
      {view.kind === 'options' && (
        <OptionsView options={view.options} onPick={props.onPickOption} />
      )}
      {view.kind === 'done' && (
        <div>
          <p>Sent! Your AI is answering the refined prompt.</p>
          <p className="ait-preview">{view.finalAnswerPreview}</p>
        </div>
      )}
      {view.kind === 'error' && <p className="ait-error">{view.message}</p>}
    </div>
  );
}
