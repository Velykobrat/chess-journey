import { useState } from "react";
import { describePosition, moveCoordinates } from "./keyboard-move.ts";
export function KeyboardMove({ position, canMove, onMove }: { position: string; canMove: boolean; onMove: (from: string, to: string) => boolean }) {
  const [feedback, setFeedback] = useState({ position: '', text: '' });
  return <details className="keyboard-controls"><summary>Keyboard moves</summary>
    <p id="keyboard-help">Enter source and destination squares, then submit. Promotion opens the piece picker.</p>
    <p id="board-position" className="visually-hidden">{describePosition(position)}</p>
    <form onSubmit={event => {
      event.preventDefault();
      if (!canMove) return;
      const data = new FormData(event.currentTarget);
      const move = moveCoordinates(String(data.get('from') ?? ''), String(data.get('to') ?? ''));
      setFeedback({ position, text: move && onMove(move.from, move.to) ? 'Move submitted.' : 'That move is not legal. Check the squares and try again.' });
    }}>
      <fieldset disabled={!canMove} aria-describedby="keyboard-help board-position">
        <legend className="visually-hidden">Enter a chess move</legend>
        <label>From<input name="from" placeholder="e2" required pattern="[a-hA-H][1-8]" maxLength={2} autoComplete="off" autoCapitalize="none" spellCheck={false} /></label>
        <label>To<input name="to" placeholder="e4" required pattern="[a-hA-H][1-8]" maxLength={2} autoComplete="off" autoCapitalize="none" spellCheck={false} /></label>
        <button type="submit" className="secondary-button">Move</button>
      </fieldset>
    </form>
    <p role="status" aria-atomic="true">{canMove ? (feedback.position === position ? feedback.text : '') : 'Moves are available on your turn when the engine is ready.'}</p>
  </details>;
}
