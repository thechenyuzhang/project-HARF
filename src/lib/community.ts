// How other participants answered, as broad and rounded counts. Shared by the
// participant function (which computes it) and the site (which draws it).
import { AI_TOOLS, AI_USE_FREQUENCIES, FEELINGS, NOTICED_CHANGE } from "./harf";
import { TONES, readTone } from "./tone";
import { CLOUD_SIZE, storyWords } from "./words";

/** Groups smaller than this are never returned. Counts are rounded to the same step. */
export const MIN_GROUP = 5;

export const COMMUNITY_DIMENSIONS = [
  { key: "tone", title: "The tone of stories shared so far", options: TONES },
  { key: "feelings", title: "How people feel about AI", options: FEELINGS.filter((f) => f !== "Other") },
  { key: "aiUseFrequency", title: "How often people use AI", options: AI_USE_FREQUENCIES },
  { key: "mainAiTool", title: "The AI tools people use most", options: AI_TOOLS.filter((t) => t !== "Other") },
  { key: "noticedChange", title: "What people have noticed", options: NOTICED_CHANGE },
] as const;
export type CommunityDimension = (typeof COMMUNITY_DIMENSIONS)[number]["key"];

/** Extra rows next to the chart dimensions: the word cloud, and how many people have taken part. */
export const WORDS = "words";
export const PEOPLE = "people";

export type CommunityRow = {
  dimension: CommunityDimension | typeof WORDS | typeof PEOPLE;
  label: string;
  /** People in this group, rounded to the nearest MIN_GROUP. */
  count: number;
  /** People who answered this question at all, rounded the same way. */
  respondents: number;
};

export type CommunityRecord = Partial<Record<CommunityDimension, string | string[] | null>> & {
  participantRef?: string | null;
  /** Read only to count words; never returned. */
  originalText?: string | null;
  submittedAt?: string | null;
  synthetic?: boolean | null;
  editorialStatus?: string | null;
};

const rounded = (n: number) => Math.round(n / MIN_GROUP) * MIN_GROUP;

/** Counts people rather than stories, so one person writing often can't fill a group alone. */
export function summarizeCommunity(records: CommunityRecord[]): CommunityRow[] {
  const real = records.filter((r) => !r.synthetic && r.editorialStatus !== "WITHDRAWN" && r.participantRef);
  return [...summarizeDimensions(real), ...summarizeWords(real), ...summarizePeople(real)];
}

/**
 * The most used words across stories, counted by people. A word appears only once
 * at least MIN_GROUP different people have used it, so no word can point back to
 * one person's story.
 */
function summarizeWords(real: CommunityRecord[]): CommunityRow[] {
  const people = new Map<string, Set<string>>();
  const writers = new Set<string>();
  for (const record of real) {
    // Stories an editor set aside (off-topic or test entries) don't shape the cloud.
    if (!record.originalText || record.editorialStatus === "ARCHIVED") continue;
    writers.add(record.participantRef!);
    for (const word of storyWords(record.originalText)) {
      people.set(word, (people.get(word) ?? new Set()).add(record.participantRef!));
    }
  }
  return [...people]
    .filter(([, who]) => who.size >= MIN_GROUP)
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
    .slice(0, CLOUD_SIZE)
    .map(([label, who]) => ({ dimension: WORDS, label, count: rounded(who.size), respondents: rounded(writers.size) }));
}

function summarizePeople(real: CommunityRecord[]): CommunityRow[] {
  const people = new Set(real.filter((r) => r.editorialStatus !== "ARCHIVED").map((r) => r.participantRef!)).size;
  return people < MIN_GROUP ? [] : [{ dimension: PEOPLE, label: "participants", count: rounded(people), respondents: rounded(people) }];
}

function summarizeDimensions(real: CommunityRecord[]): CommunityRow[] {
  return COMMUNITY_DIMENSIONS.flatMap(({ key, options }) => {
    const groups = new Map<string, Set<string>>();
    const respondents = new Set<string>();
    for (const record of real) {
      const raw = record[key];
      const answers = (Array.isArray(raw) ? raw : [raw]).filter((a) => (options as readonly unknown[]).includes(a));
      if (answers.length) respondents.add(record.participantRef!);
      for (const answer of answers as string[]) {
        groups.set(answer, (groups.get(answer) ?? new Set()).add(record.participantRef!));
      }
    }
    return options.flatMap((label) => {
      const size = groups.get(label)?.size ?? 0;
      return size < MIN_GROUP
        ? []
        : [{ dimension: key, label, count: rounded(size), respondents: rounded(respondents.size) }];
    });
  });
}

/** One month of the community, for the "over time" view. */
export type TrendPoint = {
  /** YYYY-MM */
  period: string;
  /** People who wrote that month, rounded to the nearest MIN_GROUP. */
  people: number;
  /** Mean tone that month, -1 to 1 in steps of 0.05; each person counts once. */
  toneScore: number | null;
};

const step = (n: number) => Math.round(n * 20) / 20;

/**
 * How the tone of stories moves month by month. A month is shown only when at
 * least MIN_GROUP people wrote in it. Editor-archived stories are left out.
 */
export function summarizeTrend(records: CommunityRecord[]): TrendPoint[] {
  const months = new Map<string, Map<string, number[]>>();
  for (const r of records) {
    if (r.synthetic || !r.participantRef || !r.submittedAt || !r.originalText) continue;
    if (r.editorialStatus === "WITHDRAWN" || r.editorialStatus === "ARCHIVED") continue;
    const period = r.submittedAt.slice(0, 7);
    const people = months.get(period) ?? new Map<string, number[]>();
    const scores = people.get(r.participantRef) ?? [];
    const reading = readTone(r.originalText);
    if (reading) scores.push(reading.score);
    people.set(r.participantRef, scores);
    months.set(period, people);
  }
  return [...months]
    .filter(([, people]) => people.size >= MIN_GROUP)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, people]) => {
      const perPerson = [...people.values()].filter((s) => s.length).map((s) => s.reduce((a, b) => a + b, 0) / s.length);
      return {
        period,
        people: rounded(people.size),
        toneScore: perPerson.length >= MIN_GROUP ? step(perPerson.reduce((a, b) => a + b, 0) / perPerson.length) : null,
      };
    });
}
