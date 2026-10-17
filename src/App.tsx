import { useEffect, useState, useSyncExternalStore } from "react";
import { createStockfishWorker } from "./services/stockfish";
import { GameController } from "./game/controller";
import { ProgressStore } from "./progress/store";
import { Header } from "./ui/Header.tsx";
import { GameBoard } from "./ui/GameBoard.tsx";
import { GamePanel } from "./ui/GamePanel.tsx";
import { GameSetup } from "./ui/GameSetup.tsx";
import { PromotionDialog } from "./ui/PromotionDialog.tsx";
import { GameResultDialog } from "./ui/GameResultDialog.tsx";
import "./App.css";

function App() {
  const [progress] = useState(() => new ProgressStore());
  const [controller] = useState(() => new GameController(createStockfishWorker, undefined, undefined, undefined, progress.record));
  useEffect(() => { progress.load(); return controller.connect(); }, [controller, progress]);
  const view = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [reviewedGame, setReviewedGame] = useState<string | null>(null);
  const resultId = view.completedGame?.id ?? view.position;
  const showResult = !!view.result && !view.showSetup && reviewedGame !== resultId;
  const modalOpen = view.showSetup || !!view.pendingPromotion || showResult;
  return <div className="app-shell">
    <div inert={modalOpen}>
      <Header onFlip={controller.flipBoard} />
      <main className="game-layout" id="game-focus-target" tabIndex={-1}>
        <GameBoard view={view} onMove={controller.drop} />
        <GamePanel view={view} progress={progress} onRetry={controller.retryEngine} onNewGame={controller.openNewGameSetup} onUndo={controller.undoMove} />
      </main>
    </div>
    {view.showSetup ? <GameSetup view={view} onColor={controller.setPlayerColorChoice} onDifficulty={controller.setDifficulty} onStart={controller.startConfiguredGame} />
      : view.pendingPromotion ? <PromotionDialog color={view.playerColor} onSelect={controller.selectPromotionPiece} />
      : showResult ? <GameResultDialog view={view} onRematch={controller.rematchGame} onSettings={controller.openNewGameSetup} onReview={() => setReviewedGame(resultId)} /> : null}
  </div>;
}
export default App;
