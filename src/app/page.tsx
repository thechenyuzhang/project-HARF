import { ArrowRight, ChevronDown, ClipboardList, Clock, Library, PenLine, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { WeeklyQuestionCard } from "@/components/home-islands";
import { Observatory } from "@/components/observatory/observatory";
import { LOOKS, TITLES } from "@/components/sky/looks";
import { SkyCanvas } from "@/components/sky/sky-canvas";
import { SKY_FONTS, SkyTitle, TITLE_TYPE } from "@/components/sky/sky-title";
import { TeamSection } from "@/components/team-section";

// The home page: Letter Sky, the look chosen on /concepts/. The sky stays put
// while the title, the constellations and then the paper sections travel up over it.
const LOOK = LOOKS.find((l) => l.id === "letters")!;
const TITLE = TITLES.find((t) => t.id === "observatory")!;

const ACTIONS: { href: string; icon: LucideIcon; title: string; text: string; time: string; track: string }[] = [
  {
    href: "/share/",
    icon: PenLine,
    title: "Share your experience",
    text: "Tell your story in your own words.",
    time: "About 5–10 min",
    track: "share_click",
  },
  {
    href: "/survey/",
    icon: ClipboardList,
    title: "Take the survey",
    text: "Answer structured questions about your experience.",
    time: "About 5–7 min",
    track: "survey_click",
  },
  {
    href: "/archive/",
    icon: Library,
    title: "Explore the archive",
    text: "Discover how others are experiencing the AI transition.",
    time: "Browse at your own pace",
    track: "archive_click",
  },
];

export default function Home() {
  return (
    <div className="sky-page relative text-white" style={{ "--concept-accent": LOOK.accent } as CSSProperties}>
      <SkyCanvas look={LOOK} fonts={SKY_FONTS} coverSelector="#home-paper" veilMax={0.86} />

      {/* First page: the title, alone with the sky. */}
      <section
        aria-label="On AI and Us: The Observatory"
        className={`relative mx-auto flex h-[calc(100svh-5.5rem)] min-h-[30rem] max-w-7xl px-6 sm:px-10 ${TITLE_TYPE.letters.hero}`}
      >
        <SkyTitle look={LOOK} title={TITLE} />
        <a
          href="#constellations"
          className="concept-fade absolute inset-x-0 bottom-6 mx-auto flex w-fit animate-bounce text-white/55 hover:text-white"
          style={{ "--d": "3.5s" } as CSSProperties}
        >
          <span className="sr-only">Explore the constellations</span>
          <ChevronDown aria-hidden className="size-5" />
        </a>
      </section>

      {/* Second page: the constellations, travelling up over the still sky. */}
      <Observatory />

      {/* The rest of the page is paper, sliding over the sky. */}
      <div id="home-paper" className="relative bg-paper pb-4 text-ink">
      {/* Invitation to participate */}
      <section className="mx-auto max-w-6xl px-5 pt-20 sm:pt-24">
        <h2 className="font-serif text-3xl leading-tight sm:text-4xl">Tell us what AI is changing in your life.</h2>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">
          Your experience today could help us understand what changed tomorrow.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {ACTIONS.map(({ href, icon: Icon, title, text, time, track }) => (
            <Link
              key={title}
              href={href}
              data-track={track}
              data-track-from="home_card"
              className="group relative flex flex-col rounded-lg bg-card p-7 shadow-sm ring-1 ring-rule transition-shadow hover:shadow-md"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Icon aria-hidden className="size-6" strokeWidth={1.6} />
              </span>
              <span className="mt-6 block font-serif text-2xl">{title}</span>
              <span className="mt-1 block text-sm text-ink-soft">{text}</span>
              <span className="mt-5 inline-flex items-center gap-1.5 pt-1 text-xs text-muted">
                <Clock aria-hidden className="size-3.5" />
                {time}
              </span>
              <ArrowRight
                aria-hidden
                className="absolute right-6 top-6 size-5 text-muted transition-all group-hover:translate-x-0.5 group-hover:text-accent"
              />
            </Link>
          ))}
        </div>
      </section>

      <WeeklyQuestionCard />

      {/* Purpose */}
      <section className="mx-auto max-w-4xl px-5 py-24 text-center sm:py-32">
        <p className="mx-auto max-w-3xl font-serif text-2xl italic leading-snug text-gold sm:text-3xl">
          Documenting how artificial intelligence is reshaping the way we think, learn, work, and relate to one another
          — as the transformation unfolds.
        </p>
        <span aria-hidden className="mx-auto my-12 block h-0.5 w-24 bg-gold" />
        <blockquote className="font-serif text-3xl leading-tight sm:text-5xl">
          “What people believed before they knew what happened cannot be reconstructed later.”
        </blockquote>
      </section>

      <TeamSection />
      </div>
    </div>
  );
}
