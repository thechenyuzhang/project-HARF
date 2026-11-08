// How other participants answered, as broad and rounded counts. Shared by the
// participant function (which computes it) and the site (which draws it).
import { AI_TOOLS, AI_USE_FREQUENCIES, FEELINGS, NOTICED_CHANGE } from "./harf";
import { TONES } from "./tone";
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
  const people = new Set(real.map((r) => r.participantRef!)).size;
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
