"use client";

import { ArrowRight, Search, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { client, listAll } from "@/lib/amplify";
import { THEMES, type Theme } from "@/lib/harf";
import { Reader, StoryMeta } from "./reader";
import { SAMPLE_SKY, SAMPLE_STORIES } from "./sample";
import {
  ANCHORS,
  NO_FILTERS,
  VIEW,
  buildStars,
  filterOptions,
  formatMonth,
  hasFilters,
  isNew,
  layout,
  starMatches,
  storyMatches,
  storiesFrom,
  type Filters,
  type SkyStarData,
  type Star,
  type Story,
} from "./stories";

type Loaded = { stars: Star[]; stories: Story[]; sample: boolean };

async function load(): Promise<Loaded> {
  if (window.location.hash === "#sample") {
    return { stars: buildStars(SAMPLE_SKY, SAMPLE_STORIES), stories: SAMPLE_STORIES, sample: true };
  }
  const [excerpts, sky] = await Promise.allSettled([
    listAll((nextToken) => client.models.Excerpt.list({ nextToken })),
    client.queries.skyStars(),
  ]);
  const stories = excerpts.status === "fulfilled" ? storiesFrom(excerpts.value) : [];
  const skyStars =
    sky.status === "fulfilled" ? ((sky.value.data ?? []).filter(Boolean) as SkyStarData[]) : [];
  return { stars: buildStars(skyStars, stories), stories, sample: false };
}

/** The home page's constellations: every testimony is a star. */
export function Observatory() {
  const [data, setData] = useState<Loaded | null>(null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [reading, setReading] = useState<Story | null>(null);

  useEffect(() => {
    let alive = true;
    const run = () =>
      load()
        .then((d) => {
          if (!alive) return;
          setData(d);
          // A link like /#read=<id> opens that testimony straight away.
          const id = /^#read=(.+)$/.exec(window.location.hash)?.[1];
          const story = id ? d.stories.find((s) => s.id === decodeURIComponent(id)) : undefined;
          if (story) {
            setReading(story);
            document.getElementById("constellations")?.scrollIntoView();
          }
        })
        .catch(() => alive && setData({ stars: [], stories: [], sample: false }));
    run();
    window.addEventListener("hashchange", run);
    return () => {
      alive = false;
      window.removeEventListener("hashchange", run);
    };
  }, []);

  const stars = useMemo(() => data?.stars ?? [], [data]);
  const stories = useMemo(() => data?.stories ?? [], [data]);
  const constellations = useMemo(() => layout(stars), [stars]);
  const options = useMemo(() => filterOptions(stories), [stories]);
  const filtering = hasFilters(filters);

  const listed = useMemo(
    () =>
      stories
        .filter((s) => (!theme || s.themes.includes(theme)) && storyMatches(s, filters))
        .sort((a, b) => Number(b.featured) - Number(a.featured) || b.date.localeCompare(a.date)),
    [stories, theme, filters],
  );
  const waiting = useMemo(
    () => stars.filter((s) => !s.story && (!theme || s.themes.includes(theme))).length,
    [stars, theme],
  );
  const featured = useMemo(() => stories.filter((s) => s.featured).slice(0, 3), [stories]);

  const update = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPanelOpen(true);
  };
  const pickTheme = (t: Theme) => {
    setTheme((current) => (current === t && panelOpen ? null : t));
    setPanelOpen(true);
  };
  const closePanel = () => {
    setPanelOpen(false);
    setTheme(null);
  };
  const open = useCallback((s: Story) => setReading(s), []);
  const closeReader = useCallback(() => {
    setReading(null);
    if (window.location.hash.startsWith("#read=")) history.replaceState(null, "", window.location.pathname);
  }, []);

  const total = stars.length;
  const readable = stars.filter((s) => s.story).length;

  return (
    <section id="constellations" aria-labelledby="constellations-title" className="relative mx-auto max-w-7xl scroll-mt-24 px-4 pb-28 pt-10 sm:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="constellations-title" className="font-serif text-4xl leading-tight text-white sm:text-6xl">
          Every star is a testimony.
        </h2>
        {data ? (
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/45">
            {total} {total === 1 ? "star" : "stars"} · {readable} open
          </p>
        ) : null}
      </div>

      {data?.sample ? (
        <p className="mx-auto mt-6 w-fit rounded-full bg-amber-200/15 px-4 py-1.5 text-xs text-amber-100 ring-1 ring-amber-200/30">
          Sample data
        </p>
      ) : null}

      <FilterBar filters={filters} options={options} onChange={update} onClear={() => setFilters(NO_FILTERS)} />

      <div className={`mt-6 grid gap-6 ${panelOpen ? "lg:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
        <div className="relative">
          <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="h-auto w-full select-none" role="group" aria-label="Constellations of testimonies by theme">
            <defs>
              <radialGradient id="obs-glow">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
                <stop offset="35%" style={{ stopColor: "var(--starlight)" }} stopOpacity="0.25" />
                <stop offset="100%" style={{ stopColor: "var(--starlight)" }} stopOpacity="0" />
              </radialGradient>
            </defs>
            {constellations.map((c) => {
              const dim = theme !== null && theme !== c.theme;
              const top = c.placed.length ? Math.min(...c.placed.map((p) => p.y)) : 0;
              const labelY = Math.max(26, (c.placed.length ? top : ANCHORS[c.theme].y) - 16);
              const labelX = ANCHORS[c.theme].x;
              const count = c.placed.length;
              return (
                <g key={c.theme} className="transition-opacity duration-500" opacity={dim ? 0.22 : 1}>
                  <path
                    d={c.links.map(([a, b]) => `M${c.placed[a].x} ${c.placed[a].y}L${c.placed[b].x} ${c.placed[b].y}`).join("")}
                    style={{ stroke: "var(--starlight)" }}
                    strokeOpacity={filtering ? 0.12 : 0.32}
                    strokeWidth={0.8}
                    fill="none"
                  />
                  {c.placed.map((p) => (
                    <StarMark key={`${c.theme}-${p.star.key}`} p={p} lit={starMatches(p.star, filters)} onOpen={open} />
                  ))}
                  <g
                    role="button"
                    tabIndex={0}
                    aria-pressed={theme === c.theme}
                    aria-label={`${c.theme}: ${count} ${count === 1 ? "star" : "stars"}`}
                    onClick={() => pickTheme(c.theme)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pickTheme(c.theme))}
                    className="obs-label cursor-pointer outline-none"
                  >
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      className="fill-white font-serif text-[19px] italic"
                      style={{ letterSpacing: "0.12em" }}
                    >
                      {c.theme}
                    </text>
                    <text x={labelX} y={labelY + 14} textAnchor="middle" className="fill-white/45 text-[9px] tracking-[0.2em]">
                      {count}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
          {data && !total ? (
            <p className="absolute inset-x-0 top-1/2 mx-auto max-w-sm -translate-y-1/2 text-center text-sm text-white/60">
              No stars yet
            </p>
          ) : null}
          <Legend />
        </div>

        {panelOpen ? (
          <aside aria-label="Testimonies" className="observatory-rise flex max-h-[42rem] flex-col rounded-lg bg-white/[0.05] ring-1 ring-white/12 backdrop-blur-md">
            <header className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
              <div>
                <h3 className="font-serif text-3xl text-white">{theme ?? "Results"}</h3>
                <p className="mt-1 text-xs text-white/55">
                  {listed.length} open
                  {waiting && !filtering ? ` · ${waiting} pending` : ""}
                </p>
              </div>
              <button type="button" onClick={closePanel} aria-label="Close list" className="rounded-full p-1.5 text-white/55 hover:bg-white/10 hover:text-white">
                <X className="size-4" />
              </button>
            </header>
            <ul className="flex-1 space-y-2 overflow-y-auto p-3">
              {listed.length ? (
                listed.map((s) => (
                  <li key={s.id}>
                    <StoryButton story={s} onOpen={open} />
                  </li>
                ))
              ) : (
                <li className="p-4 text-sm text-white/55">
                  {filtering ? "No matches" : "Nothing open yet"}
                </li>
              )}
            </ul>
          </aside>
        ) : null}
      </div>

      <ul className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Constellations">
        {THEMES.map((t) => {
          const n = constellations.find((c) => c.theme === t)?.placed.length ?? 0;
          return (
            <li key={t}>
              <button
                type="button"
                aria-pressed={theme === t}
                onClick={() => pickTheme(t)}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  theme === t ? "bg-white text-black" : "text-white/70 ring-1 ring-white/20 hover:bg-white/10 hover:text-white"
                }`}
              >
                {t} <span className="ml-1 text-xs opacity-60">{n}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {featured.length ? (
        <div className="mt-20">
          <p className="eyebrow text-center !text-white/50">Featured</p>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {featured.map((s) => (
              <li key={s.id}>
                <StoryButton story={s} onOpen={open} large />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-16 text-center">
        <Link
          href="/archive/"
          data-track="archive_click"
          data-track-from="observatory"
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm text-white ring-1 ring-white/30 transition-colors hover:bg-white hover:text-ink"
        >
          Read every story in the Living Archive <ArrowRight aria-hidden className="size-4" />
        </Link>
      </p>

      {reading ? <Reader story={reading} onClose={closeReader} /> : null}
    </section>
  );
}

function StarMark({ p, lit, onOpen }: { p: { star: Star; x: number; y: number }; lit: boolean; onOpen: (s: Story) => void }) {
  const { star, x, y } = p;
  const fresh = isNew(star.month);
  if (!star.story) {
    return (
      <circle
        cx={x}
        cy={y}
        r={star.verified ? 1.7 : 1.3}
        fill="#fff"
        opacity={lit ? (star.verified ? 0.6 : 0.4) : 0.08}
        className={fresh && lit ? "obs-twinkle" : undefined}
        style={{ animationDelay: `${(x * 7 + y) % 4}s` }}
      />
    );
  }
  const story = star.story;
  const label = story.title ?? story.text.slice(0, 90);
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`Read: ${label}`}
      onClick={() => onOpen(story)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(story))}
      className="obs-star cursor-pointer outline-none"
      opacity={lit ? 1 : 0.12}
    >
      <title>{label}</title>
      <circle cx={x} cy={y} r={story.featured ? 14 : 10} fill="url(#obs-glow)" className="obs-halo" />
      <circle cx={x} cy={y} r={story.featured ? 3.4 : 2.6} fill="#fff" className={fresh ? "obs-twinkle" : undefined} />
      <circle cx={x} cy={y} r={14} fill="transparent" />
    </g>
  );
}

function StoryButton({ story, onOpen, large = false }: { story: Story; onOpen: (s: Story) => void; large?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(story)}
      className={`block w-full rounded-md text-left ring-1 ring-white/10 transition-colors hover:bg-white/[0.08] hover:ring-white/25 ${
        large ? "h-full bg-white/[0.04] p-6" : "p-4"
      }`}
    >
      {story.title ? (
        <span className={`block font-serif text-white ${large ? "text-2xl" : "text-xl"} leading-snug`}>{story.title}</span>
      ) : null}
      <span
        className={`block text-white/80 ${story.title ? "mt-2 line-clamp-2 text-sm" : `line-clamp-3 italic leading-snug ${large ? "text-xl" : "text-lg"}`}`}
      >
        “{story.text}”
      </span>
      {story.creditName ? <span className="mt-3 block text-sm text-white">{story.creditName}</span> : null}
      <StoryMeta story={story} className={`text-white/55 ${story.creditName ? "mt-0.5" : "mt-3"}`} />
    </button>
  );
}

function FilterBar({
  filters,
  options,
  onChange,
  onClear,
}: {
  filters: Filters;
  options: ReturnType<typeof filterOptions>;
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
}) {
  const select = (key: keyof Filters, label: string, values: string[], show: (v: string) => string = (v) => v) => (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={filters[key]}
        onChange={(e) => onChange({ [key]: e.target.value })}
        disabled={!values.length}
        className="h-10 w-full appearance-none rounded-full bg-white/[0.06] px-4 pr-8 text-sm text-white ring-1 ring-white/15 transition-colors hover:ring-white/30 disabled:opacity-40 [&>option]:bg-night"
      >
        <option value="">{label}</option>
        {values.map((v) => (
          <option key={v} value={v}>
            {show(v)}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[0.6rem] text-white/50">
        ▼
      </span>
    </label>
  );

  return (
    <div className="mx-auto mt-10 grid max-w-5xl grid-cols-2 gap-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))_auto]">
      <label className="relative col-span-2 lg:col-span-1">
        <span className="sr-only">Search testimonies</span>
        <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/45" />
        <input
          type="search"
          value={filters.q}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="Search"
          className="h-10 w-full rounded-full bg-white/[0.06] pl-10 pr-4 text-sm text-white ring-1 ring-white/15 placeholder:text-white/40 focus:ring-white/40"
        />
      </label>
      {select("country", "Any country", options.countries)}
      {select("age", "Any age", options.ages)}
      {select("role", "Any role", options.roles)}
      {select("month", "Any time", options.months, formatMonth)}
      <ClearButton visible={hasFilters(filters)} onClick={onClear}>
        Clear
      </ClearButton>
    </div>
  );
}

function ClearButton({ visible, onClick, children }: { visible: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-full px-4 text-sm text-white/70 hover:text-white ${visible ? "" : "invisible"}`}
    >
      {children}
    </button>
  );
}

function Legend() {
  return (
    <ul className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1 text-[0.7rem] text-white/45">
      <li className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.5)]" /> Open
      </li>
      <li className="flex items-center gap-2">
        <span className="size-1 rounded-full bg-white/60" /> Pending
      </li>
      <li className="flex items-center gap-2">
        <span className="obs-twinkle size-1.5 rounded-full bg-white" /> New
      </li>
    </ul>
  );
}
