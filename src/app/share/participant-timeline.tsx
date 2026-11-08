"use client";

import { motion, useInView } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { client } from "@/lib/amplify";
import { readTone } from "@/lib/tone";
import { MIN_GROUP, type TrendPoint } from "@/lib/community";
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

const DAY = 24 * 60 * 60 * 1000;
const time = (iso: string) => new Date(`${iso}T12:00:00Z`).getTime();

function compare(you: number, everyone: number) {
  const gap = you - everyone;
  if (Math.abs(gap) < 0.2) return "The tone of your latest story is close to everyone else's lately.";
  return gap > 0
    ? "Your latest story uses more positive words than people's stories lately."
    : "Your latest story uses more negative words than people's stories lately.";
}

const date = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

/**
 * How things change over time: the community's tone month by month, the tone
 * of each of the participant's own stories on the same axis, and what changed
 * in their answers since their first entry. Their own entries are found with
 * their private code.
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
  const [fetched, setFetched] = useState<Entry[] | null>(entryNumber < 2 ? [] : null);
  const [trend, setTrend] = useState<TrendPoint[] | null>(null);
  const chart = useRef<SVGSVGElement>(null);
  const shown = useInView(chart, { once: true, amount: 0.5 });

  useEffect(() => {
    if (entryNumber < 2) return;
    client.queries
      .myEntries({ participantCode })
      .then(({ data }) => setFetched((data ?? []).filter(Boolean) as Entry[]))
      .catch(() => setFetched([]));
  }, [participantCode, entryNumber]);

  useEffect(() => {
    client.queries
      .communityTrend()
      .then(({ data }) => setTrend((data ?? []).filter(Boolean) as TrendPoint[]))
      .catch(() => setTrend([]));
  }, []);

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

  if (!entries || !trend) return <p className="text-sm text-muted">Loading how things have changed…</p>;

  const first = entries[0];
  const last = entries[entries.length - 1];
  const today = new Date().toISOString().slice(0, 10);

  // One shared date axis for the community's months and the person's entries.
  const community = trend
    .filter((t) => t.toneScore !== null)
    .map((t) => ({ ...t, day: `${t.period}-15` < today ? `${t.period}-15` : today }));
  const mine = entries.filter((e) => e.toneScore !== null);
  const days = [...community.map((c) => c.day), ...mine.map((e) => e.submittedOn), today].map(time);
  const end = Math.max(...days);
  const start = Math.min(Math.min(...days), end - 30 * DAY);
  const x = (day: string) => PAD.x + ((time(day) - start) / (end - start)) * (W - 2 * PAD.x);
  const y = (score: number) => PAD.top + ((1 - score) / 2) * (H - PAD.top - PAD.bottom);
  const line = (points: { at: string; score: number }[]) =>
    points.map((p, k) => `${k ? "L" : "M"}${x(p.at).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
  const minePath = line(mine.map((e) => ({ at: e.submittedOn, score: e.toneScore! })));
  const communityPath = line(community.map((c) => ({ at: c.day, score: c.toneScore! })));
  const ticks = [...new Set([start, (start + end) / 2, end])];

  const changes =
    entries.length < 2
      ? []
      : [
          change("Tone", first.tone, last.tone),
          change("How often you use AI", first.aiUseFrequency, last.aiUseFrequency),
          change("Main AI tool", first.mainAiTool, last.mainAiTool),
          change("What you noticed", first.noticedChange, last.noticedChange),
          feelingsChange(first.feelings, last.feelings),
        ].filter((c): c is Change => c !== null);

  const latestCommunity = community[community.length - 1];

  return (
    <figure className="rounded-lg bg-card p-6 ring-1 ring-rule sm:p-8">
      <figcaption>
        <p className="eyebrow">Over time</p>
        <p className="mt-2 font-serif text-2xl leading-snug">
          {entries.length > 1
            ? `Your ${entries.length} entries, from ${date(first.submittedOn)} to today, and everyone else's`
            : "Your story, and how everyone's stories are moving"}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {entries.length > 1
            ? "Your own line is found with your participant code and only you can see it."
            : "This is your first entry. Come back with your participant code and your own line will grow here."}
        </p>
      </figcaption>

      {mine.length || community.length ? (
        <>
          <svg ref={chart} viewBox={`0 0 ${W} ${H}`} className="mt-6 w-full" role="img" aria-label="Tone over time: yours and the community's">
            {[1, 0, -1].map((v) => (
              <g key={v}>
                <line x1={PAD.x} x2={W - PAD.x} y1={y(v)} y2={y(v)} stroke="var(--rule)" strokeDasharray={v ? "3 4" : undefined} />
                <text x={4} y={y(v) + 4} fontSize="11" fill="var(--muted)">
                  {v === 1 ? "+" : v === -1 ? "−" : "0"}
                </text>
              </g>
            ))}
            {ticks.map((t) => (
              <text key={t} x={PAD.x + ((t - start) / (end - start)) * (W - 2 * PAD.x)} y={H - 10} fontSize="11" textAnchor="middle" fill="var(--muted)">
                {t === end ? "Today" : date(new Date(t).toISOString().slice(0, 10))}
              </text>
            ))}

            {community.length > 1 ? (
              <motion.path
                d={communityPath}
                fill="none"
                stroke="var(--muted)"
                strokeWidth={2}
                strokeDasharray="6 5"
                initial={{ opacity: 0 }}
                animate={{ opacity: shown ? 0.9 : 0 }}
                transition={{ duration: 0.8 }}
              />
            ) : null}
            {community.map((c, k) => (
              <motion.circle
                key={c.period}
                cx={x(c.day)}
                cy={y(c.toneScore!)}
                r={4 + Math.min(6, c.people / 10)}
                fill="var(--paper-deep)"
                stroke="var(--muted)"
                initial={{ opacity: 0 }}
                animate={{ opacity: shown ? 1 : 0 }}
                transition={{ delay: 0.1 * k, duration: 0.4 }}
              />
            ))}

            {mine.length > 1 ? (
              <motion.path
                d={minePath}
                fill="none"
                stroke="var(--navy)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: shown ? 1 : 0 }}
                transition={{ delay: 0.6, duration: 1.2, ease: "easeInOut" }}
              />
            ) : null}
            {mine.map((e, k) => {
              const latest = k === mine.length - 1;
              return (
                <motion.circle
                  key={k}
                  cx={x(e.submittedOn)}
                  cy={y(e.toneScore!)}
                  r={latest ? 7 : 5}
                  fill={latest ? "var(--accent)" : "var(--navy)"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: shown ? 1 : 0 }}
                  transition={{ delay: 0.6 + (k / Math.max(1, mine.length - 1)) * 1.2, duration: 0.4 }}
                />
              );
            })}
          </svg>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-full bg-accent" /> You{mine.length > 1 ? " (red is today)" : ", today"}
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-full bg-paper-deep ring-1 ring-muted" /> Everyone, month by month
              (bigger circle, more people)
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Tone from the same word list as above: up is more positive words, down more negative.{" "}
            {community.length
              ? `Everyone's line averages each person once per month and leaves out months with fewer than ${MIN_GROUP} people.`
              : `Everyone's line appears once at least ${MIN_GROUP} people have written in the same month.`}
          </p>
          {latestCommunity && mine.length ? (
            <p className="mt-3 text-sm text-ink-soft">
              {compare(last.toneScore ?? mine[mine.length - 1].toneScore!, latestCommunity.toneScore!)}
            </p>
          ) : null}
        </>
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
