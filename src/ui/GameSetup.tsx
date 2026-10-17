import { DIFFICULTIES, type DifficultyKey, type PlayerColorChoice } from "../game/controller.ts";
import { Dialog } from "./Dialog.tsx";
import type { GameView } from "./types.ts";
export function GameSetup({ view, onColor, onDifficulty, onStart }: {
  view: GameView; onColor: (color: PlayerColorChoice) => void;
  onDifficulty: (difficulty: DifficultyKey) => void; onStart: () => void;
}) {
  return <Dialog kind="setup" titleId="setup-title" descriptionId="setup-help">
    <div className="setup-heading"><span className="setup-icon" aria-hidden="true">♞</span>
      <div><p className="eyebrow">NEW GAME</p><h2 id="setup-title">Play vs Stockfish</h2></div>
    </div>
    <div className="setup-section" role="group" aria-labelledby="color-label">
      <span className="setup-label" id="color-label">Your color</span>
      <div className="setup-options setup-options--colors">
        {([['white', '♙', 'White'], ['black', '♟', 'Black'], ['random', '?', 'Random']] as const).map(([color, symbol, label]) =>
          <button key={color} type="button" className={`setup-option ${view.playerColorChoice === color ? 'setup-option--active' : ''}`}
            aria-pressed={view.playerColorChoice === color} onClick={() => onColor(color)}><strong aria-hidden="true">{symbol}</strong><span>{label}</span></button>)}
      </div>
    </div>
    <div className="setup-section" role="group" aria-labelledby="difficulty-label">
      <span className="setup-label" id="difficulty-label">Difficulty</span>
      <div className="difficulty-list">
        {(Object.entries(DIFFICULTIES) as [DifficultyKey, { label: string; skill: number }][]).map(([key, config]) =>
          <button key={key} type="button" className={`difficulty-option ${view.difficulty === key ? 'difficulty-option--active' : ''}`}
            aria-pressed={view.difficulty === key} onClick={() => onDifficulty(key)}><span>{config.label}</span>
            {view.difficulty === key && <strong aria-hidden="true">✓</strong>}
          </button>)}
      </div>
    </div>
    <p className="visually-hidden" role="status" aria-atomic="true">{view.engineStatus}</p>
    <button className="start-game-button" type="button" onClick={onStart} disabled={!view.engineReady && !view.engineError}>
      {view.engineError ? "Retry engine" : view.engineReady ? "Start game" : "Loading engine..."}
    </button>
    <p className="setup-footer" id="setup-help">Choose settings to begin. You can change them before every new game.</p>
  </Dialog>;
}
