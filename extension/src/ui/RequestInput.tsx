import { useState } from 'react';

type RequestInputProps = { onSubmit: (text: string) => void };

export function RequestInput({ onSubmit }: RequestInputProps) {
  const [text, setText] = useState('');

  function handleSubmit() {
    const trimmed = text.trim();
    if (trimmed) onSubmit(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd/Ctrl + Enter submits — the meta key for Mac, ctrl for everyone else.
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="ait-request">
      <div className="ait-intro">
        <div className="ait-intro-title">What do you want to ask your AI?</div>
        <div className="ait-subtitle">
          Type it however it comes out — even rough or vague. ai-ticulate will ask a
          couple of quick questions, then hand you a sharper prompt to send.
        </div>
      </div>
      <textarea
        className="ait-textarea"
        placeholder="What do you want to ask your AI?"
        aria-label="Your request"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        className="ait-button ait-button-primary ait-button-block"
        onClick={handleSubmit}
      >
        Help me ask this
      </button>
      <div className="ait-helper">Press Cmd/Ctrl+Enter to submit.</div>
    </div>
  );
}
