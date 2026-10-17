import { Chess, type Square } from "chess.js";
import { StockfishEngine, type EngineState, type EngineWorker, type Search } from "../services/engine.ts";

export type PlayerColor = "w" | "b";
export type PlayerColorChoice = "white" | "black" | "random";
export type PromotionPiece = "q" | "r" | "b" | "n";
export const DIFFICULTIES = {
  beginner: { label: "Beginner", skill: 0 },
  casual: { label: "Casual", skill: 4 },
  club: { label: "Club Player", skill: 8 },
  advanced: { label: "Advanced", skill: 14 },
  master: { label: "Master", skill: 20 },
} as const;
export type DifficultyKey = keyof typeof DIFFICULTIES;
export type CompletedGame = Readonly<{
  id: string; date: string; result: "win" | "draw" | "loss";
  playerColor: PlayerColor; difficulty: DifficultyKey; moves: number;
}>;
let fallbackId = 0;
function newGameId() {
  try { return globalThis.crypto.randomUUID(); }
  catch { return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2) + "-" + (++fallbackId); }
}
export function gameResult(game: Chess, player: PlayerColor) {
  if (!game.isGameOver()) return null;
  if (game.isCheckmate()) return game.turn() !== player
    ? { title: "You win!", description: "Checkmate", symbol: "♔" }
    : { title: "You lose", description: "Checkmate", symbol: "♚" };
  const description = game.isStalemate() ? "Stalemate"
    : game.isInsufficientMaterial() ? "Insufficient material"
    : game.isThreefoldRepetition() ? "Threefold repetition"
    : game.isDrawByFiftyMoves() ? "50-move rule" : "Game drawn";
  return { title: "Draw", description, symbol: "½" };
}
export function gameStatus(game: Chess, setup: boolean, promotion: boolean, thinking: boolean, player: PlayerColor, engine: EngineState) {
  if (setup) return { label: "New game", text: "Choose your game settings" };
  if (engine === "error") return { label: "Engine error", text: "Retry the engine or start a new game" };
  if (promotion) return { label: "Promotion", text: "Choose a piece" };
  if (game.isCheckmate()) return { label: "Game over", text: `Checkmate — ${game.turn() === "w" ? "Black" : "White"} wins` };
  if (game.isStalemate()) return { label: "Game over", text: "Draw by stalemate" };
  if (game.isDraw()) return { label: "Game over", text: "Draw" };
  if (thinking) return { label: "Opponent", text: "Stockfish is thinking..." };
  if (game.turn() === player && game.isCheck()) return { label: "Your turn", text: "You are in check" };
  return { label: "In progress", text: game.turn() === player ? "Your turn" : "Opponent's turn" };
}

export class GameController {
  private readonly game: Chess;
  private readonly initialFen: string;
  private readonly engine: StockfishEngine;
  private listeners = new Set<() => void>();
  private active = false;
  private engineState: EngineState = "loading";
  private showSetup = true;
  private colorChoice: PlayerColorChoice = "white";
  private playerColor: PlayerColor = "w";
  private orientation: "white" | "black" = "white";
  private difficulty: DifficultyKey = "casual";
  private pendingPromotion: { from: Square; to: Square } | null = null;
  private snapshot;
  private gameId = "";
  private completed: CompletedGame | null = null;
  private readonly onComplete: (game: CompletedGame) => void;

