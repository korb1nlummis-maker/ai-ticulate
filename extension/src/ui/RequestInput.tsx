import { useState } from 'react';

type RequestInputProps = { onSubmit: (text: string) => void };

export function RequestInput({ onSubmit }: RequestInputProps) {
  const [text, setText] = useState('');

  function handleSubmit() {
    const trimmed = text.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <div>
      <textarea
        className="ait-textarea"
        placeholder="What do you want to ask your AI?"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="ait-button" onClick={handleSubmit}>
        Help me ask this
      </button>
    </div>
  );
}
