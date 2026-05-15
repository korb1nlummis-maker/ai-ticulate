import { useState } from 'react';

/**
 * A blank in an option's text: matches the canonical [BLANK]/[BLANK: hint],
 * the legacy [___], standalone 4+ underscores, and common natural-language
 * placeholders like [your name] / [insert date] / [fill in X].
 *
 * Why so many forms? The AI doesn't always follow our instruction to use
 * [BLANK] literally — it sometimes emits the legacy `[___]`, raw underscores,
 * or English-language placeholders. We accept all of them so the user can
 * fill any of them in.
 */
export const BLANK_PATTERN =
  /\[BLANK(?::[^\]]*)?\]|\[_{2,}\]|_{4,}|\[(?:your|insert|fill[ -]?in|choose|enter|x|something)[^\]]*\]/gi;

// A /g regex is stateful (lastIndex), and both .test() and matchAll() interact
// with that state — so reusing the module-level instance across calls causes
// missed matches. We build a fresh instance per call from the same source.
function freshBlankPattern(): RegExp {
  return new RegExp(BLANK_PATTERN.source, BLANK_PATTERN.flags);
}

function splitOnBlanks(text: string): { segments: string[]; blanks: string[] } {
  const segments: string[] = [];
  const blanks: string[] = [];
  let lastIndex = 0;
  for (const m of text.matchAll(freshBlankPattern())) {
    if (m.index === undefined) continue;
    segments.push(text.slice(lastIndex, m.index));
    blanks.push(m[0]);
    lastIndex = m.index + m[0].length;
  }
  segments.push(text.slice(lastIndex));
  return { segments, blanks };
}

function hasBlanks(text: string): boolean {
  return freshBlankPattern().test(text);
}

function placeholderForBlank(blankMarker: string): string {
  // Try to extract a hint between [BLANK: ...] or from natural-language forms like [your name].
  const colonMatch = /^\[BLANK:\s*([^\]]+)\]$/i.exec(blankMarker);
  if (colonMatch) return colonMatch[1]!.trim();
  const naturalMatch =
    /^\[((?:your|insert|fill[ -]?in|choose|enter|x|something)[^\]]*)\]$/i.exec(blankMarker);
  if (naturalMatch) return naturalMatch[1]!.trim();
  return 'fill in';
}

type OptionsViewProps = {
  options: string[];
  onPick: (finalPrompt: string) => void;
};

function OptionWithBlanks({
  option,
  onPick,
}: {
  option: string;
  onPick: (finalPrompt: string) => void;
}) {
  const { segments, blanks } = splitOnBlanks(option);
  const [values, setValues] = useState<string[]>(() => blanks.map(() => ''));

  function setValue(index: number, value: string) {
    setValues((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleUse() {
    // Interleave segments and (filled or original) blank markers. If a blank
    // was left empty, we keep the ORIGINAL marker in the output so the user
    // can see at-a-glance what they forgot if they retry. Blanks are hints,
    // not requirements — empty submission is still allowed.
    let result = '';
    segments.forEach((seg, i) => {
      result += seg;
      if (i < segments.length - 1) {
        const v = values[i] ?? '';
        result += v.length > 0 ? v : blanks[i] ?? '';
      }
    });
    onPick(result);
  }

  return (
    <div className="ait-option">
      <div className="ait-option-text">
        {segments.map((seg, i) => (
          <span key={i}>
            {seg}
            {i < segments.length - 1 && (
              <input
                className="ait-input"
                value={values[i] ?? ''}
                placeholder={placeholderForBlank(blanks[i] ?? '')}
                aria-label="Fill in the blank"
                onChange={(e) => setValue(i, e.target.value)}
              />
            )}
          </span>
        ))}
      </div>
      <button
        className="ait-button ait-button-block"
        type="button"
        onClick={handleUse}
      >
        Use this
      </button>
    </div>
  );
}

export function OptionsView({ options, onPick }: OptionsViewProps) {
  return (
    <div className="ait-options">
      <div className="ait-subtitle">
        Pick the version that fits best. Some have blanks you can personalize.
      </div>
      {options.map((option, i) =>
        hasBlanks(option) ? (
          <OptionWithBlanks key={i} option={option} onPick={onPick} />
        ) : (
          <button
            key={i}
            className="ait-option"
            type="button"
            onClick={() => onPick(option)}
          >
            <span className="ait-option-text">{option}</span>
          </button>
        ),
      )}
    </div>
  );
}
