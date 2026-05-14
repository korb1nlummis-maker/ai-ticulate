type LauncherProps = { onClick: () => void };

export function Launcher({ onClick }: LauncherProps) {
  return (
    <button
      className="ait-launcher"
      onClick={onClick}
      aria-label="Open ai-ticulate — sharpen your prompt"
      title="ai-ticulate"
    >
      ✨
    </button>
  );
}
