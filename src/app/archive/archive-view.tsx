"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ExcerptCard } from "@/components/excerpt-card";
import { ThemeIcon } from "@/components/icons";
import { client, listAll, type Excerpt } from "@/lib/amplify";
import { THEMES } from "@/lib/harf";
import { ArchiveCommunity } from "./archive-community";

export function ArchiveView() {
  const params = useSearchParams();
  const router = useRouter();
  const theme = params.get("theme");
  const [excerpts, setExcerpts] = useState<Excerpt[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [people, setPeople] = useState(0);

  useEffect(() => {
    listAll((nextToken) => client.models.Excerpt.list({ nextToken }))
      .then((items) => setExcerpts(items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))))
      .catch(() => setFailed(true));
  }, []);

  // Reflections sit beneath the story they return to; featured stories come first.
  const { stories, reflections } = useMemo(() => {
    const all = excerpts ?? [];
    const stories = all.filter((e) => !e.parentId);
    const reflections = new Map<string, Excerpt[]>();
    for (const e of all) if (e.parentId) reflections.set(e.parentId, [...(reflections.get(e.parentId) ?? []), e]);
    for (const list of reflections.values()) list.sort((a, b) => (a.contributedOn ?? "").localeCompare(b.contributedOn ?? ""));
    return { stories, reflections };
  }, [excerpts]);

  const visible = useMemo(() => stories.filter((e) => !theme || e.themes?.includes(theme)), [stories, theme]);
  const featured = visible.filter((e) => e.featured);
  const rest = visible.filter((e) => !e.featured);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const e of stories) for (const t of e.themes ?? []) if (t) c.set(t, (c.get(t) ?? 0) + 1);
    return c;
  }, [stories]);

  const select = (t: string | null) => router.replace(t ? `/archive/?theme=${encodeURIComponent(t)}` : "/archive/", { scroll: false });

  return (
    <>
      <ArchiveCommunity onPeople={setPeople} />

      <div className="mb-8">
        <ul className="flex flex-wrap gap-2 text-sm">
          <li>
            <ThemeButton active={!theme} onClick={() => select(null)}>
              All
            </ThemeButton>
          </li>
          {THEMES.map((t) => (
            <li key={t}>
              <ThemeButton active={theme === t} onClick={() => select(t)}>
                <ThemeIcon theme={t} className="size-4" />
                {t}
                {counts.get(t) ? <span className="ml-1.5 text-xs opacity-60">{counts.get(t)}</span> : null}
              </ThemeButton>
            </li>
          ))}
        </ul>
      </div>

      {failed ? (
        <p className="text-muted">The archive is unavailable right now. Please try again later.</p>
      ) : !excerpts ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-lg bg-card" />
          ))}
        </div>
      ) : visible.length ? (
        <>
          {featured.length ? (
            <section className="mb-14">
              <p className="eyebrow mb-5">Featured</p>
              <div className="grid gap-6 md:grid-cols-2">
                {featured.map((e) => (
                  <ExcerptCard key={e.id} excerpt={e} reflections={reflections.get(e.id)} size="lg" />
                ))}
              </div>
            </section>
          ) : null}
          {rest.length ? (
            <section>
              {featured.length ? <p className="eyebrow mb-5">All stories</p> : null}
              <div className="grid gap-6 md:grid-cols-2">
                {rest.map((e, i) => (
                  <ExcerptCard
                    key={e.id}
                    excerpt={e}
                    reflections={reflections.get(e.id)}
                    size={i === 0 && !theme && !featured.length ? "lg" : "md"}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <div className="rounded-lg bg-card p-10 text-center ring-1 ring-rule">
          <p className="font-serif text-2xl">
            {theme ? `No published stories on ${theme} yet.` : "The first stories are being reviewed."}
          </p>
          {!theme ? (
            <p className="mx-auto mt-3 max-w-xl text-ink-soft">
              {people ? `About ${people} people have shared their experience so far. ` : ""}
              Excerpts appear here once a participant agrees to publication and our editors have reviewed and
              anonymized them. Nothing is published automatically.
            </p>
          ) : null}
          <Link href="/share/" data-track="share_click" data-track-from="archive_empty" className="mt-3 inline-block py-2 text-sm text-accent underline">
            Share yours
          </Link>
        </div>
      )}
    </>
  );
}

function ThemeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap min-h-10 rounded-full px-4 py-2 ring-1 transition-colors ${
        active ? "bg-navy text-card ring-navy" : "bg-card ring-rule hover:ring-ink"
      }`}
    >
      {children}
    </button>
  );
}
