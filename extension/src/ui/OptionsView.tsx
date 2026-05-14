import { useState } from 'react';

const BLANK = '[___]';

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
  const segments = option.split(BLANK);
  const [values, setValues] = useState<string[]>(() =>
    segments.slice(1).map(() => ''),
  );

  function setValue(index: number, value: string) {
    setValues((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleUse() {
    let result = '';
    segments.forEach((seg, i) => {
      result += seg;
      if (i < segments.length - 1) result += values[i] ?? '';
    });
    onPick(result);
  }

  return (
    <div className="ait-option">
      <div>
        {segments.map((seg, i) => (
          <span key={i}>
            {seg}
            {i < segments.length - 1 && (
              <input
                className="ait-input"
                value={values[i] ?? ''}
                placeholder="fill in"
                onChange={(e) => setValue(i, e.target.value)}
              />
            )}
          </span>
        ))}
      </div>
      <button className="ait-button" type="button" onClick={handleUse}>
        Use this
      </button>
    </div>
  );
}

export function OptionsView({ options, onPick }: OptionsViewProps) {
  return (
    <div>
      {options.map((option, i) =>
        option.includes(BLANK) ? (
          <OptionWithBlanks key={i} option={option} onPick={onPick} />
        ) : (
          <button
            key={i}
            className="ait-option"
            type="button"
            onClick={() => onPick(option)}
          >
            {option}
          </button>
        ),
      )}
    </div>
  );
}
