import { Chessboard } from "react-chessboard";
import { DIFFICULTIES } from "../game/controller.ts";
import { KeyboardMove } from "./KeyboardMove.tsx";
import { useReducedMotion } from "./useReducedMotion.ts";
import type { GameView } from "./types.ts";
export function GameBoard({ view, onMove }: { view: GameView; onMove: (from: string, to: string | null) => boolean }) {
  const reducedMotion = useReducedMotion();
  const { position, orientation, lastMove, canMove, engineStatus, difficulty, playerColor } = view;
  return <section className="board-section" aria-label="Game board">
    <div className="player-card player-card--opponent"><div className="player-avatar" aria-hidden="true">AI</div>
      <div className="player-info"><strong>Stockfish</strong><span role="status" aria-atomic="true">{DIFFICULTIES[difficulty].label} · {engineStatus}</span></div>
      <div className="player-rating" aria-hidden="true">AI</div>
    </div>
    <div className="board-frame" role="group" aria-label={`Chess board, ${orientation} at the bottom`}>
      <Chessboard options={{
        id: 'chess-journey-board', position, boardOrientation: orientation,
        onPieceDrop: ({ sourceSquare, targetSquare }) => onMove(sourceSquare, targetSquare),
        allowDragging: canMove, animationDurationInMs: reducedMotion ? 0 : 180, showAnimations: !reducedMotion, showNotation: true,
        lightSquareStyle: { backgroundColor: '#e9e5dc' }, darkSquareStyle: { backgroundColor: '#6f7f68' },
        boardStyle: { borderRadius: '14px', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0, 0, 0, 0.28)' },
        squareStyles: lastMove ? { [lastMove.from]: { backgroundColor: 'rgba(227, 190, 76, 0.50)' }, [lastMove.to]: { backgroundColor: 'rgba(227, 190, 76, 0.62)' } } : {},
      }} />
    </div>
    <div className="player-card"><div className="player-avatar player-avatar--you" aria-hidden="true">YOU</div>
      <div className="player-info"><strong>You</strong><span>Playing {playerColor === 'w' ? 'White' : 'Black'}</span></div><div className="player-rating">Unrated</div>
    </div>
    <KeyboardMove key={view.showSetup ? "setup" : "game"} position={position} canMove={canMove} onMove={onMove} />
  </section>;
}
