import { ArrowRight, Quote } from "lucide-react";
import Link from "next/link";
import type { Excerpt } from "@/lib/amplify";
import { ThemeIcon } from "./icons";
import { RevisitButton } from "./revisit-form";

export function formatMonth(date: string | null | undefined) {
  if (!date) return "";
  return new Date(`${date.slice(0, 7)}-15T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDay(date: string) {
  return new Date(`${date.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const dateOf = (e: Excerpt) =>
  e.exactDate && e.contributedOn ? formatDay(e.contributedOn) : formatMonth(e.contributedOn);

export function ExcerptCard({
  excerpt,
  reflections = [],
  size = "md",
}: {
  excerpt: Excerpt;
  /** Later reflections by the same contributor, oldest first. */
  reflections?: Excerpt[];
  size?: "md" | "lg";
}) {
  return (
    <article className="flex h-full flex-col rounded-lg bg-card p-7 shadow-sm ring-1 ring-rule transition-shadow hover:shadow-md">
      <Quote aria-hidden className="size-7 text-accent" strokeWidth={1.5} />
      {excerpt.title ? <h3 className="mt-4 font-serif text-2xl leading-snug">{excerpt.title}</h3> : null}
      <blockquote className={`mt-4 font-serif leading-snug ${size === "lg" ? "text-2xl sm:text-3xl" : "text-xl"}`}>
        {excerpt.text}
      </blockquote>
      {reflections.map((r) => (
        <div key={r.id} className="mt-5 border-l-2 border-accent/40 pl-4">
          <p className="text-xs uppercase tracking-[0.12em] text-muted">{dateOf(r)}</p>
          <p className="mt-1 font-serif text-lg leading-snug">{r.text}</p>
        </div>
      ))}
      <footer className="mt-auto pt-6">
        {excerpt.themes?.length ? (
          <ul className="mb-4 flex flex-wrap gap-1.5">
            {excerpt.themes.filter(Boolean).map((t) => (
              <li key={t} className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-xs text-ink-soft">
                <ThemeIcon theme={t!} className="size-3.5" />
                {t}
              </li>
            ))}
          </ul>
        ) : null}
        {excerpt.body ? (
          <Link
            href={`/#read=${encodeURIComponent(excerpt.id)}`}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            Read the full testimony <ArrowRight aria-hidden className="size-4" />
          </Link>
        ) : null}
        {excerpt.creditName ? (
          <p className="text-sm">
            {excerpt.creditName}
            {excerpt.creditLine ? <span className="text-muted"> · {excerpt.creditLine}</span> : null}
          </p>
        ) : null}
        <p className="border-t border-rule pt-3 text-xs text-muted">
          {[
            excerpt.participantCategory,
            excerpt.country,
            excerpt.ageRange,
            dateOf(excerpt),
          ]
            .filter(Boolean)
            .join(" · ")}
          {excerpt.synthetic ? " · Fictional sample" : ""}
        </p>
        {!excerpt.synthetic ? <RevisitButton excerptId={excerpt.id} title={excerpt.title} className="mt-3 text-muted hover:text-accent" /> : null}
      </footer>
    </article>
  );
}
