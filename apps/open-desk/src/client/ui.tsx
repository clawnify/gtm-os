import type { ReactNode, ButtonHTMLAttributes } from "react";

/** Zone label — 11px uppercase tracked muted. The zone-naming device. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] leading-none text-muted">
      {children}
    </div>
  );
}

/** A fact. Quiet, square-ish, sunken. */
export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-x-1.5 rounded-sm border border-border bg-surface-sunken px-2 py-1 text-[0.6875rem] leading-none text-muted">
      {children}
    </span>
  );
}

/** A signal. Pill, tinted, same-hue hairline, normal weight — quiet, not bold. */
export function Badge({
  tone = "muted",
  children,
}: {
  tone?: "success" | "warning" | "danger" | "muted";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    success:
      "bg-success-tint text-success border-[color-mix(in_srgb,var(--color-success)_28%,transparent)]",
    warning:
      "bg-warning-tint text-warning border-[color-mix(in_srgb,var(--color-warning)_28%,transparent)]",
    danger:
      "bg-danger-tint text-danger border-[color-mix(in_srgb,var(--color-danger)_28%,transparent)]",
    muted: "bg-surface-sunken text-muted border-border",
  };
  return (
    <span
      className={`inline-flex items-center gap-x-1.5 rounded-full border px-2 py-0.5 text-xs font-normal leading-5 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** The key that triggers this action, shown as a hint on the button. */
  hint?: string;
};

export function Button({ variant = "secondary", hint, children, className = "", ...rest }: ButtonProps) {
  const variants: Record<string, string> = {
    primary: "bg-primary text-on-primary hover:bg-primary-hover border border-transparent",
    secondary: "bg-surface text-foreground border border-border hover:bg-surface-sunken",
    ghost: "text-muted border border-transparent hover:bg-surface-sunken hover:text-foreground",
    danger: "bg-surface text-danger border border-border hover:bg-danger-tint hover:text-danger-hover",
  };
  return (
    <button
      {...rest}
      className={`inline-flex h-8 items-center justify-center gap-x-1.5 rounded-sm px-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none data-[agent=true]:h-10 ${variants[variant]} ${className}`}
    >
      {children}
      {hint && <Kbd>{hint}</Kbd>}
    </button>
  );
}

/** A keyboard hint. The desk is driven by keys; the keys have to be visible. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="ml-0.5 rounded-sm border border-border bg-surface-sunken px-1 py-0.5 font-sans text-[0.6875rem] font-medium leading-none text-muted">
      {children}
    </kbd>
  );
}

/** Relative time, because "2h ago" decides freshness faster than a timestamp. */
export function ago(iso: string): string {
  const then = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/** A kind slug as a person reads it: social_post -> Social post. */
export function humanKind(kind: string): string {
  const s = kind.replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
