import type { FoldSpec } from "./measure";

/**
 * Platform rendering constants.
 *
 * These are replicas of other companies' interfaces, so the values here are
 * their measurements, not ours — which is why this is the one place in the app
 * that carries raw colors and pixel values instead of design tokens. A token
 * would defeat the purpose: the point is to look like their product, not ours.
 *
 * Each value is a measurement of the platform's own feed and needs re-checking
 * whenever that platform reskins.
 */

/**
 * VERIFICATION STATUS
 *
 * `linkedin.post` is measured: the fold was checked against the rendered card
 * in a real layout engine, which is how the 518px content box (552 border-box
 * minus borders and padding) was found.
 *
 * Every spec marked `verified: false` below is provisional — plausible, and
 * structurally correct, but not yet checked against the platform itself. Treat
 * their fold positions as approximate until someone measures them. Verifying
 * one is a change to the numbers here and nothing else.
 */

export interface PlatformSpec {
  label: string;
  /** Whether these numbers have been checked against the real thing. */
  verified: boolean;
  /** Outer border-box width, matching the platform's feed column. */
  cardWidth: number;
  /** Horizontal padding inside the card. */
  padX: number;
  /** Card border width, per side. */
  borderX: number;
  /** Maximum characters the platform accepts. */
  charLimit: number;
  fold: FoldSpec | null;
}

const SYSTEM_STACK =
  '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const LINKEDIN: PlatformSpec = {
  label: "LinkedIn",
  verified: true,
  cardWidth: 552,
  padX: 16,
  borderX: 1,
  charLimit: 3000,
  fold: {
    // Content box, not card width: the border-box is 552, so the text lays out
    // in 552 - 2 borders - 32 padding = 518. Measured against the rendered
    // card, because two pixels is enough to move the cut by a whole word.
    width: 552 - 1 * 2 - 16 * 2,
    fontFamily: SYSTEM_STACK,
    fontSize: 14,
    lineHeight: 20,
    lines: 3,
    suffix: "…see more",
  },
};

export const X: PlatformSpec = {
  label: "X",
  verified: false,
  cardWidth: 598,
  padX: 16,
  borderX: 1,
  charLimit: 280,
  // A standard post is capped at 280 characters, which never reaches a fold in
  // the timeline. Only long-form posts collapse, and those are a different
  // composer — so there is no fold to model here.
  fold: null,
};

/**
 * A LinkedIn comment, which is not a small post: it sits indented under one, in
 * a narrower column with a smaller avatar, and folds far sooner.
 */
export const LINKEDIN_COMMENT: PlatformSpec = {
  label: "LinkedIn comment",
  verified: false,
  cardWidth: 504,
  padX: 12,
  borderX: 0,
  charLimit: 1250,
  fold: {
    width: 504 - 12 * 2 - 40,
    fontFamily: SYSTEM_STACK,
    fontSize: 14,
    lineHeight: 20,
    lines: 3,
    suffix: "…see more",
  },
};

/** A Reddit text post as it appears opened, not as a feed card. */
export const REDDIT: PlatformSpec = {
  label: "Reddit",
  verified: false,
  cardWidth: 756,
  padX: 16,
  borderX: 1,
  // Reddit's own limit is on the title; the body runs to 40,000.
  charLimit: 40000,
  fold: {
    width: 756 - 1 * 2 - 16 * 2,
    fontFamily: SYSTEM_STACK,
    fontSize: 14,
    lineHeight: 21,
    lines: 10,
    suffix: "Read more",
  },
};

/** Reddit's title field, which is a separate limit people routinely overrun. */
export const REDDIT_TITLE_LIMIT = 300;

export const REDDIT_COMMENT: PlatformSpec = {
  label: "Reddit comment",
  verified: false,
  cardWidth: 700,
  padX: 0,
  borderX: 0,
  charLimit: 10000,
  fold: {
    width: 700 - 36,
    fontFamily: SYSTEM_STACK,
    fontSize: 14,
    lineHeight: 21,
    lines: 10,
    suffix: "See more",
  },
};

/**
 * Which replica to draw. Keyed by the channel's platform, then narrowed by the
 * draft's kind — a comment and a post are different objects on the same
 * platform, drawn differently and folded differently.
 */
export function specFor(platform: string, kind: string): PlatformSpec | null {
  const isComment = kind === "comment";
  switch (platform) {
    case "linkedin":
      return isComment ? LINKEDIN_COMMENT : LINKEDIN;
    case "reddit":
      return isComment ? REDDIT_COMMENT : REDDIT;
    case "twitter":
      return X;
    default:
      return null;
  }
}

export const SPECS: Record<string, PlatformSpec> = {
  linkedin: LINKEDIN,
  twitter: X,
  reddit: REDDIT,
};
