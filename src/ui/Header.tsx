export function Header({ onFlip }: { onFlip: () => void }) {
  return <header className="topbar">
    <a className="brand" href="/"><span className="brand-mark" aria-hidden="true">♞</span>
      <span><strong>Chess Journey</strong><small>Play · Learn · Improve</small></span>
    </a>
    <div className="topbar-actions"><span className="version-badge">Local play</span>
      <button className="icon-button" type="button" onClick={onFlip} aria-label="Flip board" title="Flip board">↻</button>
    </div>
  </header>;
}
