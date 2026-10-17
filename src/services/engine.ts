export type EngineState = "loading" | "ready" | "thinking" | "error";
export interface EngineWorker {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage(message: string): void;
  terminate(): void;
}
export type Search = { fen: string; position: string };
type Session = {
  worker: EngineWorker;
  phase: "uci" | "ready" | "idle" | "search";
  search: Search | null;
  timer: ReturnType<typeof setTimeout> | null;
};

// UCI bestmove carries no request ID. Never reuse a cancelled/failed session.
// Normal searches are serialized; stop/restart/undo/settings terminate the Worker.
export class StockfishEngine {
  private session: Session | null = null;
  private readonly factory: () => EngineWorker;
  private readonly onState: (state: EngineState) => void;
  private readonly onMove: (move: string, search: Search) => void;
  private readonly deadlines: { init: number; search: number };
  constructor(factory: () => EngineWorker, onState: (state: EngineState) => void,
    onMove: (move: string, search: Search) => void, deadlines = { init: 15000, search: 10000 }) {
    this.factory = factory; this.onState = onState; this.onMove = onMove; this.deadlines = deadlines;
  }

  private clearTimer(session: Session) {
    if (session.timer !== null) clearTimeout(session.timer);
    session.timer = null;
  }
  cancel() {
    const session = this.session;
    this.session = null; // Invalidate even callbacks already queued by the browser.
    if (!session) return;
    this.clearTimer(session);
    session.worker.onmessage = null;
    session.worker.onerror = null;
    session.worker.onmessageerror = null;
    session.worker.terminate();
  }
  fail() {
    this.cancel();
    this.onState("error");
  }
  private deadline(session: Session, ms: number) {
    this.clearTimer(session);
    // Liveness watchdog only, never used to order UCI messages or hide races.
    session.timer = setTimeout(() => {
      if (this.session === session) this.fail();
    }, ms);
  }
  private send(session: Session, message: string) {
    if (this.session !== session) return false;
    try { session.worker.postMessage(message); return true; }
    catch { this.fail(); return false; }
  }
  prepare(skill: number, search: Search | null = null) {
    this.cancel();
    this.onState("loading");
    try {
      const session: Session = { worker: this.factory(), phase: "uci", search, timer: null };
      this.session = session;
      session.worker.onerror = session.worker.onmessageerror = () => {
        if (this.session === session) this.fail();
      };
      session.worker.onmessage = ({ data }) => {
        if (this.session !== session || typeof data !== "string") return;
        for (const line of data.split(/\r?\n/)) {
          if (this.session !== session) break;
          const message = line.trim();
          if (message === "uciok" && session.phase === "uci") {
            session.phase = "ready";
            if (!this.send(session, `setoption name Skill Level value ${skill}`)) break;
            if (!this.send(session, "ucinewgame")) break;
            this.send(session, "isready");
          } else if (message === "readyok" && session.phase === "ready") {
            this.clearTimer(session);
            session.phase = "idle";
            if (session.search) this.beginSearch(session);
            else this.onState("ready");
          } else if (/^bestmove(?:\s|$)/.test(message) && session.phase === "search") {
            const match = /^bestmove ([a-h][1-8][a-h][1-8][qrbn]?)(?: ponder [a-h][1-8][a-h][1-8][qrbn]?)?$/.exec(message);
            if (!match || !session.search) { this.fail(); break; }
            const completed = session.search;
            session.search = null;
            session.phase = "idle";
            this.clearTimer(session);
            this.onState("ready");
            if (this.session === session) this.onMove(match[1], completed);
          }
        }
      };
      this.deadline(session, this.deadlines.init);
      this.send(session, "uci");
    } catch { this.fail(); }
  }
  private beginSearch(session: Session) {
    const search = session.search;
    if (!search || this.session !== session || session.phase !== "idle") return;
    session.phase = "search";
    this.onState("thinking");
    this.deadline(session, this.deadlines.search);
    if (this.send(session, search.position)) this.send(session, "go movetime 500");
  }
  search(search: Search) {
    const session = this.session;
    if (!session || session.phase !== "idle") return false;
    session.search = search;
    this.beginSearch(session);
    return this.session === session;
  }
}
