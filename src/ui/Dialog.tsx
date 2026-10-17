import { useEffect, useRef, type ReactNode } from "react";
import { manageDialogFocus } from "./dialog-focus.ts";
export function Dialog({ kind, titleId, descriptionId, onDismiss, children }: {
  kind: "setup" | "promotion" | "result"; titleId: string; descriptionId?: string;
  onDismiss?: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const cleanup = manageDialogFocus(dialog, () => document.getElementById("game-focus-target"));
    return () => { document.body.style.overflow = before; cleanup(); };
  }, []);
  return <div className={`${kind}-backdrop`}>
    <div ref={ref} className={`${kind}-card`} role="dialog" aria-modal="true" aria-labelledby={titleId}
      aria-describedby={descriptionId} tabIndex={-1} onKeyDown={event => {
        if (event.key === "Escape" && onDismiss) { event.preventDefault(); event.stopPropagation(); onDismiss(); }
      }}>{children}</div>
  </div>;
}
