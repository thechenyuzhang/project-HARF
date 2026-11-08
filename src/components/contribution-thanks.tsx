"use client";

import { CalendarClock, CheckCircle2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { track } from "@/lib/analytics";
import { client, errorMessage } from "@/lib/amplify";
import { CONSENT_TEXT, CONSENT_VERSION, REFLECTION } from "@/lib/harf";
import { CircleLink } from "./circle-link";
import { CommunityInvite } from "./community-invite";

/**
 * Shown after a story or a survey: thanks, one reflection to take away, and an
 * optional invitation to come back in six months.
 */
export function ContributionThanks({
  source,
  testimonyId,
  participantCode,
  children,
}: {
  source: "story" | "survey";
  testimonyId?: string;
  participantCode?: string;
  /** Extra content between the reflection and the follow-up (the participant code). */
  children?: ReactNode;
}) {
  return (
    <div>
      <CheckCircle2 aria-hidden className="size-12 text-accent" strokeWidth={1.5} />
      <h1 className="mt-6 font-serif text-4xl leading-tight sm:text-5xl">Thank you for contributing to HARF.</h1>
      <div className="mt-5 max-w-2xl space-y-3 text-lg leading-relaxed text-ink-soft">
        <p>Your experience is now part of a growing record of how people are living through the AI transition.</p>
        <p>What feels ordinary today may help us understand this moment differently in the future.</p>
      </div>

      <figure className="mt-12 rounded-lg bg-navy px-7 py-10 text-card sm:px-12">
        <p className="text-xs uppercase tracking-[0.18em] text-card/60">Something to think about</p>
        <blockquote className="mt-4 font-serif text-2xl leading-snug sm:text-3xl">{REFLECTION}</blockquote>
      </figure>

      {children}

      {source === "survey" ? (
        <CommunityInvite afterSurvey />
      ) : (
        <RevisitInvitation source={source} testimonyId={testimonyId} participantCode={participantCode} />
      )}

      <div className="mt-12 flex flex-wrap gap-6 text-sm">
        <CircleLink href="/archive/">Explore the archive</CircleLink>
        {source === "story" ? (
          <CircleLink href="/survey/">Take the survey too</CircleLink>
        ) : (
          <CircleLink href="/share/">Share a story too</CircleLink>
        )}
      </div>
    </div>
  );
}

function RevisitInvitation({
  source,
  testimonyId,
  participantCode,
}: {
  source: "story" | "survey";
  testimonyId?: string;
  participantCode?: string;
}) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setState("saving");
    setError(null);
    try {
      const { data, errors } = await client.mutations.requestRevisit({
        email,
        consent,
        consentVersion: CONSENT_VERSION,
        source,
        testimonyId,
        participantCode,
      });
      if (!data) throw new Error(errorMessage(errors, "Something went wrong. Please try again."));
      track("followup_optin", source);
      setState("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setState("idle");
    }
  }

  return (
    <section className="mt-10 rounded-lg bg-card p-6 shadow-sm ring-1 ring-rule sm:p-8">
      <div className="flex items-start gap-4">
        <span className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent sm:flex">
          <CalendarClock aria-hidden className="size-5" />
        </span>
        <div className="flex-1">
          <h2 className="font-serif text-2xl">Would you like to revisit your answers in six months?</h2>
          <p className="mt-2 text-ink-soft">
            Your relationship with AI may change. We would love to invite you back to reflect on what has changed — and
            what hasn&apos;t.
          </p>

          {state === "saved" ? (
            <p role="status" className="mt-5 rounded-md bg-ok/10 px-4 py-3 text-sm text-ok">
              Thank you. We&apos;ll write to you in about six months.
            </p>
          ) : (
            <>
              <label className="mt-5 block max-w-md">
                <span className="mb-2 block text-sm font-medium">Email (optional)</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.org"
                  className="w-full rounded-md border border-rule bg-card px-3 py-2.5 text-base focus:border-ink focus:outline-none"
                />
              </label>
              <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-accent"
                />
                <span className="text-ink-soft">{CONSENT_TEXT.revisit}</span>
              </label>
              {error ? (
                <p role="alert" className="mt-3 text-sm text-accent">
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                onClick={save}
                disabled={!email.trim() || !consent || state === "saving"}
                className="mt-5 min-h-10 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-card transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/25"
              >
                {state === "saving" ? "Saving…" : "Invite me back"}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
