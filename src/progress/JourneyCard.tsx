import { useSyncExternalStore } from "react";
import { DIFFICULTIES } from "../game/controller";
import { levelForXP, winRate } from "./model";
import type { ProgressStore } from "./store";
export function JourneyCard({ store }: { store: ProgressStore }) {
  const { data, notice } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const level = levelForXP(data.totalXP);
  const withinLevel = data.totalXP % 100;
  return <section className="journey-card" aria-label="Player journey">
    <div className="journey-card__top"><span>YOUR JOURNEY</span><strong>Level {level}</strong></div>
    <div className="progress-track" role="progressbar" aria-label="XP toward next level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={withinLevel} aria-valuetext={`Level ${level}, ${100 - withinLevel} XP to level ${level + 1}`}>
      <div className="progress-value" style={{ width: `${withinLevel}%` }} />
    </div>
    <div className="journey-card__footer"><span>{data.totalXP} total XP</span><span>{withinLevel} / 100 XP</span></div>
    <div className="journey-stats" role="group" aria-label="Completed game statistics"><span>{data.totalGames} games</span><span>{data.wins} wins</span><span>{winRate(data).toFixed(0)}% win rate</span></div>
    {notice && <p className="journey-notice" role="status" aria-atomic="true">{notice}</p>}
    <details className="journey-history"><summary>Recent games ({data.history.length})</summary>
      {data.history.length === 0 ? <p>No completed games yet.</p> : <ol tabIndex={0} aria-label="Completed games">
        {data.history.map(game => <li key={game.id}>
          <div><strong>{game.result === "win" ? "Win" : game.result === "draw" ? "Draw" : "Loss"}</strong><span>+{game.xp} XP</span></div>
          <time dateTime={game.date}>{new Date(game.date).toLocaleString()}</time>
          <small>{game.playerColor === "w" ? "White" : "Black"} · {DIFFICULTIES[game.difficulty].label} · {game.moves} moves</small>
        </li>)}
      </ol>}
    </details>
  </section>;
}
