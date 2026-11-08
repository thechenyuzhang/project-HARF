"use client";

import { motion, useInView } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { client } from "@/lib/amplify";
import { readTone } from "@/lib/tone";
import type { OwnAnswers } from "./story-analysis";

type Entry = {
  entryNumber: number | null;
  submittedOn: string;
  tone: string | null;
  toneScore: number | null;
  words: number;
  feelings: string[];
  aiUseFrequency: string | null;
  mainAiTool: string | null;
  noticedChange: string | null;
};

const W = 640;
const H = 200;
const PAD = { x: 36, top: 20, bottom: 36 };

const date = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

/**
 * How a returning participant's entries have changed: the tone of each story
 * as a line, and what changed in their answers since the first one. Uses only
 * their own entries, found with their private code.
 */
export function ParticipantTimeline({
  participantCode,
  entryNumber,
  text,
  answers,
}: {
  participantCode: string;
  entryNumber: number;
  text: string;
  answers: OwnAnswers;
}) {
  const [fetched, setFetched] = useState<Entry[] | null>(null);
  const chart = useRef<SVGSVGElement>(null);
  const shown = useInView(chart, { once: true, amount: 0.5 });

  useEffect(() => {
    if (entryNumber < 2) return;
    client.queries
      .myEntries({ participantCode })
      .then(({ data }) => setFetched(((data ?? []).filter(Boolean) as Entry[]) ?? []))
      .catch(() => setFetched([]));
  }, [participantCode, entryNumber]);

  // The entry just submitted may not be readable yet; add it from what's on screen.
  const entries = useMemo(() => {
    if (!fetched) return null;
    if (fetched.some((e) => e.entryNumber === entryNumber)) return fetched;
    const reading = readTone(text);
    return [
      ...fetched,
      {
        entryNumber,
        submittedOn: new Date().toISOString().slice(0, 10),
        tone: reading?.tone ?? null,
        toneScore: reading ? reading.score : null,
        words: text.trim().split(/\s+/).length,
        feelings: answers.feelings,
        aiUseFrequency: answers.aiUseFrequency || null,
        mainAiTool: answers.mainAiTool || null,
        noticedChange: answers.noticedChange || null,
      },
    ];
  }, [fetched, entryNumber, text, answers]);

  if (entryNumber < 2) {
    return (
      <div className="rounded-lg bg-card p-6 ring-1 ring-rule sm:p-8">
        <p className="eyebrow">Over time</p>
        <p className="mt-2 font-serif text-2xl leading-snug">This is your first entry.</p>
        <p className="mt-2 text-ink-soft">
          Come back with your participant code and write again. Next time, you&apos;ll see here how your tone and answers
          have changed since today.
        </p>
      </div>
    );
  }

  if (!entries) return <p className="text-sm text-muted">Loading your earlier entries…</p>;
  if (entries.length < 2) return null;

  const first = entries[0];
  const last = entries[entries.length - 1];
  const scored = entries.map((e, i) => ({ ...e, i })).filter((e) => e.toneScore !== null);
  const x = (i: number) => PAD.x + (entries.length === 1 ? 0 : (i / (entries.length - 1)) * (W - 2 * PAD.x));
  const y = (score: number) => PAD.top + ((1 - score) / 2) * (H - PAD.top - PAD.bottom);
  const path = scored.map((e, k) => `${k ? "L" : "M"}${x(e.i).toFixed(1)},${y(e.toneScore!).toFixed(1)}`).join(" ");

  const changes = [
    change("Tone", first.tone, last.tone),
    change("How often you use AI", first.aiUseFrequency, last.aiUseFrequency),
    change("Main AI tool", first.mainAiTool, last.mainAiTool),
    change("What you noticed", first.noticedChange, last.noticedChange),
    feelingsChange(first.feelings, last.feelings),
  ].filter((c): c is Change => c !== null);

  return (
    <figure className="rounded-lg bg-card p-6 ring-1 ring-rule sm:p-8">
      <figcaption>
        <p className="eyebrow">Over time</p>
        <p className="mt-2 font-serif text-2xl leading-snug">
          Your {entries.length} entries, from {date(first.submittedOn)} to today
        </p>
        <p className="mt-1 text-sm text-ink-soft">Only you can see this: it&apos;s found with your participant code.</p>
      </figcaption>

      {scored.length >= 2 ? (
        <svg ref={chart} viewBox={`0 0 ${W} ${H}`} className="mt-6 w-full" role="img" aria-label="Tone of each of your entries">
          {[1, 0, -1].map((v) => (
            <g key={v}>
              <line x1={PAD.x} x2={W - PAD.x} y1={y(v)} y2={y(v)} stroke="var(--rule)" strokeDasharray={v ? "3 4" : undefined} />
              <text x={4} y={y(v) + 4} fontSize="11" fill="var(--muted)">
                {v === 1 ? "+" : v === -1 ? "−" : "0"}
              </text>
            </g>
          ))}
          <motion.path
            d={path}
            fill="none"
            stroke="var(--navy)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: shown ? 1 : 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
          {scored.map((e, k) => {
            const latest = e.i === entries.length - 1;
            return (
              <motion.g
                key={e.i}
                initial={{ opacity: 0 }}
                animate={{ opacity: shown ? 1 : 0 }}
                transition={{ delay: 0.2 + (k / Math.max(1, scored.length - 1)) * 1.0, duration: 0.4 }}
              >
                <circle cx={x(e.i)} cy={y(e.toneScore!)} r={latest ? 7 : 5} fill={latest ? "var(--accent)" : "var(--navy)"} />
                <text x={x(e.i)} y={H - 12} fontSize="11" textAnchor="middle" fill={latest ? "var(--accent)" : "var(--muted)"}>
                  {latest ? "Today" : date(e.submittedOn)}
                </text>
              </motion.g>
            );
          })}
        </svg>
      ) : null}
      {scored.length >= 2 ? (
        <p className="mt-1 text-xs text-muted">
          Tone of each story, from the same word list as above: up is more positive words, down more negative.
        </p>
      ) : null}

      {changes.length ? (
        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          {changes.map((c) => (
            <div key={c.label} className="rounded-md bg-paper px-4 py-3 ring-1 ring-rule">
              <dt className="text-xs uppercase tracking-[0.12em] text-muted">{c.label}</dt>
              <dd className="mt-1">
                {c.same ? (
                  <span className="text-ink-soft">Unchanged: {c.to}</span>
                ) : (
                  <>
                    <span className="text-ink-soft line-through decoration-rule">{c.from}</span>
                    <span aria-hidden className="mx-2 text-muted">
                      →
                    </span>
                    <span className="sr-only"> changed to </span>
                    <span className="font-medium text-accent">{c.to}</span>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <ol className="sr-only">
        {entries.map((e, i) => (
          <li key={i}>
            Entry {i + 1}, {date(e.submittedOn)}: tone {e.tone ?? "not read"}, {e.words} words, AI use{" "}
            {e.aiUseFrequency ?? "not given"}.
          </li>
        ))}
      </ol>
    </figure>
  );
}

type Change = { label: string; from: string; to: string; same: boolean };

function change(label: string, from: string | null, to: string | null): Change | null {
  if (!from && !to) return null;
  return { label, from: from ?? "Not answered", to: to ?? "Not answered", same: from === to };
}

function feelingsChange(from: string[], to: string[]): Change | null {
  if (!from.length && !to.length) return null;
  const a = [...from].sort().join(", ") || "None picked";
  const b = [...to].sort().join(", ") || "None picked";
  return { label: "How you feel about AI", from: a, to: b, same: a === b };
}
