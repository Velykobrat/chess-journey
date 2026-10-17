import type { CompletedGame } from "../game/controller.ts";
export const XP = Object.freeze({ win: 30, draw: 15, loss: 5 });
export type HistoryGame = Readonly<CompletedGame & { xp: number }>;
export type Progress = Readonly<{
  version: 1; totalGames: number; wins: number; draws: number; losses: number; totalXP: number;
  creditedIds: readonly string[]; history: readonly HistoryGame[];
}>;
export function emptyProgress(): Progress {
  return freezeProgress({ version: 1, totalGames: 0, wins: 0, draws: 0, losses: 0, totalXP: 0, creditedIds: [], history: [] });
}
function freezeProgress(p: Progress): Progress {
  return Object.freeze({ ...p, creditedIds: Object.freeze([...p.creditedIds]), history: Object.freeze(p.history.map(g => Object.freeze({ ...g }))) });
}
export const levelForXP = (xp: number) => Math.floor(xp / 100) + 1;
export const winRate = (p: Progress) => p.totalGames ? p.wins / p.totalGames * 100 : 0;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const id = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9-]{1,128}$/.test(value);
export function validCompletedGame(g: unknown): g is CompletedGame {
  if (!object(g) || !exact(g, ["id", "date", "result", "playerColor", "difficulty", "moves"])) return false;
  if (!id(g.id) || typeof g.date !== "string" || g.date.length !== 24 || !Number.isFinite(Date.parse(g.date))) return false;
  if (new Date(g.date).toISOString() !== g.date) return false;
  return ["win", "draw", "loss"].includes(g.result as string) && ["w", "b"].includes(g.playerColor as string) &&
    ["beginner", "casual", "club", "advanced", "master"].includes(g.difficulty as string) && count(g.moves) && g.moves > 0;
}
export function validateProgress(value: unknown): Progress {
  if (!object(value) || !exact(value, ["version", "totalGames", "wins", "draws", "losses", "totalXP", "creditedIds", "history"]) || value.version !== 1) throw Error("Unsupported progress data");
  const p = value as unknown as Progress;
  if (![p.totalGames, p.wins, p.draws, p.losses, p.totalXP].every(count) ||
    p.totalGames !== p.wins + p.draws + p.losses || p.totalXP !== p.wins * 30 + p.draws * 15 + p.losses * 5) throw Error("Inconsistent progress counters");
  if (!Array.isArray(p.creditedIds) || p.creditedIds.length !== p.totalGames || !p.creditedIds.every(id) || new Set(p.creditedIds).size !== p.totalGames) throw Error("Invalid progress IDs");
  if (!Array.isArray(p.history) || p.history.length !== Math.min(10, p.totalGames)) throw Error("Invalid progress history");
  const recentIds = p.creditedIds.slice(-10).reverse();
  const recent = { win: 0, draw: 0, loss: 0 };
  p.history.forEach((g, i) => {
    if (!object(g)) throw Error("Invalid game record");
    const { xp, ...game } = g;
    if (!validCompletedGame(game) || xp !== XP[game.result] || game.id !== recentIds[i]) throw Error("Invalid game record");
    recent[game.result]++;
  });
  if (recent.win > p.wins || recent.draw > p.draws || recent.loss > p.losses) throw Error("Inconsistent recent results");
  return freezeProgress(p);
}
export function creditGame(p: Progress, game: CompletedGame): Progress {
  if (!validCompletedGame(game)) throw Error("Invalid completed game");
  if (p.creditedIds.includes(game.id)) return p;
  const next = {
    ...p, totalGames: p.totalGames + 1, wins: p.wins + Number(game.result === "win"),
    draws: p.draws + Number(game.result === "draw"), losses: p.losses + Number(game.result === "loss"),
    totalXP: p.totalXP + XP[game.result], creditedIds: [...p.creditedIds, game.id],
    history: [{ ...game, xp: XP[game.result] }, ...p.history].slice(0, 10),
  };
  return validateProgress(next);
}
