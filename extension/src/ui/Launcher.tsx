type LauncherProps = { onClick: () => void };

/**
 * The floating launcher button. Uses an inline white sparkle SVG (the same
 * silhouette as the icon) so it reads as crisp at any DPI rather than
 * relying on the emoji font, which varies a lot between hosts/OSes.
 */
export function Launcher({ onClick }: LauncherProps) {
  return (
    <button
      className="ait-launcher"
      onClick={onClick}
      aria-label="Open ai-ticulate — sharpen your prompt"
      title="ai-ticulate"
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8 Z"
          fill="#ffffff"
        />
        <circle cx="19" cy="5.5" r="1.5" fill="rgba(255,255,255,0.85)" />
      </svg>
    </button>
  );
}
