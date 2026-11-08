"use client";

import { useInView } from "motion/react";
import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { WordCloud, type CloudWord } from "@/components/word-cloud";
import { MIN_GROUP, WORDS, type CommunityRow } from "@/lib/community";
import { storyWords } from "@/lib/words";

/** At most this many of the participant's own new words join the cloud. */
const OWN_WORDS = 30;
const PAUSE_MS = 1400;

/**
 * The community word cloud, then the same cloud with the participant's story
 * added: their words grow the ones others used, and new ones arrive. Their own
 * words are shown only to them, here in the browser.
 */
export function StoryCloud({ text, rows }: { text: string; rows: CommunityRow[] | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [phase, setPhase] = useState<"before" | "after">("before");
  const [run, setRun] = useState(0);

  const community = useMemo(() => (rows ?? []).filter((r) => r.dimension === WORDS), [rows]);
  const own = useMemo(() => [...storyWords(text)], [text]);

  const before: CloudWord[] = useMemo(() => community.map((r) => ({ word: r.label, weight: r.count })), [community]);
  const after: CloudWord[] = useMemo(() => {
    const mine = new Set(own);
    const shared = community.map((r) => ({ word: r.label, weight: r.count + (mine.has(r.label) ? 1 : 0), mine: mine.has(r.label) }));
    const known = new Set(community.map((r) => r.label));
    const added = own
      .filter((w) => !known.has(w))
      .slice(0, OWN_WORDS)
      .map((word, i) => ({ word, weight: 1, mine: true, arrival: i }));
    return [...shared, ...added];
  }, [community, own]);

  useEffect(() => {
    if (!inView || rows === null) return;
    const timer = setTimeout(() => setPhase("after"), community.length ? PAUSE_MS : 300);
    return () => clearTimeout(timer);
  }, [inView, rows, run, community.length]);

  if (!own.length && !community.length) return null;

  const grew = after.filter((w) => w.mine).length - (after.length - community.length);
  const joined = after.length - community.length;

  return (
    <figure ref={ref} className="rounded-lg bg-card p-6 ring-1 ring-rule sm:p-8">
      <figcaption className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-serif text-2xl leading-snug">How your story joins the words others have used</p>
          <p aria-live="polite" className="mt-1 text-sm text-ink-soft">
            {phase === "before"
              ? community.length
                ? "The words people have used so far…"
                : "Adding your words…"
              : [
                  "Your words glow in the bulb.",
                  grew ? `${grew} matched words others had used, and grew.` : "",
                  joined ? `${joined} new ${joined === 1 ? "word" : "words"} joined the cloud.` : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setPhase("before");
            setRun((n) => n + 1);
          }}
          disabled={phase === "before"}
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-sm ring-1 ring-rule transition-colors hover:ring-ink disabled:opacity-40"
        >
          <RotateCcw aria-hidden className="size-4" />
          Replay
        </button>
      </figcaption>
      <WordCloud words={phase === "before" ? before : after} label="Word cloud of stories shared so far, in the shape of a light bulb" />
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Larger words were used by more people. Your own words glow, and smaller repeats fill out the shape. Others&apos; words appear only once at least {MIN_GROUP} people have used
        them. Only you can see your words here.
      </p>
    </figure>
  );
}
