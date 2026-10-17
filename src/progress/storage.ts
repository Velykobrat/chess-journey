import { emptyProgress, validateProgress, type Progress } from "./model.ts";
export const STORAGE_KEY = "chess-journey:progress:v1";
export const MAX_STORAGE_LENGTH = 1_000_000;
export type StoragePort = Pick<Storage, "getItem" | "setItem">;
export type StorageAccess = () => StoragePort;
export type LoadedProgress = { data: Progress; raw: string | null; persistent: boolean; notice: string };
export function loadProgress(access: StorageAccess): LoadedProgress {
  try {
    const raw = access().getItem(STORAGE_KEY);
    if (raw === null) return { data: emptyProgress(), raw, persistent: true, notice: "" };
    if (raw.length > MAX_STORAGE_LENGTH) throw Error("Progress record too large");
    return { data: validateProgress(JSON.parse(raw)), raw, persistent: true, notice: "" };
  } catch {
    return { data: emptyProgress(), raw: null, persistent: false,
      notice: "Saved progress is unavailable or unsupported. It has not been changed. Progress is session-only." };
  }
}
export function saveProgress(access: StorageAccess, data: Progress, previous: string | null): string {
  const storage = access();
  if (storage.getItem(STORAGE_KEY) !== previous) throw Error("Progress changed outside this session");
  const raw = JSON.stringify(data);
  if (raw.length > MAX_STORAGE_LENGTH) throw Error("Progress storage limit reached");
  storage.setItem(STORAGE_KEY, raw);
  if (storage.getItem(STORAGE_KEY) !== raw) throw Error("Storage refused the write");
  return raw;
}
