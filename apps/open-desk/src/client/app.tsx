import { useCallback, useEffect, useState } from "react";
import { History as HistoryIcon, Layers, ListChecks } from "lucide-react";
import { Desk } from "./desk";
import { History } from "./history";
import { api } from "./api";
import type { Stats } from "./types";
import { humanKind } from "./ui";

type View = "desk" | "history";

export function App() {
  const [view, setView] = useState<View>(
    window.location.pathname.startsWith("/history") ? "history" : "desk",
  );
  const [stats, setStats] = useState<Stats | null>(null);

  const refreshStats = useCallback(() => {
    api.stats().then(setStats).catch(() => setStats(null));
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  function go(next: View) {
    setView(next);
    window.history.pushState({}, "", next === "desk" ? "/" : "/history");
  }

  useEffect(() => {
    function onPop() {
      setView(window.location.pathname.startsWith("/history") ? "history" : "desk");
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <div className="flex min-h-screen bg-background font-sans text-foreground">
      <aside className="hidden w-[16.25rem] shrink-0 border-r border-border bg-surface md:block">
        {/* Same fixed height as the toolbar, so the two bottom borders meet as
            one unbroken rule across the app. */}
        <div className="flex h-14 items-center border-b border-border px-4">
          <span className="text-[0.9375rem] font-semibold tracking-tight">OpenDesk</span>
        </div>

        <nav className="p-3">
          <div className="mb-1.5 px-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] leading-none text-muted">
            Review
          </div>
          <NavItem
            active={view === "desk"}
            onClick={() => go("desk")}
            icon={<ListChecks size={16} />}
            label="Desk"
            count={stats?.pending}
          />
          <NavItem
            active={view === "history"}
            onClick={() => go("history")}
            icon={<HistoryIcon size={16} />}
            label="All work"
          />
        </nav>

        {stats && stats.by_kind.length > 0 && (
          <div className="border-t border-border p-3">
            <div className="mb-1.5 px-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] leading-none text-muted">
              Waiting by kind
            </div>
            <ul>
              {stats.by_kind.map((k) => (
                <li
                  key={k.kind}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-foreground"
                >
                  <span className="inline-flex items-center gap-x-1.5">
                    <Layers size={14} className="text-faint" />
                    {humanKind(k.kind)}
                  </span>
                  <span className="tabular-nums text-[0.8125rem] text-muted">{k.pending}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stats && stats.failed > 0 && (
          <div className="border-t border-border p-3">
            <button
              onClick={() => go("history")}
              className="w-full rounded-md bg-danger-tint px-2 py-1.5 text-left text-[0.8125rem] text-danger"
            >
              {stats.failed} approved {stats.failed === 1 ? "draft" : "drafts"} failed to send
            </button>
          </div>
        )}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
          <h1 className="text-xl font-bold leading-tight tracking-[-0.01em]">
            {view === "desk" ? "Desk" : "All work"}
          </h1>
          {view === "desk" && stats && (
            <span className="text-[0.8125rem] tabular-nums text-muted">
              {stats.pending} waiting
            </span>
          )}
        </header>

        {view === "desk" ? <Desk onReviewed={refreshStats} /> : <History />}
      </main>
    </div>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-md px-2.5 py-[0.4375rem] text-sm transition-colors duration-150 ${
        active
          ? "bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] font-semibold text-primary"
          : "text-foreground hover:bg-surface-sunken"
      }`}
    >
      <span className="inline-flex items-center gap-x-1.5">
        {icon}
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span className="tabular-nums text-[0.8125rem] text-muted">{count}</span>
      )}
    </button>
  );
}
