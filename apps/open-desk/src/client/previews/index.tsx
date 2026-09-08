import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Globe, MessageSquare, MoreHorizontal, Repeat2, Send, ThumbsUp } from "lucide-react";
import { measureFold, type Fold } from "./measure";
import { LINKEDIN, X, specFor, type PlatformSpec } from "./specs";
import {
  LinkedInCommentReplica,
  RedditCommentReplica,
  RedditReplica,
  type ReplicaProps,
} from "./replicas";
import { countChars } from "./unicode-format";

export interface Profile {
  platform: string;
  name: string;
  handle?: string | null;
  headline?: string | null;
  avatarUrl?: string | null;
}

function Avatar({
  name,
  url,
  size,
  fallbackClass,
}: {
  name: string;
  url?: string | null;
  size: string;
  fallbackClass: string;
}) {
  // Platform avatar URLs are expiry-signed and may refuse a cross-origin load.
  // A blank square in a fidelity preview is worse than initials, so failures
  // fall back rather than showing nothing.
  const [broken, setBroken] = useState(false);
  if (url && !broken) {
    return (
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={`${size} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${fallbackClass}`}
    >
      {initials(name)}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * The fold is measured against real layout, so it can only be computed after
 * the fonts the measurement depends on have actually loaded. Re-running once
 * `document.fonts.ready` resolves stops a first paint in a fallback face from
 * fixing the cut in the wrong place.
 */
function useFold(text: string, spec: PlatformSpec | null): Fold | null {
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    let live = true;
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) {
      fonts.ready.then(() => live && setReady(true));
    } else {
      setReady(true);
    }
    return () => {
      live = false;
    };
  }, []);

  return useMemo(() => {
    if (!spec?.fold) return null;
    // `ready` is read so the memo recomputes once fonts settle.
    void ready;
    return measureFold(text, spec.fold);
  }, [text, spec, ready]);
}

export function PlatformPreview({
  profile,
  content,
  kind = "social_post",
  title,
  meta,
}: {
  profile: Profile;
  content: string;
  kind?: string;
  title?: string | null;
  meta?: Record<string, unknown>;
}) {
  const spec = specFor(profile.platform, kind);
  const [expanded, setExpanded] = useState(false);
  const fold = useFold(content, spec);

  // Reset on new text, so moving to the next draft never opens already expanded.
  useEffect(() => setExpanded(false), [content, kind, profile.platform]);

  if (!spec) return <GenericPreview profile={profile} content={content} />;

  const replica: ReplicaProps = {
    name: profile.name,
    handle: profile.handle,
    headline: profile.headline,
    avatar: (
      <Avatar
        name={profile.name}
        url={profile.avatarUrl}
        size="size-full"
        fallbackClass="bg-[#0a66c2] text-[0.625rem]"
      />
    ),
    content,
    title,
    meta,
    spec,
    fold,
    expanded,
    onExpand: () => setExpanded(true),
  };

  switch (spec.label) {
    case "LinkedIn":
      return <LinkedInPreview profile={profile} content={content} fold={fold} expanded={expanded} onExpand={() => setExpanded(true)} />;
    case "LinkedIn comment":
      return <LinkedInCommentReplica {...replica} />;
    case "Reddit":
      return <RedditReplica {...replica} />;
    case "Reddit comment":
      return <RedditCommentReplica {...replica} />;
    case "X":
      return <XPreview profile={profile} content={content} />;
    default:
      return <GenericPreview profile={profile} content={content} />;
  }
}

/** How much of the limit this post uses, and whether the platform will fold it. */
export function PreviewMeter({
  profile,
  content,
  kind = "social_post",
}: {
  profile: Profile;
  content: string;
  kind?: string;
}) {
  const spec = specFor(profile.platform, kind);
  const fold = useFold(content, spec);
  if (!spec) return null;

  const chars = countChars(content);
  const over = chars > spec.charLimit;
  return (
    <div className="flex items-center gap-2 text-[0.6875rem]">
      <span className={over ? "text-danger" : "text-muted"}>
        <span className="tabular-nums">{chars.toLocaleString()}</span>
        <span className="text-faint"> / {spec.charLimit.toLocaleString()}</span>
      </span>
      {fold?.folded && (
        <span className="text-warning">
          folds after <span className="tabular-nums">{spec.fold!.lines}</span> lines ·{" "}
          <span className="tabular-nums">{countChars(fold.hidden)}</span> chars hidden
        </span>
      )}
      {fold && !fold.folded && spec.fold && (
        <span className="text-success">shows in full</span>
      )}
      {!spec.verified && (
        <span className="text-faint" title="These platform measurements have not been checked against the real thing yet.">
          approximate
        </span>
      )}
    </div>
  );
}

