"use client";

import { ArrowRight, ChevronDown, ClipboardList, Library, PenLine, RotateCcw, type LucideIcon } from "lucide-react";
import { Cormorant_Garamond, Josefin_Sans } from "next/font/google";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { SkyCanvas } from "./sky-canvas";
import { LOOKS, TITLES, type Look, type LookId, type Title } from "./variants";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"] });
const josefin = Josefin_Sans({ subsets: ["latin"], weight: ["300", "400"] });
const FONTS = { serif: cormorant.style.fontFamily, sans: josefin.style.fontFamily };

// How each look sets the title. All of them centre on narrow screens.
const TYPE: Record<LookId, { hero: string; block: string; kicker: string; main: string; sub: string }> = {
  letters: {
    hero: "items-center justify-center text-center",
    block: "max-w-5xl",
    kicker: `${cormorant.className} text-2xl italic sm:text-4xl`,
    main: `${cormorant.className} text-[clamp(3.25rem,9vw,8.5rem)] font-medium italic leading-[0.95]`,
    sub: "mx-auto mt-7 max-w-xl text-base font-light sm:text-lg",
  },
  chart: {
    hero: "items-center justify-center text-center md:items-start md:pt-[7svh]",
    block: "max-w-4xl",
    kicker: `${josefin.className} text-sm uppercase tracking-[0.32em] sm:text-base`,
    main: `${josefin.className} text-[clamp(1.7rem,4.6vw,4rem)] uppercase leading-[1.15] tracking-[0.2em]`,
    sub: `${josefin.className} mx-auto mt-5 max-w-2xl text-base font-light tracking-[0.16em] sm:text-lg`,
  },
  field: {
    hero: "items-center justify-center text-center md:items-end md:justify-start md:pb-[11svh] md:text-left",
    block: "max-w-2xl",
    kicker: `${josefin.className} text-xs uppercase tracking-[0.5em] sm:text-sm`,
    main: `${josefin.className} text-[clamp(1.5rem,3.3vw,2.9rem)] font-light uppercase leading-[1.35] tracking-[0.42em]`,
    sub: "mt-6 max-w-md text-sm font-light leading-relaxed max-md:mx-auto sm:text-base",
  },
  atlas: {
    hero: "items-center justify-center text-center md:justify-start md:text-left",
    block: "max-w-2xl",
    kicker: `${cormorant.className} text-2xl italic sm:text-3xl`,
    main: `${cormorant.className} text-[clamp(3rem,6.6vw,6.5rem)] leading-[0.98]`,
    sub: `${cormorant.className} mt-6 max-w-md text-xl italic leading-snug max-md:mx-auto sm:text-2xl`,
  },
};

const ACTIONS: { href: string; icon: LucideIcon; title: string; text: string }[] = [
  { href: "/share/", icon: PenLine, title: "Share your experience", text: "Tell your story in your own words." },
  { href: "/survey/", icon: ClipboardList, title: "Take the survey", text: "Answer structured questions about your experience." },
  { href: "/archive/", icon: Library, title: "Explore the archive", text: "Discover how others are experiencing the AI transition." },
];

// The chosen look and title live in the URL hash, so a link opens the same combination.
const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const readHash = () => window.location.hash;
const noHash = () => "";

