import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chess,
  type Square,
} from "chess.js";
import {
  Chessboard,
  type PieceDropHandlerArgs,
} from "react-chessboard";
import { createStockfishWorker } from "./services/stockfish";

import "./App.css";

type BoardOrientation = "white" | "black";
type PlayerColorChoice = "white" | "black" | "random";
type PlayerColor = "w" | "b";
type PromotionPiece = "q" | "r" | "b" | "n";
type PendingPromotion = {
  from: Square;
  to: Square;
};
type DifficultyKey =
  | "beginner"
  | "casual"
  | "club"
  | "advanced"
  | "master";

type DifficultyConfig = {
  label: string;
  skill: number;
};

const DIFFICULTIES: Record<DifficultyKey, DifficultyConfig> = {
  beginner: {
    label: "Beginner",
    skill: 0,
  },
  casual: {
    label: "Casual",
    skill: 4,
  },
  club: {
    label: "Club Player",
    skill: 8,
  },
  advanced: {
    label: "Advanced",
    skill: 14,
  },
  master: {
    label: "Master",
    skill: 20,
  },
};

function App() {
  const gameRef = useRef(new Chess());
  const stockfishRef = useRef<Worker | null>(null);
  const aiMoveExpectedRef = useRef(false);

  const game = gameRef.current;

  const [engineStatus, setEngineStatus] =
    useState("Loading Stockfish...");
  const [engineReady, setEngineReady] = useState(false);

  const [position, setPosition] = useState(game.fen());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{
    from: string;
    to: string;
  } | null>(null);

  const [orientation, setOrientation] =
    useState<BoardOrientation>("white");

  const [playerColorChoice, setPlayerColorChoice] =
    useState<PlayerColorChoice>("white");
  const [playerColor, setPlayerColor] =
    useState<PlayerColor>("w");

  const [difficulty, setDifficulty] =
    useState<DifficultyKey>("casual");

  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showSetup, setShowSetup] = useState(true);

  const [pendingPromotion, setPendingPromotion] =
    useState<PendingPromotion | null>(null);
  
  const updateGameState = () => {
    const currentGame = gameRef.current;

    setPosition(currentGame.fen());
    setMoveHistory(currentGame.history());

    const verboseHistory = currentGame.history({
      verbose: true,
    });

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

  const requestAiMove = () => {
    const worker = stockfishRef.current;
    const currentGame = gameRef.current;

    if (
      !worker ||
      !engineReady ||
      currentGame.isGameOver()
    ) {
      return;
    }

    aiMoveExpectedRef.current = true;

    setIsAiThinking(true);
    setEngineStatus("Stockfish is thinking...");

    worker.postMessage(
      `position fen ${currentGame.fen()}`,
    );

    worker.postMessage("go movetime 500");
  };

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
          if (!aiMoveExpectedRef.current) {
            continue;
          }

          aiMoveExpectedRef.current = false;

          const bestMove = message.split(" ")[1];

          if (!bestMove || bestMove === "(none)") {
            setIsAiThinking(false);
            return;
          }

          const from = bestMove.slice(0, 2);
          const to = bestMove.slice(2, 4);
          const promotion =
            bestMove.slice(4, 5) || "q";

          try {
            const currentGame = gameRef.current;

            currentGame.move({
              from,
              to,
              promotion,
            });

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

  const startConfiguredGame = () => {
    if (!engineReady) {
      return;
    }

    let resolvedColor: PlayerColor;

    if (playerColorChoice === "random") {
      resolvedColor =
        Math.random() < 0.5 ? "w" : "b";
    } else {
      resolvedColor =
        playerColorChoice === "white" ? "w" : "b";
    }

    const worker = stockfishRef.current;

    aiMoveExpectedRef.current = false;
    worker?.postMessage("stop");

    game.reset();

    setPlayerColor(resolvedColor);
    setOrientation(
      resolvedColor === "w" ? "white" : "black",
    );

    setPosition(game.fen());
    setMoveHistory([]);
    setLastMove(null);
    setPendingPromotion(null);
    setIsAiThinking(false);
    setShowSetup(false);
    setEngineStatus("Stockfish 19 ready");

    worker?.postMessage("ucinewgame");

    worker?.postMessage(
      `setoption name Skill Level value ${DIFFICULTIES[difficulty].skill}`,
    );

    if (resolvedColor === "b" && worker) {
      aiMoveExpectedRef.current = true;

      setIsAiThinking(true);
      setEngineStatus("Stockfish is thinking...");

      worker.postMessage(
        `position fen ${game.fen()}`,
      );

      worker.postMessage("go movetime 500");
    }
  };

  const rematchGame = () => {
  if (!engineReady) {
    return;
  }

  const worker = stockfishRef.current;

  aiMoveExpectedRef.current = false;
  worker?.postMessage("stop");

  game.reset();

  setPosition(game.fen());
  setMoveHistory([]);
  setLastMove(null);
  setPendingPromotion(null);
  setIsAiThinking(false);
  setShowSetup(false);
  setEngineStatus("Stockfish 19 ready");

  setOrientation(
    playerColor === "w" ? "white" : "black",
  );

  worker?.postMessage("ucinewgame");

  worker?.postMessage(
    `setoption name Skill Level value ${
      DIFFICULTIES[difficulty].skill
    }`,
  );

  if (playerColor === "b" && worker) {
    aiMoveExpectedRef.current = true;

    setIsAiThinking(true);
    setEngineStatus("Stockfish is thinking...");

    worker.postMessage(
      `position fen ${game.fen()}`,
    );

    worker.postMessage("go movetime 500");
  }
  };
  
  const openNewGameSetup = () => {
    aiMoveExpectedRef.current = false;

    stockfishRef.current?.postMessage("stop");
setPendingPromotion(null);
    setIsAiThinking(false);
    setShowSetup(true);
  };

  const onPieceDrop = ({
  sourceSquare,
  targetSquare,
}: PieceDropHandlerArgs) => {
  if (
    !targetSquare ||
    showSetup ||
    pendingPromotion ||
    game.isGameOver() ||
    !engineReady ||
    isAiThinking ||
    game.turn() !== playerColor
  ) {
    return false;
  }

  const from = sourceSquare as Square;
  const to = targetSquare as Square;

  const isLastRank =
    targetSquare.endsWith("8") ||
    targetSquare.endsWith("1");

  if (isLastRank) {
    const possibleMoves = game.moves({
      square: from,
    });

    const isPromotion = possibleMoves.some(
      (move) =>
        move.startsWith(`${targetSquare}=`),
    );

    if (isPromotion) {
      setPendingPromotion({
        from,
        to,
      });

      return true;
    }
  }

  try {
    game.move({
      from,
      to,
    });

    updateGameState();

    if (!game.isGameOver()) {
      requestAiMove();
    }

    return true;
  } catch {
    return false;
  }
};

  const selectPromotionPiece = (
  piece: PromotionPiece,
) => {
  if (!pendingPromotion) {
    return;
  }

  try {
    game.move({
      from: pendingPromotion.from,
      to: pendingPromotion.to,
      promotion: piece,
    });

    setPendingPromotion(null);

    updateGameState();

    if (!game.isGameOver()) {
      requestAiMove();
    }
  } catch (error) {
    console.error(
      "Promotion error:",
      error,
    );

    setPendingPromotion(null);
  }
  };
  
  const undoMove = () => {
    if (
      game.history().length < 2 ||
      isAiThinking
    ) {
      return;
    }

    aiMoveExpectedRef.current = false;
    stockfishRef.current?.postMessage("stop");

    game.undo();
    game.undo();

    updateGameState();

    setEngineStatus("Stockfish 19 ready");
  };

  const flipBoard = () => {
    setOrientation((current) =>
      current === "white" ? "black" : "white",
    );
  };

  const getGameResult = () => {
  const currentGame = gameRef.current;

  if (showSetup || !currentGame.isGameOver()) {
    return null;
  }

  if (currentGame.isCheckmate()) {
    const winner: PlayerColor =
      currentGame.turn() === "w" ? "b" : "w";

    if (winner === playerColor) {
      return {
        title: "You win!",
        description: "Checkmate",
        symbol: "♔",
      };
    }

    return {
      title: "You lose",
      description: "Checkmate",
      symbol: "♚",
    };
  }

  if (currentGame.isStalemate()) {
    return {
      title: "Draw",
      description: "Stalemate",
      symbol: "½",
    };
  }

  if (currentGame.isInsufficientMaterial()) {
    return {
      title: "Draw",
      description: "Insufficient material",
      symbol: "½",
    };
  }

  if (currentGame.isThreefoldRepetition()) {
    return {
      title: "Draw",
      description: "Threefold repetition",
      symbol: "½",
    };
  }

  if (currentGame.isDrawByFiftyMoves()) {
    return {
      title: "Draw",
      description: "50-move rule",
      symbol: "½",
    };
  }

  return {
    title: "Draw",
    description: "Game drawn",
    symbol: "½",
  };
};

const gameResult = getGameResult();
  
  const gameStatus = useMemo(() => {
    if (showSetup) {
      return {
        label: "New game",
        text: "Choose your game settings",
      };
    }

    if (pendingPromotion) {
  return {
    label: "Promotion",
    text: "Choose a piece",
  };
}

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

    if (isAiThinking) {
      return {
        label: "Opponent",
        text: "Stockfish is thinking...",
      };
    }

    if (game.isCheck()) {
      return {
        label: "Your turn",
        text: "You are in check",
      };
    }

    if (game.turn() === playerColor) {
      return {
        label: "In progress",
        text: "Your turn",
      };
    }

      return {
    label: "In progress",
    text: "Opponent's turn",
  };
}, [
  position,
  game,
  isAiThinking,
  playerColor,
  showSetup,
]);

  const formattedMoves = useMemo(() => {
    const rows: Array<{
      number: number;
      white?: string;
      black?: string;
    }> = [];

    for (
      let index = 0;
      index < moveHistory.length;
      index += 2
    ) {
      rows.push({
        number: index / 2 + 1,
        white: moveHistory[index],
        black: moveHistory[index + 1],
      });
    }

    return rows;
  }, [moveHistory]);

  const difficultyOptions = Object.entries(
    DIFFICULTIES,
  ) as Array<[DifficultyKey, DifficultyConfig]>;

  const chessboardOptions = {
    id: "chess-journey-board",
    position,
    boardOrientation: orientation,
    onPieceDrop,

    allowDragging:
  engineReady &&
  !showSetup &&
  !pendingPromotion &&
  !isAiThinking &&
  game.turn() === playerColor,

    animationDurationInMs: 180,
    showNotation: true,

    lightSquareStyle: {
      backgroundColor: "#e9e5dc",
    },

    darkSquareStyle: {
      backgroundColor: "#6f7f68",
    },

    boardStyle: {
      borderRadius: "14px",
      overflow: "hidden",
      boxShadow:
        "0 24px 80px rgba(0, 0, 0, 0.28)",
    },

    squareStyles: lastMove
      ? {
          [lastMove.from]: {
            backgroundColor:
              "rgba(227, 190, 76, 0.50)",
          },
          [lastMove.to]: {
            backgroundColor:
              "rgba(227, 190, 76, 0.62)",
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
          <span className="version-badge">
            V2 Preview
          </span>

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
              <strong>Stockfish</strong>
              <span>
                {DIFFICULTIES[difficulty].label} ·{" "}
                {engineStatus}
              </span>
            </div>

            <div className="player-rating">AI</div>
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
              <span>
                Playing{" "}
                {playerColor === "w"
                  ? "White"
                  : "Black"}
              </span>
            </div>

            <div className="player-rating">
              Unrated
            </div>
          </div>
        </section>

        <aside className="game-panel">
          <div className="game-panel__header">
            <div>
              <p className="eyebrow">
                CASUAL GAME
              </p>
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
              <small>
                {moveHistory.length} played
              </small>
            </div>

            <div className="moves-list">
              {formattedMoves.length === 0 ? (
                <div className="empty-state">
                  <span>♟</span>
                  <p>
                    Your moves will appear here.
                  </p>
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

                    <span>
                      {move.white ?? ""}
                    </span>

                    <span>
                      {move.black ?? ""}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="game-actions">
            <button
              className="primary-button"
              type="button"
              onClick={openNewGameSetup}
            >
              New game
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={undoMove}
              disabled={
                moveHistory.length < 2 ||
                isAiThinking
              }
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

      {showSetup && (
        <div className="setup-backdrop">
          <div className="setup-card">
            <div className="setup-heading">
              <span className="setup-icon">
                ♞
              </span>

              <div>
                <p className="eyebrow">
                  NEW GAME
                </p>
                <h2>Play vs Stockfish</h2>
              </div>
            </div>

            <div className="setup-section">
              <span className="setup-label">
                Your color
              </span>

              <div className="setup-options setup-options--colors">
                <button
                  type="button"
                  className={`setup-option ${
                    playerColorChoice === "white"
                      ? "setup-option--active"
                      : ""
                  }`}
                  onClick={() =>
                    setPlayerColorChoice("white")
                  }
                >
                  <strong>♙</strong>
                  <span>White</span>
                </button>

                <button
                  type="button"
                  className={`setup-option ${
                    playerColorChoice === "black"
                      ? "setup-option--active"
                      : ""
                  }`}
                  onClick={() =>
                    setPlayerColorChoice("black")
                  }
                >
                  <strong>♟</strong>
                  <span>Black</span>
                </button>

                <button
                  type="button"
                  className={`setup-option ${
                    playerColorChoice === "random"
                      ? "setup-option--active"
                      : ""
                  }`}
                  onClick={() =>
                    setPlayerColorChoice("random")
                  }
                >
                  <strong>?</strong>
                  <span>Random</span>
                </button>
              </div>
            </div>

            <div className="setup-section">
              <span className="setup-label">
                Difficulty
              </span>

              <div className="difficulty-list">
                {difficultyOptions.map(
                  ([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      className={`difficulty-option ${
                        difficulty === key
                          ? "difficulty-option--active"
                          : ""
                      }`}
                      onClick={() =>
                        setDifficulty(key)
                      }
                    >
                      <span>{config.label}</span>

                      {difficulty === key && (
                        <strong>✓</strong>
                      )}
                    </button>
                  ),
                )}
              </div>
            </div>

            <button
              className="start-game-button"
              type="button"
              onClick={startConfiguredGame}
              disabled={!engineReady}
            >
              {engineReady
                ? "Start game"
                : "Loading engine..."}
            </button>

            <p className="setup-footer">
              You can change these settings
              before every new game.
            </p>
          </div>
        </div>
      )}

      {pendingPromotion && (
  <div className="promotion-backdrop">
    <div className="promotion-card">
      <p className="eyebrow">
        PAWN PROMOTION
      </p>

      <h2>Choose your piece</h2>

      <div className="promotion-grid">
        {(
          [
            ["q", "Queen"],
            ["r", "Rook"],
            ["b", "Bishop"],
            ["n", "Knight"],
          ] as Array<[PromotionPiece, string]>
        ).map(([piece, label]) => {
          const symbols =
            playerColor === "w"
              ? {
                  q: "♕",
                  r: "♖",
                  b: "♗",
                  n: "♘",
                }
              : {
                  q: "♛",
                  r: "♜",
                  b: "♝",
                  n: "♞",
                };
         
          return (
            <button
              key={piece}
              type="button"
              className="promotion-option"
              onClick={() =>
                selectPromotionPiece(piece)
              }
            >
              <strong>
                {symbols[piece]}
              </strong>

              <span>{label}</span>
            </button>
          );
        })}
              
      </div>
    </div>
  </div>
      )}
      
      {gameResult && !showSetup && (
  <div className="result-backdrop">
    <div className="result-card">
      <div className="result-symbol">
        {gameResult.symbol}
      </div>

      <p className="eyebrow">
        GAME OVER
      </p>

      <h2>{gameResult.title}</h2>

      <p className="result-description">
        {gameResult.description}
      </p>

      <div className="result-meta">
        <span>
          {DIFFICULTIES[difficulty].label}
        </span>

        <span>·</span>

        <span>
          You played{" "}
          {playerColor === "w"
            ? "White"
            : "Black"}
        </span>

        <span>·</span>

        <span>
          {Math.ceil(moveHistory.length / 2)}{" "}
          moves
        </span>
      </div>

      <div className="result-actions">
        <button
          className="start-game-button"
          type="button"
          onClick={rematchGame}
        >
          Rematch
        </button>

        <button
          className="secondary-button"
          type="button"
          onClick={openNewGameSetup}
        >
          Change settings
        </button>
      </div>
    </div>
  </div>
          )
      }
      
    </div>
  );
}

export default App;