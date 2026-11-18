"use client";

import { ArrowRight, ChevronDown, ClipboardList, Library, PenLine, RotateCcw, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { SkyCanvas } from "@/components/sky/sky-canvas";
import { LOOKS, TITLES } from "@/components/sky/looks";
import { SKY_FONTS, SkyTitle, TITLE_TYPE, cormorant } from "@/components/sky/sky-title";

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

  const type = TITLE_TYPE[look.id];
  const vars = { "--concept-ink": look.ink, "--concept-accent": look.accent, "--concept-veil": look.veil } as CSSProperties;

  return (
    <div ref={rootRef} className="sky-page concepts-page relative text-white" style={vars}>
      <SkyCanvas key={`${look.id}-${run}`} look={look} fonts={SKY_FONTS} />

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
        <SkyTitle key={`${look.id}-${title.id}-${run}`} look={look} title={title} />
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
