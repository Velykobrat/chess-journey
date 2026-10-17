// Kept outside React so focus containment/restoration can be exercised with DOM doubles.
export function manageDialogFocus(dialog: HTMLElement, fallback: () => HTMLElement | null) {
  const doc = dialog.ownerDocument;
  const previous = doc.activeElement as HTMLElement | null;
  const controls = () => [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
    .filter(node => !node.hidden && !node.closest('[hidden], [inert]'));
  (controls()[0] ?? dialog).focus({ preventScroll: true });
  const containFocus = (event: FocusEvent) => {
    if (!dialog.contains(event.target as Node)) (controls()[0] ?? dialog).focus({ preventScroll: true });
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const list = controls();
    const first = list[0]; const last = list.at(-1);
    if (!first) { event.preventDefault(); dialog.focus(); return; }
    if (event.shiftKey && (doc.activeElement === first || !list.includes(doc.activeElement as HTMLElement))) {
      event.preventDefault(); last!.focus();
    } else if (!event.shiftKey && (doc.activeElement === last || !list.includes(doc.activeElement as HTMLElement))) {
      event.preventDefault(); first.focus();
    }
  };
  dialog.addEventListener('keydown', keydown);
  doc.addEventListener('focusin', containFocus);
  return () => {
    dialog.removeEventListener('keydown', keydown);
    doc.removeEventListener('focusin', containFocus);
    const target = previous?.isConnected && !previous.matches(':disabled') && !previous.closest('[inert]') ? previous : fallback();
    target?.focus({ preventScroll: true });
  };
}
