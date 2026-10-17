import test from 'node:test';
import assert from 'node:assert/strict';
import { creditGame, emptyProgress, levelForXP, validateProgress, winRate } from '../src/progress/model.ts';
import { STORAGE_KEY, MAX_STORAGE_LENGTH } from '../src/progress/storage.ts';
import { ProgressStore } from '../src/progress/store.ts';
import { GameController, type CompletedGame } from '../src/game/controller.ts';
import type { EngineWorker } from '../src/services/engine.ts';

const completed = (id: string, result: CompletedGame['result'] = 'win'): CompletedGame => ({
  id, date: '2026-10-17T12:00:00.000Z', result, playerColor: 'w', difficulty: 'casual', moves: 20,
});
class MemoryStorage {
  raw: string | null = null; writes = 0; failRead = false; failWrite = false; silent = false;
  getItem(key: string) { assert.equal(key, STORAGE_KEY); if (this.failRead) throw Error('blocked'); return this.raw; }
  setItem(key: string, value: string) { assert.equal(key, STORAGE_KEY); this.writes++; if (this.failWrite) throw Error('quota'); if (!this.silent) this.raw = value; }
}
for (const [result, xp] of [['win', 30], ['draw', 15], ['loss', 5]] as const) test(`${result} gives ${xp} XP and consistent stats`, () => {
  const p = creditGame(emptyProgress(), completed(result, result));
  assert.equal(p.totalXP, xp); assert.equal(p.totalGames, 1); assert.equal(p.history[0].xp, xp);
  assert.equal(p.wins, Number(result === 'win')); assert.equal(p.draws, Number(result === 'draw')); assert.equal(p.losses, Number(result === 'loss'));
  assert.equal(winRate(p), result === 'win' ? 100 : 0); assert(Object.isFrozen(p.history[0]));
});
for (const [xp, level] of [[0,1], [99,1], [100,2], [199,2], [200,3]]) test(`level boundary ${xp} → ${level}`, () => assert.equal(levelForXP(xp), level));
test('aggregates, fractional win rate and empty stats are derived without duplicated level/rate', () => {
  let p = emptyProgress(); assert.equal(winRate(p), 0);
  p = creditGame(p, completed('a')); p = creditGame(p, completed('b', 'draw')); p = creditGame(p, completed('c', 'loss'));
  assert.equal(p.totalGames, 3); assert.equal(p.totalXP, 50); assert(Math.abs(winRate(p) - 100 / 3) < 1e-10);
  assert(!('currentLevel' in p)); assert(!('winRate' in p)); assert.equal(p.wins + p.draws + p.losses, p.totalGames);
});
test('only ten recent records retained; lifetime IDs prevent recrediting an evicted result after reload', () => {
  const storage = new MemoryStorage(); const store = new ProgressStore(() => storage);
  for (let i=0;i<12;i++) store.record(completed('game-' + i));
  const p = store.getSnapshot().data; assert.equal(p.history.length, 10); assert.equal(p.history[0].id, 'game-11'); assert.equal(p.history[9].id, 'game-2');
  assert.equal(p.totalGames, 12); const reload = new ProgressStore(() => storage); reload.load();
  assert.equal(reload.record(completed('game-0')), false); assert.deepEqual(reload.getSnapshot().data, p);
});
test('first load does not write; persistence reload is exact, repeat load/credit are idempotent', () => {
  const storage = new MemoryStorage(); const s = new ProgressStore(() => storage); s.load(); assert.equal(storage.writes, 0);
  s.record(completed('a')); const raw = storage.raw; s.load(); s.record(completed('a', 'loss')); assert.equal(storage.raw, raw); assert.equal(storage.writes, 1);
  const second = new ProgressStore(() => storage); second.load(); second.load(); assert.deepEqual(second.getSnapshot().data, s.getSnapshot().data);
  assert(second.getSnapshot().persistent); assert.equal(second.getSnapshot().notice, '');
});
for (const raw of ['{', 'null', '[]', '1', JSON.stringify({ ...emptyProgress(), version: 2 }), JSON.stringify({ ...emptyProgress(), wins: '0' }), JSON.stringify({ ...emptyProgress(), extra: true }), ' '.repeat(MAX_STORAGE_LENGTH + 1)]) {
  test(`unrecognized storage preserved: ${raw.slice(0, 50)}`, () => {
    const storage = new MemoryStorage(); storage.raw = raw; const s = new ProgressStore(() => storage); s.load();
    assert(!s.getSnapshot().persistent); assert(s.getSnapshot().notice.includes('session-only')); s.record(completed('a')); s.load();
    assert.equal(storage.raw, raw); assert.equal(storage.writes, 0); assert.equal(s.getSnapshot().data.totalXP, 30);
  });
}
for (const mutation of [
  (p: Record<string, unknown>) => { p.totalXP = 31; },
  (p: Record<string, unknown>) => { p.totalGames = 2; },
  (p: Record<string, unknown>) => { p.wins = -1; },
  (p: Record<string, unknown>) => { p.totalXP = Number.MAX_SAFE_INTEGER + 1; },
  (p: Record<string, unknown>) => { p.history = []; },
  (p: Record<string, unknown>) => { p.creditedIds = ['wrong']; },
  (p: Record<string, unknown>) => { p.creditedIds = ['a', 'a']; },
  (p: Record<string, unknown>) => { (p.history as Record<string, unknown>[])[0].xp = 100; },
  (p: Record<string, unknown>) => { (p.history as Record<string, unknown>[])[0].date = 'invalid'; },
  (p: Record<string, unknown>) => { (p.history as Record<string, unknown>[])[0].difficulty = 'other'; },
  (p: Record<string, unknown>) => { (p.history as Record<string, unknown>[])[0].playerColor = 'white'; },
  (p: Record<string, unknown>) => { (p.history as Record<string, unknown>[])[0].moves = 0; },
  (p: Record<string, unknown>) => { (p.history as Record<string, unknown>[])[0].email = 'not-allowed'; },
]) test('reject inconsistent counters/IDs/history/schema: ' + mutation.toString().slice(0, 70), () => {
  const invalid = structuredClone(creditGame(emptyProgress(), completed('a'))) as unknown as Record<string, unknown>; mutation(invalid);
  assert.throws(() => validateProgress(invalid));
});
test('unavailable storage/getter and read failures preserve a playable session and repeated-load earnings', () => {
  for (const access of [() => { throw Error('getter denied'); }, () => { const s = new MemoryStorage(); s.failRead = true; return s; }]) {
    const s = new ProgressStore(access); s.record(completed('a')); s.load(); s.record(completed('b', 'loss'));
    assert.equal(s.getSnapshot().data.totalXP, 35); assert(!s.getSnapshot().persistent);
  }
});
for (const mode of ['write-error','silent-write','read-error','external-change'] as const) test(`${mode} switches to memory and does not overwrite existing data later`, () => {
  const storage = new MemoryStorage(); const s = new ProgressStore(() => storage); s.record(completed('a')); const saved = storage.raw;
  if (mode === 'write-error') storage.failWrite = true;
  if (mode === 'silent-write') storage.silent = true;
  if (mode === 'read-error') storage.failRead = true;
  if (mode === 'external-change') storage.raw = '{"foreign":"preserve"}';
  const before = storage.raw; s.record(completed('b', 'draw')); s.load(); s.record(completed('c', 'loss'));
  assert.equal(storage.raw, before); assert.equal(s.getSnapshot().data.totalXP, 50); assert(!s.getSnapshot().persistent);
  assert(saved); assert(s.getSnapshot().notice.includes('session-only'));
});
test('invalid completion input is rejected without writes or gameplay side effects', () => {
  const storage = new MemoryStorage(); const s = new ProgressStore(() => storage);
  assert.equal(s.record({ ...completed('a'), result: 'unknown' } as unknown as CompletedGame), false);
  assert.equal(s.record({ ...completed('a'), moves: 0 }), false); assert.equal(storage.writes, 0);
});

