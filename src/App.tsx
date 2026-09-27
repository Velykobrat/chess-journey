import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  Chessboard,
  type PieceDropHandlerArgs,
} from "react-chessboard";
import { createStockfishWorker } from "./services/stockfish";

import "./App.css";

type BoardOrientation = "white" | "black";

function App() {
  const gameRef = useRef(new Chess());
  const game = gameRef.current;
  const stockfishRef = useRef<Worker | null>(null);

const [engineStatus, setEngineStatus] =
  useState("Loading Stockfish...");
  const [position, setPosition] = useState(game.fen());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [orientation, setOrientation] =
    useState<BoardOrientation>("white");
  const [isAiThinking, setIsAiThinking] = useState(false);
const [engineReady, setEngineReady] = useState(false);
  const [lastMove, setLastMove] = useState<{
    from: string;
    to: string;
  } | null>(null);

  useEffect(() => {
  const worker = createStockfishWorker();

  stockfishRef.current = worker;

  worker.onmessage = (event) => {
  const messages = String(event.data).split("\n");

  for (const rawMessage of messages) {
    const message = rawMessage.trim();

    if (!message) continue;

    console.log("[Stockfish]", message);

    if (message === "uciok") {
      worker.postMessage("isready");
    }

    if (message === "readyok") {
      setEngineReady(true);
      setEngineStatus("Stockfish 19 ready");
    }

    if (message.startsWith("bestmove")) {
      const bestMove = message.split(" ")[1];

      if (!bestMove || bestMove === "(none)") {
        setIsAiThinking(false);
        return;
      }

      const from = bestMove.slice(0, 2);
      const to = bestMove.slice(2, 4);
      const promotion = bestMove.slice(4, 5) || "q";

      try {
        gameRef.current.move({
          from,
          to,
          promotion,
        });

        const currentGame = gameRef.current;

        setPosition(currentGame.fen());
        setMoveHistory(currentGame.history());

        const history = currentGame.history({
          verbose: true,
        });

        const latestMove = history.at(-1);

        if (latestMove) {
          setLastMove({
            from: latestMove.from,
            to: latestMove.to,
          });
        }
      } catch (error) {
        console.error("AI move error:", error);
      }

      setIsAiThinking(false);
      setEngineStatus("Stockfish 19 ready");
    }
  }
};

  worker.onerror = (error) => {
    console.error("Stockfish error:", error);
    setEngineStatus("Engine error");
  };

  worker.postMessage("uci");

  return () => {
    worker.terminate();
    stockfishRef.current = null;
  };
  }, []);
  
  const updateGameState = () => {
    setPosition(game.fen());
    setMoveHistory(game.history());

    const verboseHistory = game.history({ verbose: true });
    const latestMove = verboseHistory.at(-1);

    if (latestMove) {
      setLastMove({
        from: latestMove.from,
        to: latestMove.to,
      });
    } else {
      setLastMove(null);
    }
  };

  const onPieceDrop = ({
  sourceSquare,
  targetSquare,
}: PieceDropHandlerArgs) => {
  if (
    !targetSquare ||
    game.isGameOver() ||
    !engineReady ||
    isAiThinking ||
    game.turn() !== "w"
  ) {
    return false;
  }

  try {
    game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });

    updateGameState();

    if (!game.isGameOver()) {
      setIsAiThinking(true);
      setEngineStatus("Stockfish is thinking...");

      const worker = stockfishRef.current;

      if (worker) {
        worker.postMessage(`position fen ${game.fen()}`);
        worker.postMessage("go movetime 500");
      }
    }

    return true;
  } catch {
    return false;
  }
};

  const startNewGame = () => {
    game.reset();
    updateGameState();
  };

  const undoMove = () => {
  if (
    game.history().length === 0 ||
    isAiThinking
  ) {
    return;
  }

  game.undo();

  if (game.history().length > 0) {
    game.undo();
  }

  updateGameState();
};

  const flipBoard = () => {
    setOrientation((current) =>
      current === "white" ? "black" : "white",
    );
  };

  const gameStatus = useMemo(() => {
    const sideToMove =
      game.turn() === "w" ? "White" : "Black";

    if (game.isCheckmate()) {
      const winner =
        game.turn() === "w" ? "Black" : "White";

      return {
        label: "Game over",
        text: `Checkmate — ${winner} wins`,
      };
    }

    if (game.isStalemate()) {
      return {
        label: "Game over",
        text: "Draw by stalemate",
      };
    }

    if (game.isDraw()) {
      return {
        label: "Game over",
        text: "Draw",
      };
    }

    if (game.isCheck()) {
      return {
        label: "In progress",
        text: `${sideToMove} to move — Check`,
      };
    }

    return {
      label: "In progress",
      text: `${sideToMove} to move`,
    };
  }, [position, game]);

  const formattedMoves = useMemo(() => {
    const rows: Array<{
      number: number;
      white?: string;
      black?: string;
    }> = [];

    for (let index = 0; index < moveHistory.length; index += 2) {
      rows.push({
        number: index / 2 + 1,
        white: moveHistory[index],
        black: moveHistory[index + 1],
      });
    }

    return rows;
  }, [moveHistory]);

  const chessboardOptions = {
    id: "chess-journey-board",
    position,
    boardOrientation: orientation,
    onPieceDrop,
    animationDurationInMs: 180,
    showNotation: true,

    allowDragging:
  engineReady &&
  !isAiThinking &&
      game.turn() === "w",
    
    lightSquareStyle: {
      backgroundColor: "#e9e5dc",
    },

    darkSquareStyle: {
      backgroundColor: "#6f7f68",
    },

    boardStyle: {
      borderRadius: "14px",
      overflow: "hidden",
      boxShadow: "0 24px 80px rgba(0, 0, 0, 0.28)",
    },

    squareStyles: lastMove
      ? {
          [lastMove.from]: {
            backgroundColor: "rgba(227, 190, 76, 0.50)",
          },
          [lastMove.to]: {
            backgroundColor: "rgba(227, 190, 76, 0.62)",
          },
        }
      : {},
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">♞</span>

          <span>
            <strong>Chess Journey</strong>
            <small>Play · Learn · Improve</small>
          </span>
        </a>

        <div className="topbar-actions">
          <span className="version-badge">V2 Preview</span>

          <button
            className="icon-button"
            type="button"
            onClick={flipBoard}
            aria-label="Flip board"
            title="Flip board"
          >
            ↻
          </button>
        </div>
      </header>

      <main className="game-layout">
        <section className="board-section">
          <div className="player-card player-card--opponent">
            <div className="player-avatar">AI</div>

            <div className="player-info">
              <strong>Training opponent</strong>
              <span>{engineStatus}</span>
            </div>

            <div className="player-rating">—</div>
          </div>

          <div className="board-frame">
            <Chessboard options={chessboardOptions} />
          </div>

          <div className="player-card">
            <div className="player-avatar player-avatar--you">
              YOU
            </div>

            <div className="player-info">
              <strong>You</strong>
              <span>Journey begins here</span>
            </div>

            <div className="player-rating">Unrated</div>
          </div>
        </section>

        <aside className="game-panel">
          <div className="game-panel__header">
            <div>
              <p className="eyebrow">CASUAL GAME</p>
              <h1>Play chess</h1>
            </div>

            <span className="status-dot" />
          </div>

          <div className="game-status">
            <span>{gameStatus.label}</span>
            <strong>{gameStatus.text}</strong>
          </div>

          <div className="moves-panel">
            <div className="panel-heading">
              <span>Moves</span>
              <small>{moveHistory.length} played</small>
            </div>

            <div className="moves-list">
              {formattedMoves.length === 0 ? (
                <div className="empty-state">
                  <span>♟</span>
                  <p>Your moves will appear here.</p>
                </div>
              ) : (
                formattedMoves.map((move) => (
                  <div
                    className="move-row"
                    key={move.number}
                  >
                    <span className="move-number">
                      {move.number}.
                    </span>

                    <span>{move.white ?? ""}</span>
                    <span>{move.black ?? ""}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="game-actions">
            <button
              className="primary-button"
              type="button"
              onClick={startNewGame}
            >
              New game
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={undoMove}
              disabled={moveHistory.length === 0}
            >
              Undo move
            </button>
          </div>

          <div className="journey-card">
            <div className="journey-card__top">
              <span>YOUR JOURNEY</span>
              <strong>Beginner</strong>
            </div>

            <div className="progress-track">
              <div className="progress-value" />
            </div>

            <div className="journey-card__footer">
              <span>Level 1</span>
              <span>0 / 100 XP</span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;