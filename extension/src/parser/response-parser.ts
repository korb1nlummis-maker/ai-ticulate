export type ParsedQuestion = { question: string; suggestions: string[] };

export type ParsedResponse =
  | { kind: 'questions'; questions: ParsedQuestion[]; status: 'ready' | 'need-more' }
  | { kind: 'options'; options: string[] }
  | { kind: 'unknown'; raw: string };

/** Marker classification for a single line. */
type MarkerType =
  | 'option'
  | 'question'
  | 'suggestions'
  | 'status'
  | 'other-marker'
  | 'content';

function classify(line: string): MarkerType {
  const t = line.trim();
  if (/^###\s*OPTION\s*\d+\s*$/i.test(t)) return 'option';
  if (/^###\s*QUESTION\s*$/i.test(t)) return 'question';
  if (/^###\s*SUGGESTIONS\s*$/i.test(t)) return 'suggestions';
  if (/^###\s*STATUS\s*$/i.test(t)) return 'status';
  if (/^###/.test(t)) return 'other-marker';
  return 'content';
}

/**
 * Parse the AI's raw reply text into structured data. The AI was instructed
 * (by the meta-prompt templates) to use ### QUESTION / ### SUGGESTIONS /
 * ### OPTION n / ### STATUS markers. This scanner is deliberately tolerant of
 * extra prose around the markers, since models sometimes add a greeting.
 */
export function parseResponse(raw: string): ParsedResponse {
  const lines = raw.split(/\r?\n/);
  const markers = lines.map(classify);

  const hasOptions = markers.some((m) => m === 'option');
  const hasQuestionsOrStatus = markers.some(
    (m) => m === 'question' || m === 'status',
  );

  if (hasOptions) {
    return { kind: 'options', options: scanOptions(lines, markers) };
  }
  if (hasQuestionsOrStatus) {
    return scanQuestions(lines, markers);
  }
  return { kind: 'unknown', raw };
}

function scanOptions(lines: string[], markers: MarkerType[]): string[] {
  const options: string[] = [];
  let current: string[] | null = null;

  const flush = (): void => {
    if (current !== null) {
      const text = current.join('\n').trim();
      if (text.length > 0) options.push(text);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const marker = markers[i]!;
    if (marker === 'option') {
      flush();
      current = [];
    } else if (marker !== 'content') {
      // Any non-option marker ends the current option block.
      flush();
      current = null;
    } else if (current !== null) {
      // A blank line after the body has started ends the option block —
      // this separates a multi-line body (contiguous lines) from trailing
      // sign-off prose the model may have appended.
      if (lines[i]!.trim().length === 0 && current.length > 0) {
        flush();
        current = null;
      } else {
        current.push(lines[i]!);
      }
    }
  }
  flush();
  return options;
}

function scanQuestions(lines: string[], markers: MarkerType[]): ParsedResponse {
  const questions: ParsedQuestion[] = [];
  let status: 'ready' | 'need-more' = 'need-more';

  type Mode = 'none' | 'question' | 'suggestions' | 'status';
  let mode: Mode = 'none';
  let currentQuestion: string[] = [];
  let currentSuggestions: string[] = [];

  const flushQuestion = (): void => {
    const q = currentQuestion.join(' ').trim();
    if (q.length > 0) {
      questions.push({
        question: q,
        suggestions: currentSuggestions
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      });
    }
    currentQuestion = [];
    currentSuggestions = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const marker = markers[i]!;
    if (marker === 'question') {
      if (mode === 'question' || mode === 'suggestions') flushQuestion();
      mode = 'question';
    } else if (marker === 'suggestions') {
      mode = 'suggestions';
    } else if (marker === 'status') {
      if (mode === 'question' || mode === 'suggestions') flushQuestion();
      mode = 'status';
    } else if (marker === 'option' || marker === 'other-marker') {
      if (mode === 'question' || mode === 'suggestions') flushQuestion();
      mode = 'none';
    } else {
      // content line
      if (mode === 'question') {
        currentQuestion.push(lines[i]!);
      } else if (mode === 'suggestions') {
        currentSuggestions.push(lines[i]!);
      } else if (mode === 'status') {
        const t = lines[i]!.trim().toLowerCase();
        if (t === 'ready') status = 'ready';
        else if (t === 'need-more') status = 'need-more';
      }
    }
  }
  if (mode === 'question' || mode === 'suggestions') flushQuestion();

  return { kind: 'questions', questions, status };
}