  private readonly random: () => number;
  constructor(factory: () => EngineWorker, initialFen?: string, random = Math.random,
    deadlines?: { init: number; search: number }, onComplete: (game: CompletedGame) => void = () => {}) {
    this.onComplete = onComplete;
    this.random = random;
    this.game = new Chess(initialFen);
    this.initialFen = this.game.fen();
    this.engine = new StockfishEngine(factory, state => {
      if (!this.active) return;
      this.engineState = state;
      if (state === "error") this.pendingPromotion = null;
      this.publish();
    }, (move, search) => this.acceptEngineMove(move, search), deadlines);
    this.snapshot = this.readState();
  }
  private readState() {
    const history = this.game.history({ verbose: true });
    const last = history.at(-1);
    const isAiThinking = !this.showSetup && !this.game.isGameOver() && this.engineState !== "error" &&
      (this.engineState === "thinking" || (this.engineState === "loading" && this.game.turn() !== this.playerColor));
    return {
      position: this.game.fen(), moveHistory: this.game.history(),
      lastMove: last ? { from: last.from, to: last.to } : null,
      playerColorChoice: this.colorChoice, playerColor: this.playerColor,
      orientation: this.orientation, difficulty: this.difficulty,
      showSetup: this.showSetup, pendingPromotion: this.pendingPromotion,
      engineReady: this.engineState === "ready" || this.engineState === "thinking",
      engineError: this.engineState === "error", isAiThinking,
      engineStatus: this.engineState === "error" ? "Engine error"
        : this.engineState === "thinking" ? "Stockfish is thinking..."
        : this.engineState === "ready" ? "Stockfish 19 ready" : "Loading Stockfish...",
      canUndo: !this.showSetup && !this.completed && history.length > 0,
      completedGame: this.completed,
      canMove: !this.showSetup && !this.pendingPromotion && !this.game.isGameOver() &&
        this.engineState === "ready" && this.game.turn() === this.playerColor,
      result: this.showSetup ? null : gameResult(this.game, this.playerColor),
      status: gameStatus(this.game, this.showSetup, !!this.pendingPromotion, isAiThinking, this.playerColor, this.engineState),
    };
  }
  private publish() { this.snapshot = this.readState(); this.listeners.forEach(listener => listener()); }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  connect() {
    this.active = true;
    this.retryEngine();
    return () => { this.active = false; this.engine.cancel(); };
  }
  private search(): Search {
    // Preserve repetition history for Stockfish as well as chess.js.
    const moves = this.game.history({ verbose: true }).map(m => m.from + m.to + (m.promotion || ""));
    return { fen: this.game.fen(), position: `position fen ${this.initialFen}${moves.length ? " moves " + moves.join(" ") : ""}` };
  }
  retryEngine = () => {
    if (!this.active) return;
    const search = !this.showSetup && !this.game.isGameOver() && this.game.turn() !== this.playerColor ? this.search() : null;
    this.engine.prepare(DIFFICULTIES[this.difficulty].skill, search);
  };
  setPlayerColorChoice = (choice: PlayerColorChoice) => {
    if (!this.showSetup) return;
    this.colorChoice = choice; this.publish();
  };
  setDifficulty = (difficulty: DifficultyKey) => {
    if (!this.showSetup) return;
    this.difficulty = difficulty; this.retryEngine();
  };
  private reset(color: PlayerColor) {
    this.engine.cancel();
    this.game.load(this.initialFen);
    this.gameId = newGameId(); this.completed = null;
    this.playerColor = color; this.orientation = color === "w" ? "white" : "black";
    this.pendingPromotion = null; this.showSetup = false;
    this.retryEngine();
  }
  startConfiguredGame = () => {
    if (!this.active) return;
    if (this.engineState === "error") { this.retryEngine(); return; }
    if (this.engineState !== "ready") return;
    const color = this.colorChoice === "random" ? (this.random() < .5 ? "w" : "b")
      : this.colorChoice === "white" ? "w" : "b";
    this.reset(color);
  };
  rematchGame = () => { if (this.active) this.reset(this.playerColor); };
  openNewGameSetup = () => {
    this.showSetup = true; this.pendingPromotion = null;
    this.retryEngine();
  };
  flipBoard = () => { this.orientation = this.orientation === "white" ? "black" : "white"; this.publish(); };
  drop = (from: string, to: string | null) => {
    if (!this.active || !to || !this.snapshot.canMove) return false;
    // Verbose legal moves include captures, check/mate suffixes and underpromotions.
    const legal = this.game.moves({ verbose: true }).filter(m => m.from === from && m.to === to);
    if (!legal.length) return false;
    if (legal.some(m => m.promotion)) {
      this.pendingPromotion = { from: from as Square, to: to as Square }; this.publish(); return true;
    }
    this.game.move({ from, to }); this.afterPlayerMove(); return true;
  };
  selectPromotionPiece = (piece: PromotionPiece) => {
    if (!this.active || !this.pendingPromotion || this.showSetup || this.engineState === "error") return;
    try { this.game.move({ ...this.pendingPromotion, promotion: piece }); }
    catch { this.pendingPromotion = null; this.publish(); return; }
    this.pendingPromotion = null; this.afterPlayerMove();
  };
  private afterPlayerMove() {
    this.finishIfEnded();
    if (!this.game.isGameOver() && !this.engine.search(this.search())) {
      // A dead session must become recoverable rather than leave an opponent turn locked.
      if (this.engineState !== "error") this.engine.fail();
    }
    this.publish();
  }
  private acceptEngineMove(move: string, search: Search) {
    if (!this.active || this.showSetup || this.game.isGameOver() || this.game.turn() === this.playerColor || this.game.fen() !== search.fen) return;
    try {
      const promotion = move.slice(4);
      const legal = this.game.moves({ verbose: true }).some(m => m.from === move.slice(0, 2) && m.to === move.slice(2, 4) && (m.promotion || "") === promotion);
      if (!legal) throw new Error("Illegal engine move");
      this.game.move({ from: move.slice(0, 2), to: move.slice(2, 4), ...(promotion ? { promotion } : {}) });
      this.finishIfEnded();
      this.publish();
    } catch { this.engine.fail(); }
  }
  private finishIfEnded() {
    if (this.completed || !this.gameId || !this.game.isGameOver() || !this.game.history().length) return;
    const result = this.game.isCheckmate() ? (this.game.turn() === this.playerColor ? "loss" : "win") : "draw";
    this.completed = Object.freeze({ id: this.gameId, date: new Date().toISOString(), result,
      playerColor: this.playerColor, difficulty: this.difficulty, moves: Math.ceil(this.game.history().length / 2) });
    // Latch before notifying; repeated callbacks/re-renders cannot earn this result twice.
    // Progress/storage failures must never affect chess or the engine lifecycle.
    try { this.onComplete(this.completed); } catch { /* Optional local progress is isolated. */ }
  }
  undoMove = () => {
    if (!this.active || this.completed || !this.snapshot.canUndo) return;
    this.engine.cancel(); this.pendingPromotion = null;
    // Rewind to the previous human decision, including interrupted AI searches.
    this.game.undo();
    if (this.game.turn() !== this.playerColor && this.game.history().length) this.game.undo();
    this.retryEngine();
  };
}
