import type { CompletedGame } from "../game/controller.ts";
import { creditGame, emptyProgress, type Progress } from "./model.ts";
import { loadProgress, saveProgress, type StorageAccess } from "./storage.ts";
export class ProgressStore {
  private access: StorageAccess;
  private loaded = false;
  private raw: string | null = null;
  private listeners = new Set<() => void>();
  private snapshot: Readonly<{ data: Progress; persistent: boolean; notice: string }> = Object.freeze({ data: emptyProgress(), persistent: false, notice: "Loading local progress…" });
  constructor(access: StorageAccess = () => window.localStorage) { this.access = access; }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private notify() { this.listeners.forEach(listener => listener()); }
  load = () => {
    if (this.loaded) return; // StrictMode/repeated effects cannot reset session-only earnings.
    this.loaded = true;
    const { data, raw, persistent, notice } = loadProgress(this.access);
    this.raw = raw; this.snapshot = Object.freeze({ data, persistent, notice }); this.notify();
  };
  record = (game: CompletedGame) => {
    this.load();
    let data;
    try { data = creditGame(this.snapshot.data, game); }
    catch { return false; }
    if (data === this.snapshot.data) return false;
    let { persistent, notice } = this.snapshot;
    if (persistent) {
      try { this.raw = saveProgress(this.access, data, this.raw); }
      catch {
        persistent = false;
        notice = "Progress could not be saved (storage unavailable, full, or changed in another tab). This tab is session-only; reload to use saved progress.";
      }
    }
    this.snapshot = Object.freeze({ data, persistent, notice }); this.notify(); return true;
  };
}
