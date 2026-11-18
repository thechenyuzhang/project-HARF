// Data and layout for the Observatory: the home page's constellations.
// One constellation per theme; one star per testimony. Stars whose excerpt an
// editor has published can be opened and read; the rest are anonymous points
// that show the archive growing.

import { THEMES, type Theme } from "@/lib/harf";
import type { Excerpt } from "@/lib/amplify";

export type Story = {
  id: string;
  title?: string;
  text: string;
  body?: string;
  themes: Theme[];
  role?: string;
  country?: string;
  ageRange?: string;
  /** YYYY-MM-DD; the day matters only when exactDate is set. */
  date: string;
  exactDate: boolean;
  creditName?: string;
  creditLine?: string;
  featured: boolean;
  synthetic: boolean;
  /** Later reflections by the same contributor, oldest first. */
  reflections?: Story[];
};

export type SkyStarData = {
  key: string;
  themes: (string | null)[] | null;
  verified: boolean;
  month: string;
  excerptId?: string | null;
};

export type Star = {
  key: string;
  themes: Theme[];
  verified: boolean;
  month: string;
  story?: Story;
};

const isTheme = (t: unknown): t is Theme => (THEMES as readonly string[]).includes(t as string);
const opt = (v: string | null | undefined) => (v && v.trim() ? v.trim() : undefined);

export function toStory(e: Excerpt): Story {
  return {
    id: e.id,
    title: opt(e.title),
    text: e.text,
    body: opt(e.body),
    themes: (e.themes ?? []).filter(isTheme),
    role: opt(e.participantCategory),
    country: opt(e.country),
    ageRange: opt(e.ageRange),
    date: e.contributedOn ?? e.publishedAt.slice(0, 10),
    exactDate: e.exactDate === true,
    creditName: opt(e.creditName),
    creditLine: opt(e.creditLine),
    featured: e.featured === true,
    synthetic: e.synthetic === true,
  };
}

/** Published stories, each with its reflections attached; reflections whose story is gone are left out. */
export function storiesFrom(excerpts: Excerpt[]): Story[] {
  const top = excerpts.filter((e) => !e.parentId).map(toStory);
  const byId = new Map(top.map((s) => [s.id, s]));
  for (const e of excerpts) {
    const parent = e.parentId ? byId.get(e.parentId) : undefined;
    if (parent) (parent.reflections ??= []).push(toStory(e));
  }
  for (const s of top) s.reflections?.sort((a, b) => a.date.localeCompare(b.date));
  return top;
}

/** Every testimony as a star: anonymous ones from the sky query, readable ones joined to their excerpt. */
export function buildStars(sky: SkyStarData[], stories: Story[]): Star[] {
  const byId = new Map(stories.map((s) => [s.id, s]));
  const stars: Star[] = sky.map((s) => {
    const story = s.excerptId ? byId.get(s.excerptId) : undefined;
    if (story) byId.delete(story.id);
    return {
      key: s.key,
      themes: story?.themes.length ? story.themes : (s.themes ?? []).filter(isTheme),
      verified: s.verified,
      month: s.month,
      story,
    };
  });
  // Published excerpts the sky query didn't list (e.g. samples) still get their star.
  for (const story of byId.values()) {
    stars.push({ key: story.id, themes: story.themes, verified: true, month: story.date.slice(0, 7), story });
  }
  return stars;
}

export type Filters = { q: string; country: string; age: string; role: string; month: string };
export const NO_FILTERS: Filters = { q: "", country: "", age: "", role: "", month: "" };
export const hasFilters = (f: Filters) => Object.values(f).some(Boolean);

