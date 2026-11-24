/**
 * Which menu section is "current" while the person scrolls a long workspace
 * page (owner 24/11/26: the mark stayed on the first link). Pure, so the web
 * hook only measures and this decides.
 */
export interface SectionBox {
  id: string;
  /** Distance from the top of the viewport to the section's top, in px. */
  top: number;
  /** Distance from the top of the viewport to the section's bottom, in px. */
  bottom: number;
}

/**
 * The current section is the last one whose top has passed the reading line
 * (a little below the top bar) and that still reaches past it. Before any
 * section reaches the line, the first section counts; when the page is
 * scrolled to the very end, the last section on screen counts, so a short
 * final section can still become current.
 */
export function pickCurrentSection(
  boxes: SectionBox[],
  options: { line?: number; atPageEnd?: boolean; viewportHeight?: number } = {}
): string | null {
  const present = boxes.filter((box) => box.bottom > box.top);
  if (present.length === 0) return null;
  const sorted = [...present].sort((a, b) => a.top - b.top);
  if (options.atPageEnd) {
    const height = options.viewportHeight ?? Number.POSITIVE_INFINITY;
    const onScreen = sorted.filter((box) => box.top < height && box.bottom > 0);
    const last = onScreen[onScreen.length - 1];
    if (last) return last.id;
  }
  const line = options.line ?? 120;
  let current: SectionBox | null = null;
  for (const box of sorted) {
    if (box.top <= line && box.bottom > line) current = box;
  }
  if (current) return current.id;
  const passed = sorted.filter((box) => box.top <= line);
  const lastPassed = passed[passed.length - 1];
  return (lastPassed ?? sorted[0])!.id;
}
