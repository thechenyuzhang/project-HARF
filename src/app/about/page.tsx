import { Archive, Lightbulb, Repeat, Telescope } from "lucide-react";
import type { Metadata } from "next";
import { CircleLink } from "@/components/circle-link";
import { IconCard, PageHero } from "@/components/page-hero";
import { TeamSection } from "@/components/team-section";

export const metadata: Metadata = {
  title: "About",
  description: "Why HARF is building a Living Memory of the human experience of AI.",
};

const QUESTIONS = [
  "What did students believe AI would do to their intelligence in 2026?",
  "Which fears disappeared, and which changes became permanent?",
  "What did society normalize without realizing it?",
];

const icon = "size-6";

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About HARF" title="HARF begins where the headline ends.">
        An evolving archive of how people experience the AI transition, gathered while it is still happening.
      </PageHero>

      <section className="mx-auto max-w-6xl px-5 pt-16">
        <p className="max-w-4xl font-serif text-3xl leading-tight sm:text-5xl">
          Not what AI can do, but what happens to people while it happens.
        </p>
        <p className="mt-6 max-w-2xl leading-relaxed text-ink-soft">
          HARF collects personal accounts and structured responses over time. As it grows, the archive may support
          journalism, research and comparative studies across societies.
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pt-14 sm:grid-cols-2 lg:grid-cols-4">
        <IconCard icon={<Telescope aria-hidden className={icon} strokeWidth={1.6} />} title="Document">
          Everyday changes in how people think, learn and create — the ones that rarely become news.
        </IconCard>
        <IconCard icon={<Repeat aria-hidden className={icon} strokeWidth={1.6} />} title="Return">
          Participants come back months later. The evolution matters as much as the story.
        </IconCard>
        <IconCard icon={<Archive aria-hidden className={icon} strokeWidth={1.6} />} title="Preserve">
          Original words kept intact, including uncertainty and ideas later abandoned.
        </IconCard>
        <IconCard icon={<Lightbulb aria-hidden className={icon} strokeWidth={1.6} />} title="Inform">
          Translate emerging patterns into insights that can inform public debate, institutional decisions, and policy.
        </IconCard>
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-14">
        <p className="max-w-3xl font-serif text-2xl leading-snug">
          Anyone can contribute to HARF. Stories are published after basic moderation, with each author&apos;s voice
          preserved. Selected contributions may receive additional editorial attention with the author&apos;s approval.
          Participants can return to their stories over time, adding new reflections without erasing what they
          originally shared.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-24">
        <p className="eyebrow">A researcher in 2035 might ask</p>
        <ul className="mt-6 divide-y divide-rule border-y border-rule">
          {QUESTIONS.map((q) => (
            <li key={q} className="py-6 font-serif text-2xl leading-snug sm:text-3xl">
              {q}
            </li>
          ))}
        </ul>
      </section>

      <TeamSection />

      <section className="mx-auto max-w-6xl px-5">
        <div className="mt-14">
          <CircleLink href="/share/">Add your experience</CircleLink>
        </div>
      </section>
    </>
  );
}
