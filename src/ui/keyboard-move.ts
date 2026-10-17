import { Chess } from "chess.js";
export function moveCoordinates(from: string, to: string) {
  const source = from.trim().toLowerCase(); const target = to.trim().toLowerCase();
  return /^[a-h][1-8]$/.test(source) && /^[a-h][1-8]$/.test(target) ? { from: source, to: target } : null;
}
export function describePosition(fen: string) {
  const names = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  return new Chess(fen).board().flatMap(row => row.flatMap(piece => piece ?
    [`${piece.color === 'w' ? 'White' : 'Black'} ${names[piece.type]} on ${piece.square}`] : [])).join('; ');
}