function LinkedInPreview({
  profile,
  content,
  fold,
  expanded,
  onExpand,
}: {
  profile: Profile;
  content: string;
  fold: Fold | null;
  expanded: boolean;
  onExpand: () => void;
}) {
  const visible = !fold || !fold.folded || expanded ? content : fold.visible;

  return (
    <div
      style={{ width: LINKEDIN.cardWidth, fontFamily: LINKEDIN.fold!.fontFamily }}
      className="max-w-full overflow-hidden rounded-lg border border-[#00000014] bg-white text-[#000000e6] shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
    >
      <div className="flex items-start gap-2 px-4 pt-3">
        <Avatar name={profile.name} url={profile.avatarUrl} size="size-12" fallbackClass="bg-[#0a66c2]" />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1 truncate text-sm font-semibold">
            {profile.name || "Your name"}
            <span className="font-normal text-[#00000099]">· 1st</span>
          </div>
          {profile.headline && (
            <div className="truncate text-xs text-[#00000099]">{profile.headline}</div>
          )}
          <div className="flex items-center gap-1 text-xs text-[#00000099]">
            <span>Now</span>
            <span>·</span>
            <Globe size={12} />
          </div>
        </div>
        <MoreHorizontal size={20} className="shrink-0 text-[#00000099]" />
      </div>

      <div
        className="px-4 py-2 break-words whitespace-pre-wrap"
        style={{ fontSize: LINKEDIN.fold!.fontSize, lineHeight: `${LINKEDIN.fold!.lineHeight}px` }}
      >
        {visible || <span className="text-[#00000066]">What do you want to talk about?</span>}
        {fold?.folded && !expanded && (
          <button
            className="ml-1 text-[#00000099] hover:text-[#0a66c2] hover:underline"
            onClick={onExpand}
          >
            …see more
          </button>
        )}
      </div>

      <div className="mt-1 flex items-center justify-around border-t border-[#00000014] px-2 py-1">
        {[
          { Icon: ThumbsUp, label: "Like" },
          { Icon: MessageSquare, label: "Comment" },
          { Icon: Repeat2, label: "Repost" },
          { Icon: Send, label: "Send" },
        ].map(({ Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 rounded px-3 py-2 text-[13px] font-semibold text-[#00000099]"
          >
            <Icon size={18} /> {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function XPreview({ profile, content }: { profile: Profile; content: string }) {
  return (
    <div
      style={{ width: X.cardWidth }}
      className="max-w-full overflow-hidden rounded-lg border border-[#eff3f4] bg-white text-[#0f1419] shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
    >
      <div className="flex gap-3 p-4">
        <Avatar name={profile.name} url={profile.avatarUrl} size="size-10" fallbackClass="bg-[#0f1419]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[15px] leading-5">
            <span className="truncate font-bold">{profile.name || "Your name"}</span>
            {profile.handle && <span className="truncate text-[#536471]">@{profile.handle}</span>}
            <span className="text-[#536471]">· now</span>
          </div>
          <div className="mt-0.5 text-[15px] leading-5 break-words whitespace-pre-wrap">
            {content || <span className="text-[#536471]">What is happening?!</span>}
          </div>
          <div className="mt-3 flex max-w-[425px] items-center justify-between text-[#536471]">
            <MessageSquare size={18} />
            <Repeat2 size={18} />
            <ThumbsUp size={18} />
            <Send size={18} />
          </div>
        </div>
      </div>
    </div>
  );
}

function GenericPreview({ profile, content }: { profile: Profile; content: string }) {
  return (
    <div className="max-w-full rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
        {profile.platform}
      </div>
      <p className="text-[0.8125rem] leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
}
