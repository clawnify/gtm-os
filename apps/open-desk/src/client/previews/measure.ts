/**
 * Where a platform folds a post behind "…see more".
 *
 * The fold is a *line* count, not a character count, and lines depend on the
 * actual glyph widths at the platform's exact content width and font. Counting
 * characters is close for average prose and wrong exactly where it matters —
 * a post padded with narrow characters, a post with hard line breaks, a post
 * sitting a word either side of the boundary.
 *
 * So this measures instead of estimating: it lays the text out in a hidden
 * element matching the platform's width, font, size and line-height, then
 * binary-searches for the longest prefix that still fits inside N lines. The
 * browser's own layout engine decides where the lines break, which is the only
 * thing that can answer the question correctly.
 */

export interface FoldSpec {
  /** Content width in CSS pixels, excluding the post's horizontal padding. */
  width: number;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight?: number;
  letterSpacing?: string;
  /** Lines visible before the fold. */
  lines: number;
  /**
   * The affordance rendered inline at the end of the last visible line
   * ("…see more"). Its width is reserved so the fold lands where the platform
   * puts it, not one word later.
   */
  suffix: string;
}

let scratch: HTMLDivElement | null = null;

function measuringElement(spec: FoldSpec): HTMLDivElement {
  if (!scratch) {
    scratch = document.createElement("div");
    scratch.setAttribute("aria-hidden", "true");
    // Off-screen rather than display:none — a hidden element has no layout,
    // and layout is the entire question being asked.
    scratch.style.position = "absolute";
    scratch.style.left = "-99999px";
    scratch.style.top = "0";
    scratch.style.visibility = "hidden";
    scratch.style.pointerEvents = "none";
    document.body.appendChild(scratch);
  }
  scratch.style.width = `${spec.width}px`;
  scratch.style.fontFamily = spec.fontFamily;
  scratch.style.fontSize = `${spec.fontSize}px`;
  scratch.style.lineHeight = `${spec.lineHeight}px`;
  scratch.style.fontWeight = String(spec.fontWeight ?? 400);
  scratch.style.letterSpacing = spec.letterSpacing ?? "normal";
  scratch.style.whiteSpace = "pre-wrap";
  scratch.style.overflowWrap = "break-word";
  scratch.style.wordBreak = "normal";
  return scratch;
}

function fitsInLines(el: HTMLDivElement, text: string, spec: FoldSpec): boolean {
  el.textContent = text;
  // Round to absorb sub-pixel line-height, which would otherwise report a
  // perfectly-fitting final line as an overflow.
  return Math.round(el.scrollHeight) <= spec.lines * spec.lineHeight + 1;
}

export interface Fold {
  /** True when the platform would collapse this post. */
  folded: boolean;
  /** The text a reader sees before expanding. */
  visible: string;
  /** The text hidden behind the affordance. */
  hidden: string;
  /** How many lines the full text occupies. */
  totalLines: number;
}

export function measureFold(text: string, spec: FoldSpec): Fold {
  if (typeof document === "undefined" || !text) {
    return { folded: false, visible: text, hidden: "", totalLines: text ? 1 : 0 };
  }

  const el = measuringElement(spec);

  el.textContent = text;
  const totalLines = Math.max(1, Math.round(el.scrollHeight / spec.lineHeight));

  if (fitsInLines(el, text, spec)) {
    return { folded: false, visible: text, hidden: "", totalLines };
  }

  // Reserve room for the affordance on the final visible line, so the cut
  // lands where the platform draws it.
  const probe = (n: number) => fitsInLines(el, text.slice(0, n) + spec.suffix, spec);

  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (probe(mid)) lo = mid;
    else hi = mid - 1;
  }

  // Cut on a word boundary — platforms break between words, not mid-word.
  let cut = lo;
  const lastSpace = text.lastIndexOf(" ", cut);
  const lastBreak = text.lastIndexOf("\n", cut);
  const boundary = Math.max(lastSpace, lastBreak);
  if (boundary > cut * 0.6) cut = boundary;

  return {
    folded: true,
    visible: text.slice(0, cut).trimEnd(),
    hidden: text.slice(cut).trimStart(),
    totalLines,
  };
}
