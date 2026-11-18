import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-sm border border-rule bg-card px-3 py-2 text-base focus:border-ink sm:text-sm focus:outline-none";
export const primaryButton =
  "rounded-full bg-ink px-5 py-2 text-xs uppercase tracking-[0.14em] text-paper transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:bg-ink/30";
export const secondaryButton =
  "rounded-full border border-ink px-4 py-1.5 text-xs uppercase tracking-[0.12em] transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink";

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "ok" | "no" | "accent"; children: ReactNode }) {
  const tones = {
    neutral: "border-rule text-ink-soft",
    ok: "border-ok/40 bg-ok/10 text-ok",
    no: "border-rule bg-paper-deep text-muted",
    accent: "border-accent/40 bg-accent-soft text-accent",
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.7rem] ${tones[tone]}`}>{children}</span>;
}

export function Notice({ kind, children }: { kind: "error" | "ok"; children: ReactNode }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-sm border px-3 py-2 text-sm ${kind === "error" ? "border-accent/40 bg-accent-soft" : "border-ok/40 bg-ok/10 text-ok"}`}
    >
      {children}
    </p>
  );
}

export const STATUS_LABEL: Record<string, string> = {
  NEW: "Pending review",
  IN_REVIEW: "In review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};
