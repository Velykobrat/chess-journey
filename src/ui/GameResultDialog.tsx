import { DIFFICULTIES } from "../game/controller.ts";
import { Dialog } from "./Dialog.tsx";
import type { GameView } from "./types.ts";
export function GameResultDialog({ view, onRematch, onSettings, onReview }: {
  view: GameView; onRematch: () => void; onSettings: () => void; onReview: () => void;
}) {
  const result = view.result!;
  return <Dialog kind="result" titleId="result-title" descriptionId="result-description" onDismiss={onReview}>
    <div className="result-symbol" aria-hidden="true">{result.symbol}</div><p className="eyebrow">GAME OVER</p>
    <h2 id="result-title">{result.title}</h2><p className="result-description" id="result-description">{result.description}</p>
    <div className="result-meta"><span>{DIFFICULTIES[view.difficulty].label}</span><span aria-hidden="true">·</span>
      <span>You played {view.playerColor === 'w' ? 'White' : 'Black'}</span><span aria-hidden="true">·</span>
      <span>{Math.ceil(view.moveHistory.length / 2)} moves</span>
    </div>
    <div className="result-actions">
      <button className="start-game-button" type="button" onClick={onRematch}>Rematch</button>
      <button className="secondary-button" type="button" onClick={onSettings}>Change settings</button>
      <button className="secondary-button" type="button" onClick={onReview}>Review game</button>
    </div>
  </Dialog>;
}
