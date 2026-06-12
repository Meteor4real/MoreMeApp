// Print helpers. The MoreMe CSS hides every element during @media print
// except descendants of `.mm-print` — so to print a particular slice, we
// tag its container before window.print() and untag after.

export function printElement(el: HTMLElement | null): void {
  if (!el) { window.print(); return; }
  el.classList.add("mm-print");
  // give the browser a tick to apply the class before opening the dialog
  window.setTimeout(() => {
    try { window.print(); }
    finally {
      // remove on the next tick, after the print dialog returns
      window.setTimeout(() => el.classList.remove("mm-print"), 50);
    }
  }, 0);
}

// React ref-friendly helper: pass an element ref, get a click handler.
export function makePrintHandler(getEl: () => HTMLElement | null) {
  return () => printElement(getEl());
}
