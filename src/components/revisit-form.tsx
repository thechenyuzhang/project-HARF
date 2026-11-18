"use client";

import { Repeat, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { client, errorMessage } from "@/lib/amplify";
import {
  CONSENT_TEXT,
  CONSENT_VERSION,
  LIMITS,
  PARTICIPANT_CODE_PATTERN,
  normalizeParticipantCode,
} from "@/lib/harf";

const CODE_KEY = "harf.participantCode";

/** "Revisit this story": the original contributor adds a dated reflection. */
export function RevisitButton({ excerptId, title, className = "" }: { excerptId: string; title?: string | null; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-sm hover:underline ${className}`}
      >
        <Repeat aria-hidden className="size-4" /> Revisit this story
      </button>
      {open ? <RevisitDialog excerptId={excerptId} title={title} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function RevisitDialog({ excerptId, title, onClose }: { excerptId: string; title?: string | null; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [text, setText] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CODE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setCode(saved);
    } catch {
      /* storage unavailable */
    }
    textRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const normalized = normalizeParticipantCode(code);
  const length = text.trim().length;
  const hasCode = code.trim().length > 0;
  // A code proves it's you; without one, an email lets an editor confirm before publishing.
  const identified = hasCode ? PARTICIPANT_CODE_PATTERN.test(normalized) : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const ready = identified && length >= LIMITS.testimonyMin && consent && !busy;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const { data, errors } = await client.mutations.submitReflection({
        excerptId,
        participantCode: hasCode ? normalized : undefined,
        email: hasCode ? undefined : email.trim(),
        text,
        consent,
        consentVersion: CONSENT_VERSION,
        website: website || undefined,
      });
      if (!data) throw new Error(errorMessage(errors, "Something went wrong. Please try again."));
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-lg bg-paper p-6 text-ink shadow-xl sm:p-8"
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-full p-2 text-muted hover:bg-card hover:text-ink">
          <X className="size-5" />
        </button>
        <p className="eyebrow">Revisit this story</p>
        <h2 id={`${id}-title`} className="mt-2 pr-8 font-serif text-2xl leading-snug">
          {title || "What has changed since?"}
        </h2>

        {done ? (
          <p className="mt-6 font-serif text-lg leading-relaxed">
            Thank you. Your reflection will appear beneath your story, with its own date, once it has been reviewed.
          </p>
        ) : (
          <>
            <textarea
              ref={textRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              maxLength={LIMITS.testimonyMax}
              placeholder="What has changed since you first wrote this?"
              aria-label="Your reflection"
              className="mt-6 w-full resize-y rounded-lg border border-rule bg-card px-4 py-3 font-serif text-lg leading-relaxed placeholder:text-muted/70 focus:border-ink focus:outline-none"
            />
            <label className="mt-4 block text-sm">
              <span className="mb-1.5 block font-medium">
                Participant code <span className="font-normal text-muted">· if you have one</span>
              </span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="HARF-XXXX-XXXX-XXXX"
                autoComplete="off"
                className="w-full rounded-md border border-rule bg-card px-3 py-2.5 font-mono uppercase tracking-wider focus:border-ink focus:outline-none"
              />
            </label>
            {!hasCode ? (
              <label className="mt-4 block text-sm">
                <span className="mb-1.5 block font-medium">
                  Email <span className="font-normal text-muted">· so we can confirm it&apos;s you</span>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full rounded-md border border-rule bg-card px-3 py-2.5 focus:border-ink focus:outline-none"
                />
              </label>
            ) : null}
            <label className="mt-4 flex items-start gap-3 text-sm leading-relaxed text-ink-soft">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-accent" />
              {CONSENT_TEXT.reflection}
            </label>
            <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
            {error ? (
              <p role="alert" className="mt-4 rounded-sm border border-accent/40 bg-accent-soft px-4 py-3 text-sm">
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!ready}
                onClick={submit}
                className="rounded-full bg-accent px-7 py-3 text-sm font-medium text-card transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/25"
              >
                {busy ? "Sending…" : "Add reflection"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
