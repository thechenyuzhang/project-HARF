"use client";

import {
  ChevronDown,
  Database,
  Eye,
  Lightbulb,
  Mail,
  PenLine,
  ShieldCheck,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { MediaPicker } from "./media-picker";
import { StoryAnalysis, type OwnAnswers } from "./story-analysis";
import { uploadData } from "aws-amplify/storage";
import { ContributionThanks } from "@/components/contribution-thanks";
import { track } from "@/lib/analytics";
import { client, errorMessage, type WeeklyQuestion } from "@/lib/amplify";
import { countryNames } from "@/lib/countries";
import {
  ACADEMIC_STAGES,
  AGE_RANGES,
  AI_DURATIONS,
  AI_TOOLS,
  AI_USES,
  AI_USE_FREQUENCIES,
  GENDERS,
  CONSENT_TEXT,
  CONSENT_VERSION,
  FEELINGS,
  LIMITS,
  FIRST_NOTICED_PROMPT,
  MAIN_PROMPT,
  NOTICED_CHANGE,
  OPENING_QUESTION,
  OPTIONAL_PROMPTS,
  PARTICIPANT_CODE_PATTERN,
  RELATIONSHIPS,
  normalizeParticipantCode,
} from "@/lib/harf";

const DRAFT_KEY = "harf.draft";
const CODE_KEY = "harf.participantCode";

function readStorage(key: string, storage: () => Storage = () => window.localStorage) {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string | null, storage: () => Storage = () => window.localStorage) {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    /* storage unavailable: drafts simply aren't kept */
  }
}
const session = () => window.sessionStorage;

type Step = "write" | "context" | "consent" | "done";
const STEPS: { id: Step; label: string; icon: LucideIcon }[] = [
  { id: "write", label: "Your story", icon: PenLine },
  { id: "context", label: "Context", icon: UserRound },
  { id: "consent", label: "Your choices", icon: ShieldCheck },
];

