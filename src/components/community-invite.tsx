"use client";

import { PenLine, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { client, errorMessage } from "@/lib/amplify";
import { CONSENT_TEXT, CONSENT_VERSION } from "@/lib/harf";

/**
 * Asks for an email to join the HARF community, and invites the person to share
 * a story too. Used on the survey page and after the survey is submitted.
 */
export function CommunityInvite({ afterSurvey = false }: { afterSurvey?: boolean }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [revisit, setRevisit] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setState("saving");
    setError(null);
    try {
      const base = { email, consent: true, consentVersion: CONSENT_VERSION, source: "survey" };
      const { data, errors } = await client.mutations.requestRevisit({ ...base, purpose: "COMMUNITY" });
      if (!data) throw new Error(errorMessage(errors, "Something went wrong. Please try again."));
      track("community_join", afterSurvey ? "survey_done" : "survey_page");
      if (revisit) {
        const again = await client.mutations.requestRevisit(base);
        if (!again.data) throw new Error(errorMessage(again.errors, "Something went wrong. Please try again."));
        track("followup_optin", "survey");
      }
      setState("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setState("idle");
    }
  }

  return (
    <section
      aria-labelledby="community-invite"
      className="mt-10 rounded-lg bg-card p-6 shadow-sm ring-1 ring-rule sm:p-8"
    >
      <div className="flex items-start gap-4">
        <span className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent sm:flex">
          <Users aria-hidden className="size-5" />
        </span>
        <div className="flex-1">
          <h2 id="community-invite" className="font-serif text-2xl">
            {afterSurvey ? "Join the HARF community" : "Stay in touch: join the HARF community"}
          </h2>
          <p className="mt-2 text-ink-soft">
            Leave your email to hear what we learn, get the Question of the Week, and be invited to add your own story
            to the archive.
          </p>

          {state === "saved" ? (
            <p role="status" className="mt-5 rounded-md bg-ok/10 px-4 py-3 text-sm text-ok">
              Welcome to the community. We&apos;ll be in touch{revisit ? ", and write again in about six months" : ""}.
            </p>
          ) : (
            <>
              <label className="mt-5 block max-w-md">
                <span className="mb-2 block text-sm font-medium">Email</span>
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
                <span className="text-ink-soft">{CONSENT_TEXT.community}</span>
              </label>
              {afterSurvey ? (
                <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={revisit}
                    onChange={(e) => setRevisit(e.target.checked)}
                    className="mt-0.5 size-5 shrink-0 accent-accent"
                  />
                  <span className="text-ink-soft">
                    Optional: {CONSENT_TEXT.revisit}
                  </span>
                </label>
              ) : null}
              {error ? (
                <p role="alert" className="mt-3 text-sm text-accent">
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                onClick={join}
                disabled={!email.trim() || !consent || state === "saving"}
                className="mt-5 min-h-10 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-card transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/25"
              >
                {state === "saving" ? "Joining…" : "Join the community"}
              </button>
            </>
          )}

          <div className="mt-8 border-t border-rule pt-6">
            <p className="font-serif text-xl">Have a story the questions didn&apos;t capture?</p>
            <p className="mt-1 text-sm text-ink-soft">
              Tell us in your own words. It takes a few minutes, and you choose whether it may ever be published.
            </p>
            <Link
              href="/share/"
              data-track="share_click"
              data-track-from={afterSurvey ? "survey_done_invite" : "survey_invite"}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-card transition-colors hover:bg-ink"
            >
              <PenLine aria-hidden className="size-4" />
              Share your story
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
