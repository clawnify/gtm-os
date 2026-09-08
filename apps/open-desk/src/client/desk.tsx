import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eraser,
  ExternalLink,
  Inbox,
  Italic,
  List,
  ListOrdered,
  Pencil,
  Strikethrough,
  Underline,
  X,
} from "lucide-react";
import { api, type Channel } from "./api";
import { PlatformPreview, PreviewMeter, type Profile } from "./previews";
import { countChars, listify, toPlain, toggle } from "./previews/unicode-format";
import type { Draft } from "./types";
import { Badge, Button, Chip, Eyebrow, Kbd, ago, humanKind } from "./ui";

/**
 * Desk mode — one draft at a time, driven by the keyboard.
 *
 * A burn-down, not a list. The whole point of a review session is that a
 * decision costs one keystroke and the next item is already on screen, so
 * nothing here scrolls a feed or asks for a second confirmation click.
 *
 * The work itself sits centre stage and everything about it sits in the rail,
 * because the question being answered is "does this go out", and that is
 * answered by looking at the thing, not at its metadata.
 */
export function Desk({ onReviewed }: { onReviewed: () => void }) {
  const [queue, setQueue] = useState<Draft[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [body, setBody] = useState("");

  const current = queue[cursor];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await api.list({ status: "pending", limit: 100 });
      setQueue(page.drafts);
      setCursor(0);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Editing is per draft: moving to another item drops an unsaved edit rather
  // than carrying it onto someone else's text.
  useEffect(() => {
    setBody(current?.body ?? "");
    setEditing(false);
  }, [current?.id]);

  const settle = useCallback(
    (id: number) => {
      setQueue((q) => q.filter((d) => d.id !== id));
      setCursor((c) => Math.max(0, Math.min(c, queue.length - 2)));
      setReviewedCount((n) => n + 1);
      onReviewed();
    },
    [onReviewed, queue.length],
  );

  const saveEdit = useCallback(async () => {
    if (!current || body === current.body) return current;
    const updated = await api.update(current.id, { body });
    setQueue((q) => q.map((d) => (d.id === updated.id ? updated : d)));
    return updated;
  }, [current, body]);

  const approve = useCallback(async () => {
    if (!current || busy) return;
    setBusy(true);
    try {
      // An unsaved edit is part of the approval — approving must send what is
      // on screen, never the stale text behind it.
      await saveEdit();
      const done = await api.approve(current.id);
      if (done.delivery === "failed") {
        setError(done.deliveryError ?? "Approved, but delivery failed.");
      } else {
        setError(null);
      }
      settle(current.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [current, busy, settle, saveEdit]);

  const reject = useCallback(
    async (note: string) => {
      if (!current || busy) return;
      setBusy(true);
      try {
        await api.reject(current.id, note);
        setRejecting(false);
        setError(null);
        settle(current.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [current, busy, settle],
  );

  const copy = useCallback(async () => {
    if (!current) return;
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [current, body]);

  // Keys are the interface. They stay off while a text field has focus, so
  // typing a rejection note never approves the next post.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case "a":
          e.preventDefault();
          approve();
          break;
        case "r":
          e.preventDefault();
          setRejecting(true);
          break;
        case "e":
          e.preventDefault();
          setEditing(true);
          break;
        case "c":
          e.preventDefault();
          copy();
          break;
        case "j":
        case "arrowdown":
          e.preventDefault();
          setCursor((c) => Math.min(c + 1, queue.length - 1));
          break;
        case "k":
        case "arrowup":
          e.preventDefault();
          setCursor((c) => Math.max(c - 1, 0));
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [approve, copy, queue.length]);

  if (loading) {
    return <div className="p-6 text-sm text-muted">Loading the queue…</div>;
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Inbox size={40} strokeWidth={1.5} className="mb-4 text-faint" />
        <h2 className="mb-1 text-base font-semibold text-foreground">
          {reviewedCount > 0 ? "Queue cleared" : "Nothing waiting"}
        </h2>
        <p className="mb-4 max-w-sm text-sm text-muted">
          {reviewedCount > 0
            ? `You reviewed ${reviewedCount} ${reviewedCount === 1 ? "draft" : "drafts"} this session.`
            : "When an agent deposits a draft, it lands here for your sign-off."}
        </p>
        <Button onClick={load}>Check again</Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Centre stage — the work, on its own ground so it reads as the object
          under review rather than another panel of the app. */}
      <section className="flex min-w-0 flex-1 flex-col bg-surface-sunken">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[0.8125rem] tabular-nums text-foreground">
              {cursor + 1} of {queue.length}
            </span>
            <span className="text-[0.6875rem] text-muted">
              {reviewedCount > 0 ? `${reviewedCount} reviewed this session` : "waiting"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={() => setCursor((c) => Math.max(c - 1, 0))}
              aria-label="Previous draft"
            >
              <ChevronLeft size={14} />
              <Kbd>K</Kbd>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setCursor((c) => Math.min(c + 1, queue.length - 1))}
              aria-label="Next draft"
            >
              <ChevronRight size={14} />
              <Kbd>J</Kbd>
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center overflow-auto p-8">
          <Stage draft={current} body={body} />
        </div>
      </section>

      {/* The rail — everything about the work, and the decision. */}
      <aside className="flex w-[24rem] shrink-0 flex-col overflow-hidden border-l border-border bg-surface">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <RailZone first>
            <div className="mb-2 flex items-center justify-between gap-3">
              <Eyebrow>
                {humanKind(current.kind)} · {ago(current.createdAt)}
              </Eyebrow>
              <div className="flex items-center gap-1.5">
                {current.author && <Chip>{current.author}</Chip>}
                {current.destination && <Chip>→ {current.destination}</Chip>}
              </div>
            </div>
            {current.title && (
              <h2 className="text-base font-semibold leading-tight text-foreground">
                {current.title}
              </h2>
            )}
            <MetaChips draft={current} />
          </RailZone>

          <RailZone>
            <div className="mb-2 flex items-center justify-between">
              <Eyebrow>The draft</Eyebrow>
              {editing && (
                <button
                  onClick={() => {
                    setBody(current.body);
                    setEditing(false);
                  }}
                  className="text-[0.6875rem] text-muted hover:text-foreground"
                >
                  Discard changes
                </button>
              )}
            </div>
            {editing ? (
              <Editor value={body} onChange={setBody} />
            ) : (
              <p className="text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-foreground">
                {current.body}
              </p>
            )}
          </RailZone>

          {current.openQuestion && (
            <RailZone>
              <div className="mb-2 flex items-center gap-2">
                <Eyebrow>Needs your call</Eyebrow>
                <Badge tone="warning">blocking</Badge>
              </div>
              <p className="text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-foreground">
                {current.openQuestion}
              </p>
            </RailZone>
          )}

          {current.rationale && (
            <RailZone>
              <Eyebrow>Why this</Eyebrow>
              <p className="mt-2 text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-muted">
                {current.rationale}
              </p>
            </RailZone>
          )}

          {current.sources.length > 0 && (
            <RailZone>
              <Eyebrow>Sources · {current.sources.length}</Eyebrow>
              <ul className="mt-2 space-y-1.5">
                {current.sources.map((s, i) => (
                  <li key={i} className="text-[0.8125rem] leading-snug">
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-link underline decoration-border underline-offset-2 hover:decoration-foreground"
                      >
                        {s.title || s.url}
                      </a>
                    ) : (
                      <span className="text-foreground">{s.title}</span>
                    )}
                    {s.note && <span className="text-muted"> — {s.note}</span>}
                  </li>
                ))}
              </ul>
            </RailZone>
          )}
        </div>

        {error && (
          <div className="border-t border-border bg-danger-tint px-4 py-3 text-[0.8125rem] leading-snug text-danger">
            {error}
          </div>
        )}

        <div className="border-t border-border p-4">
          <Button
            variant="primary"
            hint="A"
            onClick={approve}
            disabled={busy}
            className="w-full"
          >
            <Check size={14} strokeWidth={2.5} />
            {current.destination ? "Approve & send" : "Approve"}
          </Button>
          <div className="mt-2 flex items-center gap-2">
            <Button
              variant="danger"
              hint="R"
              onClick={() => setRejecting(true)}
              disabled={busy}
              className="flex-1"
            >
              <X size={14} /> Reject
            </Button>
            <Button
              variant="ghost"
              hint="E"
              onClick={() => setEditing(true)}
              disabled={busy || editing}
              className="flex-1"
            >
              <Pencil size={14} /> Edit
            </Button>
            <Button variant="ghost" hint="C" onClick={copy} className="flex-1">
              <Copy size={14} /> {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </aside>

      {rejecting && (
        <RejectDialog onCancel={() => setRejecting(false)} onConfirm={reject} busy={busy} />
      )}
    </div>
  );
}

function RailZone({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return <div className={`p-4 ${first ? "" : "border-t border-border"}`}>{children}</div>;
}

function MetaChips({ draft }: { draft: Draft }) {
  const meta = draft.meta ?? {};
  const targetKeyword = typeof meta.target_keyword === "string" ? meta.target_keyword : null;
  const replyingTo = typeof meta.replying_to_url === "string" ? meta.replying_to_url : null;
  if (!targetKeyword && !replyingTo) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {targetKeyword && <Chip>target: {targetKeyword}</Chip>}
      {replyingTo && (
        <a
          href={replyingTo}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-x-1.5 text-[0.6875rem] text-link underline decoration-border underline-offset-2 hover:decoration-foreground"
        >
          <ExternalLink size={11} /> the post being answered
        </a>
      )}
    </div>
  );
}

const TOOLS = [
  { id: "bold", Icon: Bold, title: "Bold" },
  { id: "italic", Icon: Italic, title: "Italic" },
  { id: "underline", Icon: Underline, title: "Underline" },
  { id: "strike", Icon: Strikethrough, title: "Strikethrough" },
] as const;

/**
 * The composer. Formatting is applied to the selection and written straight
 * into the text, because the platforms these posts land on take plain text and
 * nothing else — so what you format here is literally what gets sent, and the
 * preview beside it updates as you go.
 */
function Editor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);

  /** Rewrite the selection, then restore it so formatting can be stacked. */
  function transform(fn: (selected: string) => string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    if (start === end) return;

    const replaced = fn(value.slice(start, end));
    onChange(value.slice(0, start) + replaced + value.slice(end));

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, start + replaced.length);
    });
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-0.5 rounded-sm border border-border bg-surface-sunken p-1">
        {TOOLS.map(({ id, Icon, title }) => (
          <ToolButton key={id} title={title} onClick={() => transform((t) => toggle(t, id))}>
            <Icon size={14} />
          </ToolButton>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        <ToolButton title="Bulleted list" onClick={() => transform((t) => listify(t, "bullet"))}>
          <List size={14} />
        </ToolButton>
        <ToolButton title="Numbered list" onClick={() => transform((t) => listify(t, "number"))}>
          <ListOrdered size={14} />
        </ToolButton>
        <span className="mx-1 h-4 w-px bg-border" />
        <ToolButton title="Clear formatting" onClick={() => transform(toPlain)}>
          <Eraser size={14} />
        </ToolButton>
      </div>

      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={12}
        className="w-full rounded-sm border border-border bg-surface p-3 text-[0.8125rem] leading-relaxed text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
      />

      <p className="mt-1.5 text-[0.6875rem] leading-snug text-muted">
        Select text, then a style. These platforms have no formatting, so styles are
        look-alike Unicode characters — screen readers often read them out letter by
        letter, so keep them to a word or two.
      </p>
    </div>
  );
}

function ToolButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-flex size-7 items-center justify-center rounded-sm text-muted transition-colors duration-150 hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

/**
 * The work itself. A social post renders as the platform will actually draw
 * it — right width, right font, right fold — because "will this read well"
 * cannot be answered from a plain textarea. Everything else renders as a page.
 */
/**
 * Which platform a draft is destined for.
 *
 * A post says so through its channel. A comment usually has no channel at all —
 * it is a reply typed into someone else's thread — so it declares
 * `meta.platform`, and failing that the host of the post being answered says
 * it well enough.
 */
function platformOf(draft: Draft): string | null {
  const declared = draft.meta?.platform;
  if (typeof declared === "string" && declared) return declared;

  const url = draft.meta?.replying_to_url;
  if (typeof url !== "string") return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.endsWith("linkedin.com")) return "linkedin";
    if (host.endsWith("reddit.com")) return "reddit";
    if (host.endsWith("x.com") || host.endsWith("twitter.com")) return "twitter";
  } catch {
    // A malformed URL simply tells us nothing.
  }
  return null;
}

/**
 * The work itself. Anything bound for a platform renders as that platform will
 * actually draw it — right width, right font, right fold — because "will this
 * read well" cannot be answered from a plain textarea. Everything else renders
 * as a page.
 */
function Stage({ draft, body }: { draft: Draft; body: string }) {
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [me, setMe] = useState<{ name: string | null; avatarUrl: string | null } | null>(null);
  const [which, setWhich] = useState(0);

  const appId = draft.destinationAppId;
  const wanted = Array.isArray(draft.meta?.channel_ids)
    ? (draft.meta.channel_ids as number[])
    : null;
  const platform = platformOf(draft);

  useEffect(() => {
    let live = true;
    if (!appId) {
      setChannels([]);
    } else {
      setChannels(null);
      api
        .channels(appId)
        .then((all) => {
          if (!live) return;
          const picked = wanted ? all.filter((ch) => wanted.includes(ch.id)) : all;
          setChannels(picked.length > 0 ? picked : all);
          setWhich(0);
        })
        .catch(() => live && setChannels([]));
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, draft.id]);

  // A comment is published as the reviewer, not as a channel.
  useEffect(() => {
    let live = true;
    api.me().then((m) => live && setMe(m)).catch(() => live && setMe(null));
    return () => {
      live = false;
    };
  }, []);

  if (channels === null) {
    return <div className="text-sm text-muted">Loading the preview…</div>;
  }

  const channel = channels.length > 0 ? channels[Math.min(which, channels.length - 1)] : null;
  const previewPlatform = channel?.platform ?? platform;

  if (!previewPlatform) {
    return (
      <div className="w-full max-w-[46rem]">
        <article className="rounded-lg border border-border bg-surface p-8 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          {draft.title && (
            <h1 className="mb-4 text-xl font-bold leading-tight tracking-[-0.01em] text-foreground">
              {draft.title}
            </h1>
          )}
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{body}</p>
        </article>
        <div className="mt-3 text-center text-[0.6875rem] tabular-nums text-muted">
          {countChars(body).toLocaleString()} characters
        </div>
      </div>
    );
  }

  const profile: Profile = channel
    ? {
        platform: channel.platform,
        name: channel.profile_name || channel.name,
        handle: channel.profile_handle,
        headline: channel.profile_headline,
        avatarUrl: channel.profile_avatar_url,
      }
    : {
        platform: previewPlatform,
        name: me?.name ?? "You",
        handle: null,
        headline: null,
        avatarUrl: me?.avatarUrl ?? null,
      };

  return (
    <div className="flex flex-col items-center gap-3">
      {channels.length > 1 && (
        <div className="inline-flex items-center gap-0.5 rounded-lg bg-surface p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          {channels.map((ch, i) => (
            <button
              key={ch.id}
              onClick={() => setWhich(i)}
              className={`h-7 rounded-sm px-2.5 text-sm font-medium transition-colors duration-150 ${
                i === which
                  ? "border border-border bg-surface text-foreground"
                  : "border border-transparent text-muted hover:text-foreground"
              }`}
            >
              {ch.name}
            </button>
          ))}
        </div>
      )}

      <PlatformPreview profile={profile} content={body} kind={draft.kind} title={draft.title} meta={draft.meta} />

      <PreviewMeter profile={profile} content={body} kind={draft.kind} />
    </div>
  );
}

function RejectDialog({
  onCancel,
  onConfirm,
  busy,
}: {
  onCancel: () => void;
  onConfirm: (note: string) => void;
  busy: boolean;
}) {
  const [note, setNote] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);

  return (
    // The overlay is the scroll container, so a tall dialog starts at the top
    // and scrolls to its own footer instead of clipping both ends.
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-foreground/20"
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (note.trim()) onConfirm(note.trim());
          }}
          className="w-full max-w-sm rounded-xl border border-border bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.16)]"
        >
          <div className="p-5">
            <h3 className="text-base font-semibold text-foreground">Reject this draft</h3>
            <p className="mt-1 text-[0.8125rem] leading-snug text-muted">
              The reason is the useful part — the agent reads it back and rewrites against it.
            </p>
            <textarea
              ref={ref}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="The WSJ figure isn't verifiable from a primary source."
              className="mt-3 w-full rounded-sm border border-border bg-surface p-3 text-[0.8125rem] leading-relaxed text-foreground placeholder:text-faint focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border p-4">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={busy || !note.trim()}>
              Reject
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