export function storyMatches(s: Story, f: Filters): boolean {
  if (f.country && s.country !== f.country) return false;
  if (f.age && s.ageRange !== f.age) return false;
  if (f.role && s.role !== f.role) return false;
  if (f.month && !s.date.startsWith(f.month)) return false;
  if (f.q) {
    const hay = [s.title, s.text, s.body, s.country, s.role, s.creditName, ...s.themes].join(" ").toLowerCase();
    if (!f.q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false;
  }
  return true;
}

/** Without filters every star is lit; with them, only readable stars that match. */
export function starMatches(star: Star, f: Filters): boolean {
  if (!hasFilters(f)) return true;
  return !!star.story && storyMatches(star.story, f);
}

const AGE_ORDER = ["18–24", "25–34", "35–44", "45–54", "55–64", "65+"];

export function filterOptions(stories: Story[]) {
  const uniq = (values: (string | undefined)[]) => [...new Set(values.filter((v): v is string => !!v))];
  return {
    countries: uniq(stories.map((s) => s.country)).sort(),
    ages: uniq(stories.map((s) => s.ageRange)).sort((a, b) => AGE_ORDER.indexOf(a) - AGE_ORDER.indexOf(b)),
    roles: uniq(stories.map((s) => s.role)).sort(),
    months: uniq(stories.map((s) => s.date.slice(0, 7))).sort().reverse(),
  };
}

export function formatDate(story: Pick<Story, "date" | "exactDate">) {
  const d = new Date(`${story.date.slice(0, 10)}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    day: story.exactDate ? "numeric" : undefined,
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const formatMonth = (month: string) =>
  new Date(`${month}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

// ---- Layout -------------------------------------------------------------

export const VIEW = { w: 1000, h: 640 };

/** Where each constellation sits, in the 1000 × 640 chart. */
export const ANCHORS: Record<Theme, { x: number; y: number }> = {
  Learning: { x: 160, y: 165 },
  Authorship: { x: 440, y: 125 },
  Identity: { x: 760, y: 150 },
  Creativity: { x: 290, y: 365 },
  Dependency: { x: 590, y: 340 },
  Trust: { x: 870, y: 395 },
  Work: { x: 150, y: 535 },
  "Human Agency": { x: 520, y: 540 },
  Relationships: { x: 820, y: 580 },
};

export type Placed = { star: Star; theme: Theme; x: number; y: number };
export type Constellation = { theme: Theme; placed: Placed[]; links: [number, number][] };

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

/**
 * Stars spiral out from their constellation's anchor, oldest at the heart, so
 * new testimonies arrive at the edge. Lines join each star to its nearest
 * neighbour already in the figure (a minimum spanning tree), which keeps the
 * shapes constellation-like at any size.
 */
export function layout(stars: Star[]): Constellation[] {
  return THEMES.map((theme) => {
    const members = stars
      .filter((s) => s.themes.includes(theme))
      .sort((a, b) => a.month.localeCompare(b.month) || a.key.localeCompare(b.key));
    const { x: ax, y: ay } = ANCHORS[theme];
    const turn = hash(theme) * Math.PI * 2;
    const placed = members.map((star, i) => {
      const r = 16 * Math.sqrt(i + 0.7) + (hash(`${star.key}r`) - 0.5) * 10;
      const a = turn + i * 2.399963 + (hash(`${star.key}a`) - 0.5) * 0.5;
      return {
        star,
        theme,
        x: Math.min(VIEW.w - 12, Math.max(12, ax + Math.cos(a) * r * 1.35)),
        y: Math.min(VIEW.h - 12, Math.max(40, ay + Math.sin(a) * r)),
      };
    });

    const links: [number, number][] = [];
    if (placed.length > 1) {
      const inTree = new Set([0]);
      const best = placed.map((p) => Math.hypot(p.x - placed[0].x, p.y - placed[0].y));
      const from = placed.map(() => 0);
      while (inTree.size < placed.length) {
        let next = -1;
        for (let i = 0; i < placed.length; i++) if (!inTree.has(i) && (next < 0 || best[i] < best[next])) next = i;
        inTree.add(next);
        links.push([from[next], next]);
        for (let i = 0; i < placed.length; i++) {
          if (inTree.has(i)) continue;
          const d = Math.hypot(placed[i].x - placed[next].x, placed[i].y - placed[next].y);
          if (d < best[i]) {
            best[i] = d;
            from[i] = next;
          }
        }
      }
    }
    return { theme, placed, links };
  });
}

/** Stars from the last month twinkle, so a returning visitor can see what's new. */
export function isNew(month: string, now = new Date()) {
  const [y, m] = month.split("-").map(Number);
  const age = (now.getUTCFullYear() - y) * 12 + (now.getUTCMonth() + 1 - m);
  return age <= 1;
}
