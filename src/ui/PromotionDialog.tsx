import type { PlayerColor, PromotionPiece } from "../game/controller.ts";
import { Dialog } from "./Dialog.tsx";
const pieces = [['q', 'Queen'], ['r', 'Rook'], ['b', 'Bishop'], ['n', 'Knight']] as const;
const symbols = { w: { q: '♕', r: '♖', b: '♗', n: '♘' }, b: { q: '♛', r: '♜', b: '♝', n: '♞' } };
export function PromotionDialog({ color, onSelect }: { color: PlayerColor; onSelect: (piece: PromotionPiece) => void }) {
  return <Dialog kind="promotion" titleId="promotion-title" descriptionId="promotion-help">
    <p className="eyebrow">PAWN PROMOTION</p><h2 id="promotion-title">Choose your piece</h2>
    <p className="visually-hidden" id="promotion-help">Choose a piece to complete the move.</p>
    <div className="promotion-grid">{pieces.map(([piece, label]) =>
      <button key={piece} type="button" className="promotion-option" onClick={() => onSelect(piece)}>
        <strong aria-hidden="true">{symbols[color][piece]}</strong><span>{label}</span>
      </button>)}</div>
  </Dialog>;
}
