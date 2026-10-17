import { JourneyCard } from "../progress/JourneyCard.tsx";
import type { ProgressStore } from "../progress/store.ts";
import type { GameView } from "./types.ts";
export function GamePanel({ view, progress, onRetry, onNewGame, onUndo }: {
  view: GameView; progress: ProgressStore; onRetry: () => void; onNewGame: () => void; onUndo: () => void;
}) {
  const rows = Array.from({ length: Math.ceil(view.moveHistory.length / 2) }, (_, i) => ({ number: i + 1, white: view.moveHistory[i * 2], black: view.moveHistory[i * 2 + 1] }));
  return <aside className="game-panel" aria-labelledby="game-title">
    <div className="game-panel__header"><div><p className="eyebrow">CASUAL GAME</p><h1 id="game-title">Play chess</h1></div><span className="status-dot" aria-hidden="true" /></div>
    <div className="game-status" role="status" aria-atomic="true"><span>{view.status.label}</span><strong>{view.status.text}</strong></div>
    <div className="moves-panel"><div className="panel-heading"><span id="moves-title">Moves</span><small>{view.moveHistory.length} played</small></div>
      <div className="moves-list" role="region" aria-labelledby="moves-title" tabIndex={0}>
        {rows.length === 0 ? <div className="empty-state"><span aria-hidden="true">♟</span><p>Your moves will appear here.</p></div> : rows.map(move =>
          <div className="move-row" key={move.number}><span className="move-number">{move.number}.</span><span>{move.white ?? ''}</span><span>{move.black ?? ''}</span></div>)}
      </div>
    </div>
    <div className="game-actions">
      {view.engineError && <button className="secondary-button" type="button" onClick={onRetry}>Retry engine</button>}
      <button className="primary-button" type="button" onClick={onNewGame}>New game</button>
      <button className="secondary-button" type="button" onClick={onUndo} disabled={!view.canUndo} title={view.completedGame ? 'Completed games cannot be undone' : 'Undo your last turn'}>Undo move</button>
    </div>
    <JourneyCard store={progress} />
  </aside>;
}
