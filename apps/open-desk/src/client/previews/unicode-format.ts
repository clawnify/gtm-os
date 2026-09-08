/**
 * "Bold" and "italic" for platforms that have no formatting.
 *
 * LinkedIn posts are plain text — there is no markup to send. What every tool
 * in this space actually does is substitute letters for their Mathematical
 * Alphanumeric Symbols counterparts, which happen to be drawn bold or italic
 * in most fonts. The text is not styled; it is different characters that look
 * styled.
 *
 * Two consequences that matter and are easy to miss:
 *
 * 1. **Screen readers handle these badly** — many spell them out letter by
 *    letter, or skip them entirely. A bolded sentence can be unreadable to
 *    someone using assistive technology. Worth using on a word, not a
 *    paragraph.
 * 2. **They are outside the Basic Multilingual Plane**, so each one is two
 *    UTF-16 code units. `"𝗮".length === 2`. Any character count that uses
 *    `.length` silently doubles as soon as text is bolded — count codepoints
 *    instead (see `countChars`).
 */

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";

/** Build a plain -> styled map from the first codepoint of each target range. */
function range(start: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => String.fromCodePoint(start + i));
}

interface Style {
  id: string;
  label: string;
  upper?: string[];
  lower?: string[];
  digits?: string[];
  /** Combining mark appended after each character, for underline / strike. */
  combining?: string;
}

// Sans-serif variants, because the platforms these are pasted into set their
// body text in a sans face — the serif ranges look pasted-in.
export const STYLES: Record<string, Style> = {
  bold: {
    id: "bold",
    label: "Bold",
    upper: range(0x1d5d4, 26),
    lower: range(0x1d5ee, 26),
    digits: range(0x1d7ec, 10),
  },
  italic: {
    id: "italic",
    label: "Italic",
    upper: range(0x1d608, 26),
    lower: range(0x1d622, 26),
    // There are no sans-serif italic digits in Unicode, so digits stay plain.
  },
  boldItalic: {
    id: "boldItalic",
    label: "Bold italic",
    upper: range(0x1d63c, 26),
    lower: range(0x1d656, 26),
  },
  underline: { id: "underline", label: "Underline", combining: "̲" },
  strike: { id: "strike", label: "Strikethrough", combining: "̶" },
};

// Reverse lookup: every styled codepoint back to its plain character.
const TO_PLAIN = new Map<string, string>();
for (const style of Object.values(STYLES)) {
  style.upper?.forEach((ch, i) => TO_PLAIN.set(ch, UPPER[i]));
  style.lower?.forEach((ch, i) => TO_PLAIN.set(ch, LOWER[i]));
  style.digits?.forEach((ch, i) => TO_PLAIN.set(ch, DIGITS[i]));
}
const COMBINING = new Set(Object.values(STYLES).map((s) => s.combining).filter(Boolean) as string[]);

/** Strip every styled character back to plain ASCII. */
export function toPlain(text: string): string {
  return [...text]
    .filter((ch) => !COMBINING.has(ch))
    .map((ch) => TO_PLAIN.get(ch) ?? ch)
    .join("");
}

function apply(text: string, style: Style): string {
  return [...text]
    .map((ch) => {
      if (style.combining) return ch === "\n" ? ch : ch + style.combining;
      const u = UPPER.indexOf(ch);
      if (u >= 0 && style.upper) return style.upper[u];
      const l = LOWER.indexOf(ch);
      if (l >= 0 && style.lower) return style.lower[l];
      const d = DIGITS.indexOf(ch);
      if (d >= 0 && style.digits) return style.digits[d];
      return ch;
    })
    .join("");
}

/**
 * Toggle a style over a stretch of text. Text already in that style reverts to
 * plain, so the same button both applies and removes — and switching styles
 * goes through plain first, rather than stacking one range on top of another.
 */
export function toggle(text: string, styleId: string): string {
  const style = STYLES[styleId];
  if (!style) return text;
  const plain = toPlain(text);
  const styled = apply(plain, style);
  return text === styled ? plain : styled;
}

/**
 * Characters as a person counts them. `String.length` counts UTF-16 units, so
 * it reports a bolded word at double length and would show 240/280 for a post
 * that is really 120 characters.
 */
export function countChars(text: string): number {
  return [...text].filter((ch) => !COMBINING.has(ch)).length;
}

/** Prefix each selected line, for bullet and numbered lists. */
export function listify(text: string, kind: "bullet" | "number"): string {
  const lines = text.split("\n");
  const already =
    kind === "bullet"
      ? lines.every((l) => !l.trim() || l.startsWith("• "))
      : lines.every((l) => !l.trim() || /^\d+\.\s/.test(l));

  if (already) {
    return lines
      .map((l) => (kind === "bullet" ? l.replace(/^• /, "") : l.replace(/^\d+\.\s/, "")))
      .join("\n");
  }

  let n = 0;
  return lines
    .map((l) => {
      if (!l.trim()) return l;
      n += 1;
      return kind === "bullet" ? `• ${l}` : `${n}. ${l}`;
    })
    .join("\n");
}
