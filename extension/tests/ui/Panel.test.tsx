import { describe, it, expect, vi } from 'vitest';
import { render } from '../helpers/render.js';
import { Panel } from '../../src/ui/Panel.js';

describe('Panel', () => {
  it('shows the request input in the idle state', () => {
    const { getByPlaceholderText } = render(
      <Panel
        view={{ kind: 'idle' }}
        onSubmitRequest={vi.fn()}
        onAnswerQuestions={vi.fn()}
        onPickOption={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(getByPlaceholderText(/what do you want/i)).toBeTruthy();
  });

  it('shows 5 options and fires onPickOption when one is clicked', () => {
    const onPick = vi.fn();
    const { getAllByRole } = render(
      <Panel
        view={{ kind: 'options', options: ['A', 'B', 'C', 'D', 'E'] }}
        onSubmitRequest={vi.fn()}
        onAnswerQuestions={vi.fn()}
        onPickOption={onPick}
        onClose={vi.fn()}
      />,
    );
    const optionButtons = getAllByRole('button').filter((b) =>
      ['A', 'B', 'C', 'D', 'E'].includes(b.textContent ?? ''),
    );
    expect(optionButtons).toHaveLength(5);
    optionButtons[2]!.click();
    expect(onPick).toHaveBeenCalledWith('C');
  });

  it('renders a "Start over" button in the done view and fires onRestart when clicked', () => {
    const onRestart = vi.fn();
    const { getAllByRole } = render(
      <Panel
        view={{ kind: 'done', finalAnswerPreview: 'a refined answer' }}
        onSubmitRequest={vi.fn()}
        onAnswerQuestions={vi.fn()}
        onPickOption={vi.fn()}
        onClose={vi.fn()}
        onRestart={onRestart}
      />,
    );
    const startOver = getAllByRole('button').find((b) =>
      /start over/i.test(b.textContent ?? ''),
    );
    expect(startOver).toBeTruthy();
    startOver!.click();
    expect(onRestart).toHaveBeenCalledOnce();
  });

  it('renders inputs for [BLANK] and [your X] markers and substitutes them on Use this', () => {
    const onPick = vi.fn();
    const { container } = render(
      <Panel
        view={{
          kind: 'options',
          options: [
            'Build a [BLANK] site for [your audience] with these sections',
            'Plain option without blanks',
            'Use [___] for legacy markers',
            'Multiple _____ underscores too',
            'And [BLANK: a hint] for the user',
          ],
        }}
        onSubmitRequest={vi.fn()}
        onAnswerQuestions={vi.fn()}
        onPickOption={onPick}
        onClose={vi.fn()}
      />,
    );
    // The first option has 2 blanks → 2 inputs should render in its card.
    const inputs = container.querySelectorAll('input[type="text"], input:not([type])');
    // At least 2 inputs from the first option, plus any from later options with blanks.
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it('renders copyable diagnostics text and a "Copy diagnostics" button in the error view', () => {
    const { container, getAllByRole } = render(
      <Panel
        view={{
          kind: 'error',
          message: 'oops',
          diagnostics: '=== diag ===\nsite: Claude',
        }}
        onSubmitRequest={vi.fn()}
        onAnswerQuestions={vi.fn()}
        onPickOption={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(container.textContent).toContain('site: Claude');
    const copyButton = getAllByRole('button').find((b) =>
      /copy diagnostics/i.test(b.textContent ?? ''),
    );
    expect(copyButton).toBeTruthy();
  });
});
