import { ArrowBigDown, ArrowBigUp, MessageSquare, Share2 } from "lucide-react";
import type { PlatformSpec } from "./specs";
import type { Fold } from "./measure";

/**
 * Replicas of other companies' interfaces.
 *
 * This file and `specs.ts` are the only places in the app carrying raw colors
 * and pixel values instead of design tokens, and deliberately so: the point is
 * to look like their product, not ours. A token here would defeat the purpose.
 */

export interface ReplicaProps {
  name: string;
  /** Kind-specific context from the draft: subreddit, username, and so on. */
  meta?: Record<string, unknown>;
  handle?: string | null;
  headline?: string | null;
  avatar: React.ReactNode;
  content: string;
  title?: string | null;
  spec: PlatformSpec;
  fold: Fold | null;
  expanded: boolean;
  onExpand: () => void;
}

function Body({
  content,
  fold,
  expanded,
  onExpand,
  spec,
  affordanceClass,
  placeholder,
}: ReplicaProps & { affordanceClass: string; placeholder: string }) {
  const visible = !fold || !fold.folded || expanded ? content : fold.visible;
  return (
    <>
      {visible || <span className="opacity-40">{placeholder}</span>}
      {fold?.folded && !expanded && (
        <button className={affordanceClass} onClick={onExpand}>
          {spec.fold?.suffix}
        </button>
      )}
    </>
  );
}

/** A LinkedIn comment: indented under a post, narrower, smaller, folds sooner. */
export function LinkedInCommentReplica(props: ReplicaProps) {
  const { name, headline, avatar, spec } = props;
  return (
    <div style={{ width: spec.cardWidth }} className="max-w-full">
      <div className="flex gap-2">
        <div className="size-8 shrink-0 overflow-hidden rounded-full">{avatar}</div>
        <div className="min-w-0 flex-1">
          <div className="rounded-lg rounded-tl-none bg-[#f4f2ee] px-3 py-2">
            <div className="flex items-baseline gap-1">
              <span className="truncate text-sm font-semibold text-[#000000e6]">
                {name || "Your name"}
              </span>
              <span className="text-xs text-[#00000099]">· 1st</span>
            </div>
            {headline && (
              <div className="truncate text-xs leading-tight text-[#00000099]">{headline}</div>
            )}
            <div
              className="mt-1 break-words whitespace-pre-wrap text-[#000000e6]"
              style={{ fontSize: spec.fold!.fontSize, lineHeight: `${spec.fold!.lineHeight}px` }}
            >
              <Body
                {...props}
                affordanceClass="ml-1 text-[#00000099] hover:text-[#0a66c2] hover:underline"
                placeholder="Add a comment…"
              />
            </div>
          </div>
          <div className="mt-1 flex items-center gap-3 px-3 text-xs font-semibold text-[#00000099]">
            <span>Like</span>
            <span>·</span>
            <span>Reply</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A Reddit text post, opened rather than as a feed card. */
export function RedditReplica(props: ReplicaProps) {
  const { name, avatar, title, spec, meta } = props;
  const subreddit = typeof meta?.subreddit === "string" ? meta.subreddit : "subreddit";
  const username = typeof meta?.reddit_username === "string" ? meta.reddit_username : name || "you";
  return (
    <div
      style={{ width: spec.cardWidth }}
      className="max-w-full overflow-hidden rounded-lg border border-[#ccc] bg-white text-[#1c1c1c] shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
    >
      <div className="flex">
        <div className="flex w-10 shrink-0 flex-col items-center gap-1 bg-[#f8f9fa] py-2">
          <ArrowBigUp size={20} className="text-[#878a8c]" />
          <span className="text-xs font-bold tabular-nums">1</span>
          <ArrowBigDown size={20} className="text-[#878a8c]" />
        </div>
        <div className="min-w-0 flex-1 p-3">
          <div className="flex items-center gap-1.5 text-xs text-[#787c7e]">
            <div className="size-5 overflow-hidden rounded-full">{avatar}</div>
            <span className="font-bold text-[#1c1c1c]">r/{subreddit}</span>
            <span>· Posted by u/{username} just now</span>
          </div>
          <h3 className="mt-2 text-lg font-medium leading-snug text-[#222]">
            {title || <span className="opacity-40">An interesting title</span>}
          </h3>
          <div
            className="mt-2 break-words whitespace-pre-wrap"
            style={{ fontSize: spec.fold!.fontSize, lineHeight: `${spec.fold!.lineHeight}px` }}
          >
            <Body
              {...props}
              affordanceClass="ml-1 font-bold text-[#0079d3] hover:underline"
              placeholder="Text (optional)"
            />
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs font-bold text-[#878a8c]">
            <span className="inline-flex items-center gap-1">
              <MessageSquare size={16} /> 0 Comments
            </span>
            <span className="inline-flex items-center gap-1">
              <Share2 size={16} /> Share
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A Reddit comment, threaded under its parent. */
export function RedditCommentReplica(props: ReplicaProps) {
  const { name, avatar, spec, meta } = props;
  const username = typeof meta?.reddit_username === "string" ? meta.reddit_username : name || "you";
  return (
    <div style={{ width: spec.cardWidth }} className="max-w-full text-[#1c1c1c]">
      <div className="flex gap-2">
        <div className="flex flex-col items-center">
          <div className="size-6 shrink-0 overflow-hidden rounded-full">{avatar}</div>
          {/* Reddit's thread line, which is most of what makes a comment read
              as a reply rather than a post. */}
          <div className="mt-1 w-px flex-1 bg-[#edeff1]" />
        </div>
        <div className="min-w-0 flex-1 pb-2">
          <div className="flex items-center gap-1 text-xs">
            <span className="font-bold">u/{username}</span>
            <span className="text-[#787c7e]">· 1 point · just now</span>
          </div>
          <div
            className="mt-1 break-words whitespace-pre-wrap"
            style={{ fontSize: spec.fold!.fontSize, lineHeight: `${spec.fold!.lineHeight}px` }}
          >
            <Body
              {...props}
              affordanceClass="ml-1 font-bold text-[#0079d3] hover:underline"
              placeholder="What are your thoughts?"
            />
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs font-bold text-[#878a8c]">
            <span>Reply</span>
            <span>Share</span>
            <span>Report</span>
          </div>
        </div>
      </div>
    </div>
  );
}