function choose(key: "look" | "title", value: string) {
  const params = new URLSearchParams(window.location.hash.slice(1));
  params.set(key, value);
  window.history.replaceState(null, "", `#${params}`);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export function ConceptsLab() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(0);
  const params = new URLSearchParams(useSyncExternalStore(subscribeHash, readHash, noHash).slice(1));
  const look = LOOKS.find((l) => l.id === params.get("look")) ?? LOOKS[0];
  const title = TITLES.find((t) => t.id === (params.get("title") ?? look.defaultTitle)) ?? TITLES[0];

  // The tabs stick just under the site header, whatever its height.
  useEffect(() => {
    const root = rootRef.current;
    const header = document.querySelector<HTMLElement>("body > header");
    if (!root || !header) return;
    const apply = () => root.style.setProperty("--chrome-top", `${header.offsetHeight}px`);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const type = TYPE[look.id];
  const vars = { "--concept-ink": look.ink, "--concept-accent": look.accent, "--concept-veil": look.veil } as CSSProperties;

  return (
    <div ref={rootRef} className="concepts-page relative text-white" style={vars}>
      <SkyCanvas key={`${look.id}-${run}`} look={look} fonts={FONTS} />

      {/* Review controls: not part of the design. */}
      <div className="sticky top-[var(--chrome-top,85px)] z-20 border-b border-white/10 bg-black/55 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 pt-2.5">
          <span className="eyebrow hidden w-12 shrink-0 !text-white/50 sm:block">Look</span>
          <div role="tablist" aria-label="Visual direction" className="concept-scroll flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
            {LOOKS.map((l) => (
              <button
                key={l.id}
                role="tab"
                type="button"
                aria-selected={l.id === look.id}
                onClick={() => choose("look", l.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
                  l.id === look.id ? "bg-white text-black" : "text-white/75 ring-1 ring-white/20 hover:bg-white/10 hover:text-white"
                }`}
              >
                {l.tab}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0 });
              setRun((n) => n + 1);
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-white/75 ring-1 ring-white/20 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw aria-hidden className="size-3.5" />
            <span className="max-sm:sr-only">Replay entrance</span>
          </button>
        </div>
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 pb-2.5 pt-2">
          <span className="eyebrow hidden w-12 shrink-0 !text-white/50 sm:block">Title</span>
          <div role="tablist" aria-label="Title wording" className="concept-scroll flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
            {TITLES.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={t.id === title.id}
                title={t.source}
                onClick={() => choose("title", t.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${
                  t.id === title.id ? "bg-white/90 text-black" : "text-white/65 ring-1 ring-white/15 hover:bg-white/10 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* First page: the title, alone with the sky. */}
      <section
        aria-label={`${look.tab} concept`}
        className={`relative mx-auto flex h-[calc(100svh-var(--chrome-top,85px)-5.5rem)] min-h-[30rem] max-w-7xl px-6 sm:px-10 ${type.hero}`}
      >
        <Heading key={`${look.id}-${title.id}-${run}`} look={look} title={title} />
        <a
          href="#concept-next"
          className="concept-fade absolute inset-x-0 bottom-5 mx-auto flex w-fit flex-col items-center gap-1 text-[0.65rem] uppercase tracking-[0.3em] text-white/55 hover:text-white"
          style={{ "--d": "4s" } as CSSProperties}
        >
          Scroll
          <ChevronDown aria-hidden className="size-4" />
        </a>
      </section>

      {/* Second page: travels up over the sky, which stays where it is. */}
      <section id="concept-next" className="relative mx-auto flex min-h-svh max-w-6xl scroll-mt-40 flex-col justify-center px-5 py-24">
        <p className="eyebrow !text-[var(--concept-accent)]">{look.tab}</p>
        <p className="mt-2 max-w-xl text-sm text-white/60">{look.note}</p>
        <h2 className={`mt-14 max-w-3xl text-4xl leading-tight sm:text-6xl ${cormorant.className}`} style={{ color: look.ink }}>
          Tell us what AI is changing in your life.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-white/75">
          Your experience today could help us understand what changed tomorrow.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {ACTIONS.map(({ href, icon: Icon, title: name, text }) => (
            <Link
              key={href}
              href={href}
              className="group relative flex flex-col rounded-lg bg-white/[0.06] p-7 ring-1 ring-white/15 backdrop-blur-sm transition-colors hover:bg-white/[0.12] hover:ring-[var(--concept-accent)]"
            >
              <Icon aria-hidden className="size-6 text-[var(--concept-accent)]" strokeWidth={1.5} />
              <span className={`mt-6 block text-3xl ${cormorant.className}`}>{name}</span>
              <span className="mt-1 block text-sm text-white/65">{text}</span>
              <ArrowRight
                aria-hidden
                className="absolute right-6 top-7 size-5 text-white/40 transition-all group-hover:translate-x-0.5 group-hover:text-white"
              />
            </Link>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-4xl px-5 pb-40 pt-16 text-center">
        <span aria-hidden className="mx-auto mb-12 block h-px w-24 bg-[var(--concept-accent)]" />
        <blockquote className={`text-3xl italic leading-tight sm:text-5xl ${cormorant.className}`} style={{ color: look.ink }}>
          “What people believed before they knew what happened cannot be reconstructed later.”
        </blockquote>
      </section>
    </div>
  );
}

/** The title, arriving a letter at a time; a few letters catch the light and keep twinkling. */
function Heading({ look, title }: { look: Look; title: Title }) {
  const type = TYPE[look.id];
  const words = title.main.split(" ");
  const lettersBefore = (index: number) => words.slice(0, index).reduce((n, word) => n + word.length, 0);
  const settled = 0.5 + title.main.length * 0.05;

  return (
    <div className={`relative ${type.block}`} style={{ color: look.ink }}>
      {/* A soft pool of darkness, so the sky never fights the words. */}
      <span
        aria-hidden
        className="absolute -inset-x-24 -inset-y-16 -z-10 blur-2xl"
        style={{ background: `radial-gradient(closest-side, rgb(${look.veil} / 0.8), rgb(${look.veil} / 0))` }}
      />
      {title.kicker && (
        <p className={`concept-fade mb-3 opacity-85 ${type.kicker}`} style={{ "--d": "0.3s" } as CSSProperties}>
          {title.kicker}
        </p>
      )}
      <h1 aria-label={title.main} className={`text-balance ${type.main}`}>
        {words.map((word, w) => (
          <span key={w} aria-hidden className="inline-block whitespace-nowrap">
            {[...word].map((ch, i) => {
              const n = lettersBefore(w) + i;
              const glint = (n * 5 + title.main.length) % 7 === 3;
              return (
                <span
                  key={i}
                  className={`concept-letter ${glint ? "concept-letter-glint" : ""}`}
                  style={{ "--d": `${0.5 + n * 0.05}s`, "--g": `${1.2 + ((n * 37) % 50) / 10}s` } as CSSProperties}
                >
                  {ch}
                  {glint && (
                    <svg viewBox="0 0 24 24" className="concept-glint" fill="currentColor">
                      <path d="M12 0c.5 8.2 3.3 11 12 12-8.7 1-11.5 3.8-12 12-.5-8.2-3.3-11-12-12 8.7-1 11.5-3.8 12-12Z" />
                    </svg>
                  )}
                </span>
              );
            })}
            {w < words.length - 1 && " "}
          </span>
        ))}
      </h1>
      {look.id === "atlas" && (
        <span
          aria-hidden
          className="concept-fade mt-7 block h-px w-28 bg-[var(--concept-accent)] max-md:mx-auto"
          style={{ "--d": `${settled}s` } as CSSProperties}
        />
      )}
      <p className={`concept-fade text-white/80 ${type.sub}`} style={{ "--d": `${settled + 0.2}s` } as CSSProperties}>
        {title.sub}
      </p>
    </div>
  );
}
