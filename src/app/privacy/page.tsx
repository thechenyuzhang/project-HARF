import {
  BarChart3,
  Database,
  Eye,
  Gauge,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  UserX,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { IconCard, PageHero } from "@/components/page-hero";
import { CONSENT_TEXT, CONSENT_VERSION } from "@/lib/harf";
import { WithdrawalForm } from "./withdrawal-form";

export const metadata: Metadata = {
  title: "Privacy & consent",
  description: "Why HARF collects experiences, how they are stored and used, and how to withdraw.",
};

const SECTIONS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: HelpCircle,
    title: "Why we ask",
    body: "To keep a record of how people experience AI while it is happening, before memories and interpretations change. Over time it may support journalism, research and comparative studies.",
  },
  {
    icon: Database,
    title: "What we collect",
    body: "Your story and any images, audio or video you attach. Only if you choose: age range, gender, countries, first language, academic stage, field, and how you use and feel about AI. No name or institution is ever required. HARF is for people aged 18 and over.",
  },
  {
    icon: Lock,
    title: "How it's stored and used",
    body: "On Amazon Web Services in the United States (Ohio), encrypted in transit and at rest. Only HARF editors can see private records. Your original words are kept exactly as written and used for research and editorial work.",
  },
  {
    icon: Eye,
    title: "What may be published",
    body: "Nothing is published automatically. Only if you allow it, an editor may publish a short excerpt. If you choose to remain anonymous, anything that could identify you is removed and a broad label such as “Student” may be used. Identifiable information is published only with your explicit permission.",
  },
  {
    icon: UserX,
    title: "Your choice of attribution",
    body: "Anonymity is optional. You can choose to remain anonymous or to be identified when your testimony is published. We credit you by name only with your explicit consent. Agreeing to publication does not by itself give permission to identify you.",
  },
  {
    icon: Mail,
    title: "Future contact",
    body: "Two separate, optional choices: an interview, or an invitation to revisit your answers in six months. Emails are stored apart from your story, never published, and used only for what you agreed to.",
  },
  {
    icon: KeyRound,
    title: "Your participant code",
    body: "Links your contributions over time without identifying you. We store only a one-way fingerprint of it, so we can't look it up or recover it.",
  },
  {
    icon: Gauge,
    title: "The analysis after your story",
    body: "When you submit an English story, a simple word list estimates its tone, with no outside AI service involved. We keep only a broad label (such as “Mixed”) with your contribution, and it is deleted with it. The charts you see count people, leave out any group smaller than five, and round the numbers, so nobody can be picked out.",
  },
  {
    icon: BarChart3,
    title: "Usage statistics",
    body: "To see whether people find and finish the site, we count visits and steps anonymously, using a random ID kept in your browser. No IP addresses, no advertising or third-party trackers, and nothing is sent if your browser asks not to be tracked. Records expire after 13 months.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Privacy & consent" title="How we treat what you share">
        Your experience is yours. You decide whether it is published and whether you are identified, and you can ask us to
        remove it at any time.
      </PageHero>
      <div className="mx-auto max-w-6xl px-5 pt-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map(({ icon: Icon, title, body }) => (
            <IconCard key={title} icon={<Icon aria-hidden className="size-6" strokeWidth={1.6} />} title={title}>
              {body}
            </IconCard>
          ))}
        </div>

        <section className="mt-16">
          <h2 className="font-serif text-3xl">Your separate choices</h2>
          <p className="mt-1 text-sm text-muted">
            In the story form, each choice is asked on its own and recorded with your contribution (consent version {CONSENT_VERSION}).
            You can choose to remain anonymous or be identified when an excerpt of your contribution is published.
            You are identified only with your explicit consent, as in the structured survey. Permission to publish
            does not by itself give permission to identify you.
          </p>
          <ol className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              ["Participation", "Required", CONSENT_TEXT.research],
              ["Publication", "Optional", CONSENT_TEXT.publish],
              ["Interview", "Optional", CONSENT_TEXT.contact],
              ["Six-month invitation", "Optional", CONSENT_TEXT.revisit],
            ].map(([title, kind, text], i) => (
              <li key={title} className="rounded-lg bg-card p-6 ring-1 ring-rule">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="font-serif text-xl">
                    {i + 1}. {title}
                  </span>
                  <span className="text-xs uppercase tracking-[0.14em] text-muted">{kind}</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="withdraw" className="mt-16 scroll-mt-24">
          <h2 className="font-serif text-3xl">Withdraw or delete a contribution</h2>
          <p className="mt-2 max-w-2xl text-ink-soft">
            Send a request below; no account is needed. With your participant code we can find everything you shared.
            We delete the text, attachments, contact details and any published excerpt. Backups clear within 35 days.
          </p>
          <div className="mt-6">
            <WithdrawalForm />
          </div>
          <p className="mt-6 text-sm text-muted">
            The structured survey is hosted by Tally and covered by its own notice.
          </p>
        </section>
      </div>
    </>
  );
}
