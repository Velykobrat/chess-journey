import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Chessboard, type PieceDropHandlerArgs } from "react-chessboard";
import { createStockfishWorker } from "./services/stockfish";
import { GameController, DIFFICULTIES, type DifficultyKey, type PromotionPiece } from "./game/controller";
import { ProgressStore } from "./progress/store";
import { JourneyCard } from "./progress/JourneyCard";
import "./App.css";

function App() {
  const [progress] = useState(() => new ProgressStore());
  const [controller] = useState(() => new GameController(createStockfishWorker, undefined, undefined, undefined, progress.record));
  useEffect(() => { progress.load(); return controller.connect(); }, [controller, progress]);
  const {
    position, moveHistory, lastMove, orientation, playerColorChoice, playerColor,
    difficulty, engineStatus, engineReady, engineError, canMove, canUndo,
    showSetup, pendingPromotion, result: gameResult, status: gameStatus,
  } = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const {
    setPlayerColorChoice, setDifficulty, startConfiguredGame, rematchGame,
    openNewGameSetup, selectPromotionPiece, undoMove, flipBoard, retryEngine,
  } = controller;
  const onPieceDrop = ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => controller.drop(sourceSquare, targetSquare);

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
  ) as Array<[DifficultyKey, { label: string; skill: number }]>;

  const chessboardOptions = {
    id: "chess-journey-board",
    position,
    boardOrientation: orientation,
    onPieceDrop,

    allowDragging: canMove,

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
            {engineError && <button className="secondary-button" type="button" onClick={retryEngine}>Retry engine</button>}
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
              disabled={!canUndo}
            >
              Undo move
            </button>
          </div>

          <JourneyCard store={progress} />
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
              disabled={!engineReady && !engineError}
            >
              {engineError ? "Retry engine" : engineReady
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