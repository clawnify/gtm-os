import { useEffect, useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { api, type Page } from "./api";
import type { Draft } from "./types";
import { Badge, Button, Eyebrow, ago, humanKind } from "./ui";

const PAGE = 25;

/**
 * Everything already decided. A full-bleed list: its hairlines reach the edges
 * of the pane, so it reads as the page rather than a card sitting on it.
 */
export function History() {
  const [page, setPage] = useState<Page | null>(null);
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    api
      .list({ status: status || undefined, search: search || undefined, limit: PAGE, offset })
      .then((p) => live && setPage(p))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [status, search, offset]);

  const rows = page?.drafts ?? [];
  const total = page?.total ?? 0;

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>
          All work · {total}
        </Eyebrow>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => {
              setOffset(0);
              setSearch(e.target.value);
            }}
            placeholder="Search drafts…"
            aria-label="Search drafts"
            className="h-9 w-56 rounded-sm border border-border bg-surface px-2.5 text-[0.8125rem] text-foreground placeholder:text-faint focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-surface-sunken p-0.5">
            {[
              { v: "", label: "All" },
              { v: "pending", label: "Pending" },
              { v: "approved", label: "Approved" },
              { v: "rejected", label: "Rejected" },
            ].map((s) => (
              <button
                key={s.v}
                onClick={() => {
                  setOffset(0);
                  setStatus(s.v);
                }}
                className={`h-7 rounded-sm px-2.5 text-sm font-medium transition-colors duration-150 ${
                  status === s.v
                    ? "border border-border bg-surface text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                    : "border border-transparent text-muted hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="py-20 text-center">
          <h3 className="mb-1 text-base font-semibold text-foreground">Nothing here yet</h3>
          <p className="text-sm text-muted">
            {search || status
              ? "No drafts match that filter."
              : "Drafts appear once an agent deposits its first one."}
          </p>
        </div>
      ) : (
        <>
          <div className="-mx-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-y border-border bg-surface-sunken">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.04em] text-muted first:pl-6">
                    Draft
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.04em] text-muted">
                    Kind
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.04em] text-muted">
                    Status
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-[0.04em] text-muted last:pr-6">
                    Age
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <Row key={d.id} draft={d} />
                ))}
              </tbody>
            </table>
          </div>

          {total > PAGE && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[0.6875rem] tabular-nums text-muted">
                {offset + 1}–{Math.min(offset + PAGE, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE))}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  disabled={offset + PAGE >= total}
                  onClick={() => setOffset(offset + PAGE)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Row({ draft }: { draft: Draft }) {
  return (
    <tr className="border-b border-border align-top transition-colors duration-150 hover:bg-surface-sunken">
      <td className="px-3 py-2.5 first:pl-6">
        <div className="text-[0.8125rem] font-medium leading-snug text-foreground">
          {draft.title || draft.body.slice(0, 80) + (draft.body.length > 80 ? "…" : "")}
        </div>
        {draft.reviewNote && (
          <div className="mt-0.5 text-[0.6875rem] leading-snug text-muted">
            Rejected: {draft.reviewNote}
          </div>
        )}
        {draft.deliveryError && (
          <div className="mt-0.5 text-[0.6875rem] leading-snug text-danger">
            {draft.deliveryError}
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 text-[0.8125rem] text-muted">{humanKind(draft.kind)}</td>
      <td className="px-3 py-2.5">
        <StatusBadge draft={draft} />
      </td>
      <td className="px-3 py-2.5 text-right text-[0.8125rem] tabular-nums text-muted last:pr-6">
        {ago(draft.createdAt)}
      </td>
    </tr>
  );
}

function StatusBadge({ draft }: { draft: Draft }) {
  if (draft.status === "pending") return <Badge>Pending</Badge>;
  if (draft.status === "rejected")
    return (
      <Badge tone="danger">
        <X size={11} strokeWidth={2.5} /> Rejected
      </Badge>
    );
  if (draft.delivery === "failed")
    return (
      <Badge tone="danger">
        <AlertTriangle size={11} strokeWidth={2.5} /> Send failed
      </Badge>
    );
  if (draft.delivery === "sent")
    return (
      <Badge tone="success">
        <Check size={11} strokeWidth={2.5} /> Sent
      </Badge>
    );
  return (
    <Badge tone="success">
      <Check size={11} strokeWidth={2.5} /> Approved
    </Badge>
  );
}
