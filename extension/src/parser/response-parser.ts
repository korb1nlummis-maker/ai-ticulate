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
  // Markers may be plain-text lines (the format we now ask for, since AIs
  // render markdown) OR carry a leading "#" run (older "### QUESTION" form, or
  // an AI that still applies markdown). Accept an OPTIONAL "#" run either way.
  if (/^#{0,6}\s*OPTION\s*\d+\s*$/i.test(t)) return 'option';
  if (/^#{0,6}\s*QUESTION\s*$/i.test(t)) return 'question';
  if (/^#{0,6}\s*SUGGESTIONS\s*$/i.test(t)) return 'suggestions';
  if (/^#{0,6}\s*STATUS\s*$/i.test(t)) return 'status';
  // Some other markdown heading — requires at least one "#" followed by a
  // space, so plain content lines are not misclassified as markers.
  if (/^#{1,6}\s/.test(t)) return 'other-marker';
  return 'content';
}

/**
 * Normalize marker lines: if a line begins with a marker (QUESTION,
 * SUGGESTIONS, STATUS, OPTION n) and has content on the same line, split it
 * into two lines — marker alone, then the rest as content. Claude on claude.ai
 * frequently emits "QUESTION What is the website for?" inline; this makes the
 * line-by-line scanner work with that form as well as the explicit two-line
 * form.
 */
function normalizeMarkerLines(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  // Match: optional leading #s, the marker word(s), then a separator (whitespace,
  // colon, dash), then the inline content (captured).
  const splitRe =
    /^(\s*#{0,6}\s*(?:QUESTION|SUGGESTIONS|STATUS|OPTION\s*\d+))[:\s\-.—–]+(.+)$/i;
  for (const line of lines) {
    const m = line.match(splitRe);
    if (m && m[2] !== undefined) {
      // Push the marker portion alone, then the inline content as its own line.
      // Trim the marker so classify()'s regex anchors hit cleanly.
      out.push(m[1]!.trim());
      out.push(m[2]!);
    } else {
      out.push(line);
    }
  }
  return out.join('\n');
}

/**
 * Parse the AI's raw reply text into structured data. The AI was instructed
 * (by the meta-prompt templates) to use plain-text QUESTION / SUGGESTIONS /
 * OPTION n / STATUS marker lines. `classify()` also tolerates an optional
 * leading "#" run, so the older "### QUESTION" form still parses. This scanner
 * is deliberately tolerant of extra prose around the markers, since models
 * sometimes add a greeting.
 */
export function parseResponse(raw: string): ParsedResponse {
  const normalized = normalizeMarkerLines(raw);
  const lines = normalized.split(/\r?\n/);
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
