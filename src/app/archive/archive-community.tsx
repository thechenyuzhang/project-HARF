"use client";

import { useEffect, useState } from "react";
import { WordCloud } from "@/components/word-cloud";
import { client } from "@/lib/amplify";
import { MIN_GROUP, PEOPLE, WORDS, type CommunityRow } from "@/lib/community";

/** The archive's overview: how many people have taken part, and the words they use most. */
export function ArchiveCommunity({ onPeople }: { onPeople?: (people: number) => void }) {
  const [rows, setRows] = useState<CommunityRow[] | null>(null);

  useEffect(() => {
    client.queries
      .communityStats()
      .then(({ data }) => setRows((data ?? []).filter((r) => r !== null) as CommunityRow[]))
      .catch(() => setRows([]));
  }, []);

  const people = rows?.find((r) => r.dimension === PEOPLE)?.count ?? 0;
  useEffect(() => onPeople?.(people), [onPeople, people]);

  const words = (rows ?? []).filter((r) => r.dimension === WORDS).map((r) => ({ word: r.label, weight: r.count }));
  if (!rows || (!words.length && !people)) return null;

  return (
    <section aria-labelledby="archive-words" className="mb-10 rounded-lg bg-card p-6 shadow-sm ring-1 ring-rule sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">In their own words</p>
          <h2 id="archive-words" className="mt-2 font-serif text-3xl leading-tight">
            What people are writing about
          </h2>
        </div>
        {people ? (
          <p className="text-sm text-ink-soft">
            <span className="font-serif text-3xl text-ink tabular-nums">~{people}</span> people have taken part
          </p>
        ) : null}
      </div>
      {words.length ? (
        <>
          <WordCloud words={words} label="Most used words across all stories" />
          <p className="text-xs leading-relaxed text-muted">
            Drawn from every story shared, not only published ones. A word appears once at least {MIN_GROUP} people have
            used it; counts are rounded. No story text leaves our database to draw this.
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">
          A word cloud of the stories appears once enough people have used the same words.
        </p>
      )}
    </section>
  );
}