export function ShareFlow() {
  const params = useSearchParams();
  const weeklyId = params.get("weekly");

  const [step, setStep] = useState<Step>("write");
  const [weekly, setWeekly] = useState<WeeklyQuestion | null>(null);

  // Step 1
  const [text, setText] = useState("");
  const [promptId, setPromptId] = useState<string | null>(null);
  const promptsRef = useRef<HTMLDetailsElement>(null);
  const [returning, setReturning] = useState(false);
  const [code, setCode] = useState("");

  // Step 2
  const [relationship, setRelationship] = useState("");
  const [fieldOfWork, setFieldOfWork] = useState("");
  const [country, setCountry] = useState("");
  const [frequency, setFrequency] = useState("");
  const [feelings, setFeelings] = useState<string[]>([]);
  const [feelingsOther, setFeelingsOther] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [gender, setGender] = useState("");
  const [genderSelfDescribed, setGenderSelfDescribed] = useState("");
  const [countryOfBirth, setCountryOfBirth] = useState("");
  const [firstLanguage, setFirstLanguage] = useState("");
  const [academicStage, setAcademicStage] = useState("");
  const [mainAiTool, setMainAiTool] = useState("");
  const [otherAiTools, setOtherAiTools] = useState<string[]>([]);
  const [aiDuration, setAiDuration] = useState("");
  const [aiUses, setAiUses] = useState<string[]>([]);
  const countries = useMemo(() => countryNames(), []);

  // Step 3
  const [consentResearch, setConsentResearch] = useState(false);
  const [consentPublish, setConsentPublish] = useState(false);
  const [consentContact, setConsentContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [noticedChange, setNoticedChange] = useState("");
  const [firstNoticed, setFirstNoticed] = useState("");
  const started = useRef(false);
  // Counts one "story started" per visit, on the first answer or keystroke.
  const markStarted = () => {
    if (started.current) return;
    started.current = true;
    track("story_start", weekly ? "weekly" : "open");
  };

  // Restore browser-only state after hydration (the page is statically rendered).
  useEffect(() => {
    const draft = readStorage(DRAFT_KEY, session);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (draft) setText(draft);
    const saved = readStorage(CODE_KEY);
    if (saved) {
      setCode(saved);
      setReturning(true);
    }
  }, []);

  useEffect(() => {
    writeStorage(DRAFT_KEY, text || null, session);
  }, [text]);

  useEffect(() => {
    if (!weeklyId) return;
    client.models.WeeklyQuestion.get({ id: weeklyId })
      .then(({ data }) => setWeekly(data ?? null))
      .catch(() => setWeekly(null));
  }, [weeklyId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const textLength = text.trim().length;
  const codeValid = !returning || PARTICIPANT_CODE_PATTERN.test(normalizeParticipantCode(code));
  const canContinue = textLength >= LIMITS.testimonyMin && textLength <= LIMITS.testimonyMax && codeValid;
  const activePrompt = weekly ? weekly.question : OPTIONAL_PROMPTS.find((p) => p.id === promptId)?.text;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      // Files are uploaded only now, after consent. The server checks them and
      // moves them somewhere only editors can read.
      const mediaKeys: string[] = [];
      for (const [i, file] of files.entries()) {
        setUploadStatus(`Uploading ${i + 1} of ${files.length}…`);
        const name = file.name.replace(/[^A-Za-z0-9._-]+/g, "-").slice(-100) || "file";
        const { path } = await uploadData({
          path: `uploads/${crypto.randomUUID()}/${name}`,
          data: file,
          options: { contentType: file.type },
        }).result;
        mediaKeys.push(path);
      }
      setUploadStatus(files.length ? "Saving…" : null);
      const { data, errors } = await client.mutations.submitTestimony({
        text,
        channel: weekly ? "WEEKLY_QUESTION" : "OPEN",
        promptId: weekly ? undefined : (promptId ?? undefined),
        weeklyQuestionId: weekly?.id,
        participantCode: returning ? normalizeParticipantCode(code) : undefined,
        relationship: relationship || undefined,
        fieldOfWork: fieldOfWork || undefined,
        country: country || undefined,
        aiUseFrequency: frequency || undefined,
        countryOfBirth: countryOfBirth || undefined,
        ageRange: ageRange || undefined,
        gender: gender || undefined,
        genderSelfDescribed: gender === "Self-describe" ? genderSelfDescribed || undefined : undefined,
        firstLanguage: firstLanguage || undefined,
        academicStage: academicStage || undefined,
        mainAiTool: mainAiTool || undefined,
        otherAiTools: mainAiTool === "I don't use AI" ? [] : otherAiTools.filter((t) => t !== mainAiTool),
        aiDuration: aiDuration || undefined,
        aiUses,
        feelings,
        feelingsOther: feelings.includes("Other") ? feelingsOther || undefined : undefined,
        consentResearch,
        consentPublish,
        consentContact,
        consentVersion: CONSENT_VERSION,
        contactName: consentContact ? contactName || undefined : undefined,
        contactEmail: consentContact ? contactEmail || undefined : undefined,
        noticedChange: weekly ? undefined : noticedChange || undefined,
        firstNoticed: weekly || !noticedChange ? undefined : firstNoticed || undefined,
        mediaKeys,
        website: website || undefined,
      });
      if (!data) throw new Error(errorMessage(errors, "Something went wrong. Please try again."));
      setResult({
        testimonyId: data.testimonyId,
        participantCode: data.participantCode,
        entryNumber: data.entryNumber,
      });
      track("story_submit", weekly ? "weekly" : "open");
      writeStorage(DRAFT_KEY, null, session);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setUploadStatus(null);
    }
  }

  if (step === "done" && result) {
    return (
      <Done
        result={result}
        text={text}
        answers={{ feelings, aiUseFrequency: frequency, mainAiTool, noticedChange }}
      />
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-10 pt-12 sm:pt-16">
      <ol className="mb-12 flex items-center gap-2 text-sm" aria-label="Progress">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const reached = i <= stepIndex;
          return (
            <li
              key={s.id}
              aria-current={i === stepIndex ? "step" : undefined}
              className="flex flex-1 items-center gap-2"
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                  reached ? "bg-accent text-card" : "bg-card text-muted ring-1 ring-rule"
                }`}
              >
                <Icon aria-hidden className="size-4" />
              </span>
              <span className={`hidden sm:inline ${reached ? "text-ink" : "text-muted"}`}>{s.label}</span>
              {i < STEPS.length - 1 ? (
                <span aria-hidden className={`h-px flex-1 ${i < stepIndex ? "bg-accent" : "bg-rule"}`} />
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="-mt-8 mb-8 text-sm text-muted sm:hidden">
        Step {stepIndex + 1} of {STEPS.length} · {STEPS[stepIndex].label}
      </p>

      {step === "write" && (
        <section>
          {weekly ? (
            <>
              <p className="eyebrow">The Question of the Week</p>
              <h1 className="mt-4 font-serif text-3xl leading-tight sm:text-5xl">{weekly.question}</h1>
              {weekly.introduction ? <p className="mt-4 text-ink-soft">{weekly.introduction}</p> : null}
              <Link href="/share/" className="mt-3 inline-block text-sm text-muted underline hover:text-accent">
                Or share something else
              </Link>
            </>
          ) : (
            <>
              <p className="eyebrow">Share your experience</p>
              <h1 className="mt-4 font-serif text-3xl leading-tight sm:text-5xl">{OPENING_QUESTION}</h1>
              <div role="radiogroup" aria-label={OPENING_QUESTION} className="mt-8 grid gap-2 sm:grid-cols-2">
                {NOTICED_CHANGE.map((option) => {
                  const selected = noticedChange === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        markStarted();
                        setNoticedChange(selected ? "" : option);
                      }}
                      className={`min-h-12 rounded-lg px-4 py-3 text-left font-serif text-lg ring-1 transition-colors ${
                        selected ? "bg-navy text-card ring-navy" : "bg-card ring-rule hover:ring-ink"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {noticedChange ? (
                <label className="mt-6 block">
                  <span className="mb-2 block font-serif text-xl">{FIRST_NOTICED_PROMPT}</span>
                  <textarea
                    value={firstNoticed}
                    onChange={(e) => setFirstNoticed(e.target.value)}
                    rows={3}
                    maxLength={5000}
                    placeholder="Optional"
                    className="w-full resize-y rounded-lg border border-rule bg-card px-4 py-3 font-serif text-lg leading-relaxed placeholder:text-muted/70 focus:border-ink focus:outline-none focus-visible:outline-none"
                  />
                </label>
              ) : null}

              <h2 className="mt-12 font-serif text-2xl leading-snug sm:text-3xl">{MAIN_PROMPT}</h2>
              <p className="mt-3 text-muted">
                A concrete moment matters more than a general opinion. Any language, any length.
              </p>
              <details ref={promptsRef} className="group mt-8 rounded-lg bg-card ring-1 ring-rule">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-sm">
                  <Lightbulb aria-hidden className="size-5 text-accent" />
                  <span className="flex-1">Need a prompt?</span>
                  <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
                </summary>
                <ul className="space-y-1 px-3 pb-4">
                  {OPTIONAL_PROMPTS.map((p) => {
                    const selected = promptId === p.id;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setPromptId(selected ? null : p.id);
                            // Close the list once a prompt is chosen; it shows above the text box.
                            if (!selected && promptsRef.current) promptsRef.current.open = false;
                          }}
                          className={`w-full rounded px-3 py-2 text-left font-serif text-lg transition-colors ${
                            selected ? "bg-accent-soft text-ink" : "text-ink-soft hover:bg-paper"
                          }`}
                        >
                          {p.text}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </>
          )}

          <label className="mt-10 block">
            {activePrompt && !weekly ? (
              <span className="mb-3 block font-serif text-lg italic text-accent">{activePrompt}</span>
            ) : (
              <span className="sr-only">Your testimony</span>
            )}
            <textarea
              value={text}
              onChange={(e) => {
                markStarted();
                setText(e.target.value);
              }}
              rows={8}
              maxLength={LIMITS.testimonyMax}
              placeholder="Start writing…"
              className="w-full resize-y rounded-lg border border-rule bg-card sm:min-h-80 px-5 py-4 font-serif text-lg leading-relaxed placeholder:text-muted/70 focus:border-ink focus:outline-none focus-visible:outline-none"
            />
          </label>
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>Saved in this browser tab until you submit.</span>
            <span>
              {textLength < LIMITS.testimonyMin
                ? `${LIMITS.testimonyMin - textLength} more characters to continue`
                : `${textLength.toLocaleString()} characters`}
            </span>
          </div>

          <div className="mt-8">
            <MediaPicker files={files} onChange={setFiles} />
          </div>

          <div className="mt-8">
            <div>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={returning}
                  onChange={(e) => setReturning(e.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-accent"
                />
                <span>
                  I have a participant code
                  <span className="block text-muted">Links this to your earlier stories.</span>
                </span>
              </label>
              {returning ? (
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="HARF-XXXX-XXXX-XXXX"
                  aria-label="Participant code"
                  className={`${inputClass} mt-3 font-mono uppercase tracking-wider`}
                />
              ) : null}
              {returning && code && !codeValid ? (
                <p className="mt-2 text-xs text-accent">Codes look like HARF-7K2M-QX9D-4TPA.</p>
              ) : null}
            </div>
          </div>

          <Nav>
            <span />
            <button type="button" disabled={!canContinue} onClick={() => setStep("context")} className={primaryButton}>
              Continue
            </button>
          </Nav>
        </section>
      )}

      {step === "context" && (
        <section>
          <h1 className="font-serif text-3xl leading-tight sm:text-4xl">A little context</h1>
          <p className="mt-3 text-muted">All optional. Skip anything. No names.</p>

          <Section icon={UserRound} title="About you">
            <ChipGroup label="Age range" options={AGE_RANGES} value={ageRange} onChange={setAgeRange} />
            <div>
              <ChipGroup label="Gender" options={GENDERS} value={gender} onChange={setGender} />
              {gender === "Self-describe" ? (
                <input
                  value={genderSelfDescribed}
                  onChange={(e) => setGenderSelfDescribed(e.target.value)}
                  maxLength={LIMITS.shortField}
                  placeholder="In your own words"
                  aria-label="Gender, self-described"
                  className={`${inputClass} mt-3 max-w-sm`}
                />
              ) : null}
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Which country are you in right now?">
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  list="harf-countries"
                  maxLength={LIMITS.shortField}
                  autoComplete="off"
                  className={inputClass}
                />
              </Field>
              <Field label="Country of birth">
                <input
                  value={countryOfBirth}
                  onChange={(e) => setCountryOfBirth(e.target.value)}
                  list="harf-countries"
                  maxLength={LIMITS.shortField}
                  autoComplete="off"
                  className={inputClass}
                />
              </Field>
              <Field label="First language (or languages)">
                <input
                  value={firstLanguage}
                  onChange={(e) => setFirstLanguage(e.target.value)}
                  maxLength={LIMITS.shortField}
                  placeholder="Portuguese, English"
                  className={inputClass}
                />
              </Field>
              <Field label="Academic stage">
                <select value={academicStage} onChange={(e) => setAcademicStage(e.target.value)} className={inputClass}>
                  <option value="">Prefer not to say</option>
                  {ACADEMIC_STAGES.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </Field>
              <Field label="Field of study or work">
                <input
                  value={fieldOfWork}
                  onChange={(e) => setFieldOfWork(e.target.value)}
                  maxLength={LIMITS.shortField}
                  placeholder="Philosophy, Nursing, Software"
                  className={inputClass}
                />
              </Field>
            </div>
            <ChipGroup
              label="Your relationship with AI"
              options={RELATIONSHIPS}
              value={relationship}
              onChange={setRelationship}
            />
            <datalist id="harf-countries">
              {countries.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Section>

          <Section icon={Sparkles} title="Your AI use">
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Your main AI tool">
                <select value={mainAiTool} onChange={(e) => setMainAiTool(e.target.value)} className={inputClass}>
                  <option value="">Prefer not to say</option>
                  {AI_TOOLS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="How often do you use AI?">
                <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={inputClass}>
                  <option value="">Prefer not to say</option>
                  {AI_USE_FREQUENCIES.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </Field>
            </div>
            {mainAiTool !== "I don't use AI" ? (
              <ChipGroup
                label="Other AI tools you use (choose any)"
                options={AI_TOOLS.filter((t) => t !== mainAiTool && t !== "I don't use AI")}
                values={otherAiTools}
                onToggle={setOtherAiTools}
              />
            ) : null}
            <ChipGroup
              label="How long have you used AI tools?"
              options={AI_DURATIONS}
              value={aiDuration}
              onChange={setAiDuration}
            />
            <ChipGroup
              label="What do you mainly use AI for? (choose any)"
              options={AI_USES}
              values={aiUses}
              onToggle={setAiUses}
            />
            <div>
              <ChipGroup
                label="How do you feel about AI? (choose any)"
                options={FEELINGS}
                values={feelings}
                onToggle={setFeelings}
              />
              {feelings.includes("Other") ? (
                <input
                  value={feelingsOther}
                  onChange={(e) => setFeelingsOther(e.target.value)}
                  maxLength={LIMITS.shortField}
                  placeholder="In your own words"
                  aria-label="Other feeling"
                  className={`${inputClass} mt-3 max-w-sm`}
                />
              ) : null}
            </div>
          </Section>

          <Nav>
            <button type="button" onClick={() => setStep("write")} className={secondaryButton}>
              Back
            </button>
            <button type="button" onClick={() => setStep("consent")} className={primaryButton}>
              Continue
            </button>
          </Nav>
        </section>
      )}

      {step === "consent" && (
        <section>
          <h1 className="font-serif text-3xl leading-tight sm:text-4xl">How may we use it?</h1>
          <p className="mt-3 text-muted">
            Only the first is required.{" "}
            <Link href="/privacy/" target="_blank" className="underline hover:text-accent">
              Privacy notice
            </Link>
          </p>

          <div className="mt-10 space-y-4">
            <Consent
              checked={consentResearch}
              onChange={setConsentResearch}
              title="Store and analyze my contribution"
              icon={Database}
              required
            >
              {CONSENT_TEXT.research}
            </Consent>
            <Consent
              checked={consentPublish}
              onChange={setConsentPublish}
              title="Publish an anonymized excerpt"
              icon={Eye}
            >
              {CONSENT_TEXT.publish}
            </Consent>
            <Consent
              checked={consentContact}
              onChange={setConsentContact}
              title="Contact me for an interview"
              icon={Mail}
            >
              {CONSENT_TEXT.contact}
            </Consent>
            {consentContact ? (
              <div className="grid gap-4 rounded-lg bg-card p-5 ring-1 ring-rule sm:grid-cols-2">
                <Field label="Email">
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    autoComplete="email"
                    className={inputClass}
                  />
                </Field>
                <Field label="Name or initials (optional)">
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    maxLength={LIMITS.shortField}
                    className={inputClass}
                  />
                </Field>
              </div>
            ) : null}
          </div>

          {/* Honeypot for automated spam; hidden from people and assistive tech. */}
          <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
          </div>

          {error ? (
            <p role="alert" className="mt-6 rounded-sm border border-accent/40 bg-accent-soft px-4 py-3 text-sm">
              {error}
            </p>
          ) : null}

          <Nav>
            <button type="button" onClick={() => setStep("context")} className={secondaryButton}>
              Back
            </button>
            <button
              type="button"
              disabled={!consentResearch || submitting || (consentContact && !contactEmail.trim())}
              onClick={submit}
              className={primaryButton}
            >
              {submitting ? (uploadStatus ?? "Submitting…") : "Submit testimony"}
            </button>
          </Nav>
          <p className="mt-4 text-right text-xs text-muted">Consent version {CONSENT_VERSION}</p>
        </section>
      )}
    </div>
  );
}

type Result = { testimonyId: string; participantCode: string; entryNumber: number };

function Done({ result, text, answers }: { result: Result; text: string; answers: OwnAnswers }) {
  const [copied, setCopied] = useState(false);
  const [remembered, setRemembered] = useState(false);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-10 pt-16 sm:pt-24">
      <ContributionThanks source="story" testimonyId={result.testimonyId} participantCode={result.participantCode}>
        <div className="mt-10 rounded-lg bg-card p-6 shadow-sm ring-1 ring-rule sm:p-8">
          <p className="eyebrow">Your private participant code</p>
          <p className="mt-3 select-all break-all font-mono text-2xl tracking-wider sm:text-3xl">
            {result.participantCode}
          </p>
          <p className="mt-4 text-sm text-ink-soft">
            {result.entryNumber > 1
              ? `This is your ${ordinal(result.entryNumber)} contribution, linked to your earlier ones. `
              : ""}
            Use this code whenever you share again, so your stories stay connected without your name. We can&apos;t
            recover it for you.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className={secondaryButton}
              onClick={() => {
                navigator.clipboard?.writeText(result.participantCode).then(() => setCopied(true));
              }}
            >
              {copied ? "Copied" : "Copy code"}
            </button>
            <button
              type="button"
              className={secondaryButton}
              disabled={remembered}
              onClick={() => {
                writeStorage(CODE_KEY, result.participantCode);
                setRemembered(true);
              }}
            >
              {remembered ? "Remembered on this device" : "Remember on this device"}
            </button>
          </div>
        </div>
        <StoryAnalysis
          text={text}
          answers={answers}
          participantCode={result.participantCode}
          entryNumber={result.entryNumber}
        />
      </ContributionThanks>
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const inputClass =
  "w-full rounded-md border border-rule bg-card px-3 py-2.5 text-base focus:border-ink focus:outline-none";
const primaryButton =
  "rounded-full bg-accent px-7 py-3 text-sm font-medium text-card transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/25";
const secondaryButton =
  "rounded-full px-6 py-2.5 text-sm font-medium ring-1 ring-ink transition-colors hover:bg-ink hover:text-card disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-ink";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-10 rounded-full border px-4 py-1.5 text-sm transition-colors ${
        selected ? "border-navy bg-navy text-card" : "border-rule bg-card hover:border-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="mt-10 rounded-lg bg-card p-5 ring-1 ring-rule sm:p-7">
      <h2 className="flex items-center gap-3 font-serif text-2xl">
        <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon aria-hidden className="size-4" />
        </span>
        {title}
      </h2>
      <div className="mt-6 space-y-7">{children}</div>
    </section>
  );
}

/** A row of chips: single choice with value/onChange, multiple with values/onToggle. */
function ChipGroup({
  label,
  options,
  value,
  onChange,
  values,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  value?: string;
  onChange?: (v: string) => void;
  values?: string[];
  onToggle?: (v: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const selected = values ? values.includes(o) : value === o;
          return (
            <Chip
              key={o}
              selected={selected}
              onClick={() =>
                values && onToggle
                  ? onToggle(selected ? values.filter((x) => x !== o) : [...values, o])
                  : onChange?.(selected ? "" : o)
              }
            >
              {o}
            </Chip>
          );
        })}
      </div>
    </fieldset>
  );
}

function Consent({
  checked,
  onChange,
  title,
  icon: Icon,
  required,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  icon: LucideIcon;
  required?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer gap-4 rounded-lg bg-card p-5 ring-1 transition-shadow ${
        checked ? "shadow-sm ring-accent" : "ring-rule hover:ring-ink/40"
      }`}
    >
      <span
        className={`hidden size-10 shrink-0 items-center justify-center rounded-full sm:flex ${
          checked ? "bg-accent text-card" : "bg-accent-soft text-accent"
        }`}
      >
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="flex-1">
        <span className="block font-medium">
          {title}
          <span className="ml-2 text-xs uppercase tracking-[0.12em] text-muted">
            {required ? "Required" : "Optional"}
          </span>
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-muted">{children}</span>
      </span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-5 shrink-0 accent-accent"
      />
    </label>
  );
}

function Nav({ children }: { children: ReactNode }) {
  return <div className="mt-12 flex items-center justify-between gap-4 border-t border-rule pt-6">{children}</div>;
}