class WorkerFake implements EngineWorker {
  onmessage: EngineWorker['onmessage'] = null; onerror: EngineWorker['onerror'] = null; onmessageerror: EngineWorker['onmessageerror'] = null;
  terminated = false; sent: string[] = [];
  postMessage(message: string) { this.sent.push(message); } terminate() { this.terminated = true; }
  emit(data: string) { this.onmessage?.(new MessageEvent('message', { data })); }
  ready() { this.emit('uciok\nreadyok'); }
  queued() { const fn = this.onmessage; return (data: string) => fn?.(new MessageEvent('message', { data })); }
}
function gameFixture(t: { after: (fn: () => void) => void }, fen?: string, black = false, onComplete?: (game: CompletedGame) => void) {
  const storage = new MemoryStorage(); const store = new ProgressStore(() => storage); const workers: WorkerFake[] = [];
  const c = new GameController(() => { const w = new WorkerFake(); workers.push(w); return w; }, fen, undefined, undefined, onComplete ?? store.record);
  t.after(c.connect()); const worker = () => workers.at(-1)!; worker().ready(); if (black) c.setPlayerColorChoice('black'); c.startConfiguredGame(); worker().ready();
  return { c, worker, store, storage };
}
for (const black of [false, true]) test(`human win and AI loss classification as ${black ? 'Black' : 'White'}`, t => {
  // White wins with Qg7#; same actual board ending is a human loss when playing Black.
  const f = gameFixture(t, '7k/8/5KQ1/8/8/8/8/8 w - - 0 1', black);
  if (black) f.worker().emit('bestmove g6g7'); else assert(f.c.drop('g6','g7'));
  const p = f.store.getSnapshot().data; assert.equal(p.totalGames, 1); assert.equal(p.totalXP, black ? 5 : 30); assert.equal(p.history[0].playerColor, black ? 'b' : 'w');
});
for (const black of [false, true]) test(`Black checkmate also correctly rewards ${black ? 'win' : 'loss'}`, t => {
  const f = gameFixture(t, '8/8/8/8/8/5kq1/8/7K b - - 0 1', black);
  if (black) assert(f.c.drop('g3','g2')); else f.worker().emit('bestmove g3g2');
  assert.equal(f.store.getSnapshot().data.totalXP, black ? 30 : 5);
});
test('mate is credited synchronously once, undo locked, duplicate callbacks/renders/retry cannot farm XP', t => {
  const f = gameFixture(t, '7k/8/5KQ1/8/8/8/8/8 w - - 0 1'); f.c.drop('g6','g7');
  const event = f.c.getSnapshot().completedGame!; const fen = f.c.getSnapshot().position;
  assert(event); assert(!f.c.getSnapshot().canUndo); f.c.undoMove(); assert.equal(f.c.getSnapshot().position, fen);
  f.c.flipBoard(); f.c.retryEngine(); f.worker().ready(); f.c.getSnapshot(); f.store.record(event);
  assert.equal(f.store.getSnapshot().data.totalGames, 1); assert.equal(f.storage.writes, 1);
  f.c.rematchGame(); f.worker().ready(); f.c.drop('g6','g7');
  assert.equal(f.store.getSnapshot().data.totalGames, 2); assert.notEqual(f.c.getSnapshot().completedGame!.id, event.id);
});
test('fast rematch/new game cannot erase completion or credit an abandoned game', t => {
  const f = gameFixture(t, '7k/8/5KQ1/8/8/8/8/8 w - - 0 1'); f.c.drop('g6','g7');
  f.c.rematchGame(); f.c.rematchGame(); f.c.openNewGameSetup(); f.c.setDifficulty('master'); f.worker().ready(); f.c.startConfiguredGame(); f.worker().ready();
  assert.equal(f.store.getSnapshot().data.totalGames, 1); f.c.drop('g6','g7'); assert.equal(f.store.getSnapshot().data.totalGames, 2);
  assert.equal(f.store.getSnapshot().data.history[0].difficulty, 'master');
});
for (const [fen, from, to, description] of [
  ['7k/8/5KQ1/8/8/8/8/8 w - - 0 1','g6','f7','Stalemate'],
  ['7k/8/8/8/8/8/1r6/K7 w - - 0 1','a1','b2','Insufficient material'],
  ['7k/8/8/8/8/8/R7/K7 w - - 99 50','a2','b2','50-move rule'],
]) test(`real ${description} transition awards draw XP`, t => {
  const f = gameFixture(t, fen); assert(f.c.drop(from,to)); assert.equal(f.c.getSnapshot().result?.description, description);
  assert.equal(f.store.getSnapshot().data.totalXP, 15); assert.equal(f.store.getSnapshot().data.draws, 1);
});
test('real threefold repetition earns a single draw and records full move count', t => {
  const f = gameFixture(t);
  for (let i=0;i<2;i++) { f.c.drop('g1','f3'); f.worker().emit('bestmove g8f6'); f.c.drop('f3','g1'); f.worker().emit('bestmove f6g8'); }
  assert.equal(f.c.getSnapshot().result?.description, 'Threefold repetition'); assert.equal(f.store.getSnapshot().data.totalXP, 15);
  assert.equal(f.store.getSnapshot().data.history[0].moves, 4);
});
test('unfinished play, pre-finish undo, setup and stale session responses never award XP', t => {
  const f = gameFixture(t); f.c.drop('e2','e4'); const stale = f.worker().queued(); f.c.undoMove(); f.worker().ready(); stale('bestmove e7e5');
  f.c.drop('d2','d4'); f.c.openNewGameSetup(); f.c.setDifficulty('master'); f.worker().ready();
  assert.equal(f.store.getSnapshot().data.totalGames, 0); assert.equal(f.storage.writes, 0);
});
test('storage/callback failures do not block legal mate, result UI or rematch lifecycle', t => {
  const f = gameFixture(t, '7k/8/5KQ1/8/8/8/8/8 w - - 0 1', false, () => { throw Error('failed storage'); });
  assert(f.c.drop('g6','g7')); assert.equal(f.c.getSnapshot().result?.title, 'You win!'); assert(!f.c.getSnapshot().canUndo);
  f.c.rematchGame(); f.worker().ready(); assert(f.c.getSnapshot().canMove);
});
