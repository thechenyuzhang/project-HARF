"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { client, errorMessage, listAll, type Contact, type Testimony } from "@/lib/amplify";
import {
  EDITORIAL_STATUSES,
  FIRST_NOTICED_PROMPT,
  LANGUAGES,
  OPENING_QUESTION,
  THEMES,
  sameText,
  type EditorialStatus,
} from "@/lib/harf";
import { scoreThemes, matchThemes } from "@/lib/constellation";
import { MediaGallery } from "./media-gallery";
import { Badge, Notice, STATUS_LABEL, inputClass, primaryButton, secondaryButton } from "./ui";

const auth = { authMode: "userPool" } as const;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" });
}

async function fetchTestimonies() {
  const all = await listAll((nextToken) => client.models.Testimony.list({ ...auth, nextToken, limit: 200 }));
  return all.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function TestimonyReview() {
  const [items, setItems] = useState<Testimony[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<EditorialStatus | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(
    () =>
      fetchTestimonies()
        .then(setItems)
        .catch((e) => setError(e instanceof Error ? e.message : "Could not load testimonies.")),
    [],
  );

  useEffect(() => {
    fetchTestimonies()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load testimonies."));
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of items ?? []) c[t.editorialStatus] = (c[t.editorialStatus] ?? 0) + 1;
    return c;
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter(
      (t) =>
        (status === "ALL" || t.editorialStatus === status) &&
        (!q ||
          t.originalText.toLowerCase().includes(q) ||
          t.themes?.some((th) => th?.toLowerCase().includes(q)) ||
          t.fieldOfWork?.toLowerCase().includes(q)),
    );
  }, [items, status, query]);

  const selected = items?.find((t) => t.id === selectedId) ?? null;

  const replace = (updated: Testimony) => setItems((prev) => prev?.map((t) => (t.id === updated.id ? updated : t)) ?? null);
  const removed = (id: string) => {
    setItems((prev) => prev?.filter((t) => t.id !== id) ?? null);
    setSelectedId(null);
  };

  if (error) return <Notice kind="error">{error}</Notice>;
  if (!items) return <p className="text-muted">Loading testimonies…</p>;

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      <aside>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {(["ALL", ...EDITORIAL_STATUSES] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={`rounded-full border px-3 py-1 ${status === s ? "border-ink bg-ink text-paper" : "border-rule bg-card hover:border-ink"}`}
            >
              {s === "ALL" ? "All" : STATUS_LABEL[s]} {s === "ALL" ? items.length : (counts[s] ?? 0)}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search text, themes, field…"
          className={`${inputClass} mt-4`}
        />
        <ul className="mt-4 max-h-[70vh] divide-y divide-rule overflow-y-auto border-y border-rule">
          {visible.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(t.id);
                  // On phones the detail panel sits below the list.
                  if (window.matchMedia("(max-width: 1023px)").matches)
                    requestAnimationFrame(() => document.getElementById("testimony-detail")?.scrollIntoView({ behavior: "smooth" }));
                }}
                className={`block w-full px-3 py-3 text-left transition-colors ${t.id === selectedId ? "bg-card" : "hover:bg-paper-deep/60"}`}
              >
                <span className="flex items-center justify-between gap-2 text-xs text-muted">
                  <span>{formatDateTime(t.submittedAt)}</span>
                  <Badge
                    tone={
                      t.editorialStatus === "NEW"
                        ? "accent"
                        : t.editorialStatus === "PUBLISHED"
                          ? "ok"
                          : t.editorialStatus === "REJECTED"
                            ? "no"
                            : "neutral"
                    }
                  >
                    {STATUS_LABEL[t.editorialStatus]}
                  </Badge>
                </span>
                <span className="mt-1.5 line-clamp-2 block font-serif text-[0.95rem] leading-snug">{t.originalText}</span>
                <span className="mt-1.5 block text-xs text-muted">
                  {[
                    t.relationship,
                    t.fieldOfWork,
                    t.media?.length ? `${t.media.length} attachment${t.media.length > 1 ? "s" : ""}` : null,
                    t.synthetic ? "Synthetic" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
            </li>
          ))}
          {!visible.length ? <li className="px-3 py-6 text-sm text-muted">Nothing here.</li> : null}
        </ul>
        <button type="button" onClick={load} className="mt-3 text-xs text-muted underline hover:text-accent">
          Refresh
        </button>
      </aside>

      <section id="testimony-detail" className="scroll-mt-24">
        {selected ? (
          <TestimonyDetail
            key={selected.id}
            testimony={selected}
            onChange={replace}
            onRemoved={removed}
            onSelect={setSelectedId}
          />
        ) : (
          <p className="pt-10 text-muted">Select a testimony to review it.</p>
        )}
      </section>
    </div>
  );
}

function TestimonyDetail({
  testimony: t,
  onChange,
  onRemoved,
  onSelect,
}: {
  testimony: Testimony;
  onChange: (t: Testimony) => void;
  onRemoved: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const [status, setStatus] = useState<EditorialStatus>(t.editorialStatus);
  const [themes, setThemes] = useState<string[]>((t.themes ?? []).filter((x): x is string => !!x));
  const [notes, setNotes] = useState(t.editorNotes ?? "");
  const [excerpt, setExcerpt] = useState(t.excerptDraft ?? "");
  const [category, setCategory] = useState(t.relationship ?? "Participant");
  const [title, setTitle] = useState(t.title ?? "");
  const [body, setBody] = useState("");
  const [showCountry, setShowCountry] = useState(true);
  const [showAge, setShowAge] = useState(true);
  const [credit, setCredit] = useState(t.consentNamedCredit === true);
  const [featured, setFeatured] = useState(false);
  const [exactDate, setExactDate] = useState(t.consentNamedCredit === true);
  const [approvedEdits, setApprovedEdits] = useState(false);
  const [authorConfirmed, setAuthorConfirmed] = useState(false);
  const needsConfirmation = !!t.followUpOf && t.authorVerified !== true;
  const bodyEdited = !!body.trim() && !sameText(body, t.originalText);
  // Where the constellation matcher would place this testimony, for the editor to confirm or correct.
  const suggestion = useMemo(() => matchThemes(t.originalText), [t.originalText]);
  const evidence = useMemo(
    () => new Map(scoreThemes(t.originalText).map((m) => [m.theme as string, m.words.slice(0, 4).join(", ")])),
    [t.originalText],
  );
  const publicCountry = t.countryOfBirth || t.country;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [history, setHistory] = useState<Testimony[]>([]);

  useEffect(() => {
    client.models.Testimony.listTestimoniesByParticipant({ participantRef: t.participantRef }, auth).then(({ data }) =>
      setHistory(data ?? []),
    );
  }, [t.participantRef]);

  const dirty =
    status !== t.editorialStatus ||
    notes !== (t.editorNotes ?? "") ||
    excerpt !== (t.excerptDraft ?? "") ||
    themes.join("|") !== (t.themes ?? []).join("|");

  async function run(action: () => Promise<string>) {
    setBusy(true);
    setMessage(null);
    try {
      setMessage({ kind: "ok", text: await action() });
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    const { data } = await client.models.Testimony.get({ id: t.id }, auth);
    if (data) onChange(data);
  }

  const save = () =>
    run(async () => {
      // Rejecting or archiving a published story takes it out of the archive too.
      if (t.excerptId && (status === "REJECTED" || status === "ARCHIVED")) {
        const res = await client.mutations.unpublishExcerpt({ testimonyId: t.id }, auth);
        if (res.errors?.length) throw new Error(errorMessage(res.errors, "Could not unpublish."));
      }
      const { data, errors } = await client.models.Testimony.update(
        {
          id: t.id,
          editorialStatus: status,
          themes,
          editorNotes: notes || null,
          excerptDraft: excerpt || null,
          reviewedAt: new Date().toISOString(),
        },
        auth,
      );
      if (!data) throw new Error(errorMessage(errors, "Could not save."));
      onChange(data);
      return "Saved.";
    });

  const publish = () =>
    run(async () => {
      const { data, errors } = await client.mutations.publishExcerpt(
        {
          testimonyId: t.id,
          text: excerpt,
          themes,
          participantCategory: category,
          title: title || null,
          body: body || null,
          showCountry,
          showAge,
          credit,
          featured: t.excerptId ? undefined : featured,
          exactDate: credit || exactDate,
          authorApprovedEdits: bodyEdited ? approvedEdits : undefined,
          authorConfirmed: needsConfirmation ? authorConfirmed : undefined,
        },
        auth,
      );
      if (!data) throw new Error(errorMessage(errors, "Could not publish."));
      await refresh();
      setStatus("PUBLISHED");
      return t.excerptId ? "Published excerpt updated." : "Excerpt published to the archive.";
    });

  const unpublish = () =>
    run(async () => {
      const { errors } = await client.mutations.unpublishExcerpt({ testimonyId: t.id }, auth);
      if (errors?.length) throw new Error(errorMessage(errors, "Could not unpublish."));
      await refresh();
      setStatus(t.editorialStatus === "WITHDRAWN" ? "WITHDRAWN" : "APPROVED");
      return "Excerpt removed from the archive.";
    });

  const remove = () => {
    const confirmed = window.confirm(
      "Permanently delete this testimony, its contact details and any published excerpt? Use this for withdrawal requests. It cannot be undone (backups expire after 35 days).",
    );
    if (!confirmed) return;
    run(async () => {
      const { errors } = await client.mutations.removeTestimony({ testimonyId: t.id }, auth);
      if (errors?.length) throw new Error(errorMessage(errors, "Could not delete."));
      onRemoved(t.id);
      return "Deleted.";
    });
  };

  const revealContact = () =>
    run(async () => {
      if (!t.contactId) throw new Error("No contact details stored.");
      const { data } = await client.models.Contact.get({ id: t.contactId }, auth);
      if (!data) throw new Error("Contact record not found.");
      setContact(data);
      return "Contact details shown. Handle them confidentially.";
    });

  const language = LANGUAGES.find((l) => l.code === t.language)?.label ?? t.language;

  return (
    <article className="space-y-8">
      <header className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{formatDateTime(t.submittedAt)}</span>
        <span>·</span>
        <span className="font-mono">{t.id.slice(0, 8)}</span>
        {language ? <Badge>{language}</Badge> : null}
        <Badge>
          {t.channel === "WEEKLY_QUESTION" ? "Question of the Week" : t.channel === "REFLECTION" ? "Reflection" : "Open testimony"}
        </Badge>
        {t.followUpOf ? (
          <button type="button" onClick={() => onSelect(t.followUpOf!)} className="underline hover:text-accent">
            Open the original story
          </button>
        ) : null}
        {needsConfirmation ? <Badge tone="accent">Sent without a code · confirm with the author</Badge> : null}
        {t.synthetic ? <Badge tone="accent">Synthetic sample</Badge> : null}
        {(t.entryNumber ?? 1) > 1 || history.length > 1 ? (
          <Badge tone="accent">
            Entry {t.entryNumber} of {history.length} from this participant
          </Badge>
        ) : null}
      </header>

      {t.noticedChange ? (
        <div className="rounded-sm border border-rule bg-card p-5 text-sm">
          <p className="eyebrow mb-2">{OPENING_QUESTION}</p>
          <p className="font-serif text-lg">{t.noticedChange}</p>
          {t.firstNoticed ? (
            <>
              <p className="eyebrow mb-1 mt-4">{FIRST_NOTICED_PROMPT}</p>
              <p className="whitespace-pre-wrap font-serif text-base leading-relaxed">{t.firstNoticed}</p>
            </>
          ) : null}
        </div>
      ) : null}

      <div>
        {t.promptText ? (
          <p className="mb-3 font-serif text-lg italic text-accent">
            {t.promptText}
            {t.weeklyQuestionWeekOf ? (
              <span className="ml-2 font-sans text-xs not-italic text-muted">Question of the week, {t.weeklyQuestionWeekOf}</span>
            ) : null}
          </p>
        ) : null}
        <div className="rounded-sm border border-rule bg-card p-6">
          <p className="eyebrow mb-3">Original testimony · preserved, read-only</p>
          {t.title ? <p className="mb-3 font-serif text-2xl">{t.title}</p> : null}
          {t.creditName ? (
            <p className="mb-4 text-sm text-muted">
              {t.creditName}
              {t.creditLine ? ` · ${t.creditLine}` : ""}
            </p>
          ) : null}
          <p className="whitespace-pre-wrap font-serif text-lg leading-relaxed">{t.originalText}</p>
        </div>
      </div>

      {t.media?.length ? (
        <div>
          <p className="eyebrow mb-3">Attachments · {t.media.length}</p>
          <MediaGallery media={t.media.filter((m): m is NonNullable<typeof m> => !!m)} />
        </div>
      ) : null}

      {history.length > 1 ? (
        <div>
          <p className="eyebrow mb-2">Same participant over time</p>
          <ol className="space-y-1 text-sm">
            {[...history]
              .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
              .map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    disabled={h.id === t.id}
                    onClick={() => onSelect(h.id)}
                    className="text-left underline decoration-rule hover:text-accent disabled:no-underline disabled:opacity-60"
                  >
                    {formatDateTime(h.submittedAt)} — {h.originalText.slice(0, 80)}…
                  </button>
                </li>
              ))}
          </ol>
        </div>
      ) : null}

      <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
        <Meta label="Age range" value={t.ageRange} />
        <Meta label="Gender" value={t.gender === "Self-describe" ? t.genderSelfDescribed || "Self-described" : t.gender} />
        <Meta label="Academic stage" value={t.academicStage} />
        <Meta label="Country now" value={t.country} />
        <Meta label="Country of birth" value={t.countryOfBirth} />
        <Meta label="First language" value={t.firstLanguage} />
        <Meta label="Relationship" value={t.relationship} />
        <Meta label="Field" value={t.fieldOfWork} />
        <Meta label="Main AI tool" value={t.mainAiTool} />
        <Meta label="Other AI tools" value={(t.otherAiTools ?? []).filter(Boolean).join(", ")} />
        <Meta label="Using AI for" value={t.aiDuration} />
        <Meta label="AI use" value={t.aiUseFrequency} />
        <Meta label="Main uses" value={(t.aiUses ?? []).filter(Boolean).join(", ")} />
        <Meta
          label="Feelings"
          value={[...(t.feelings ?? []).filter((f) => f !== "Other"), t.feelingsOther].filter(Boolean).join(", ")}
        />
        <div>
          <dt className="text-xs text-muted">Consent ({t.consentVersion})</dt>
          <dd className="mt-1 flex flex-wrap gap-1">
            <Badge tone={t.consentResearch ? "ok" : "no"}>Research</Badge>
            <Badge tone={t.consentPublish ? "ok" : "no"}>Publish {t.consentPublish ? "✓" : "✗"}</Badge>
            <Badge tone={t.consentContact ? "ok" : "no"}>Contact {t.consentContact ? "✓" : "✗"}</Badge>
            {t.consentNamedCredit ? <Badge tone="ok">Named credit ✓</Badge> : null}
          </dd>
        </div>
      </dl>

      {t.contactId ? (
        <div className="text-sm">
          {contact ? (
            <p className="rounded-sm border border-rule bg-card px-4 py-3">
              {contact.name ? <strong>{contact.name} · </strong> : null}
              <a href={`mailto:${contact.email}`} className="underline">
                {contact.email}
              </a>
            </p>
          ) : (
            <button type="button" onClick={revealContact} disabled={busy} className={secondaryButton}>
              Reveal contact details
            </button>
          )}
        </div>
      ) : null}

      <div className="space-y-5 border-t border-ink pt-6">
        <p className="eyebrow">Editorial</p>
        <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as EditorialStatus)} className={inputClass}>
              {EDITORIAL_STATUSES.map((s) => (
                <option key={s} value={s} disabled={s === "PUBLISHED" && !t.excerptId}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="text-sm">
            <legend className="mb-1.5 font-medium">Themes · its constellations on the home page</legend>
            <div className="flex flex-wrap gap-1.5">
              {THEMES.map((th) => {
                const on = themes.includes(th);
                const suggested = suggestion.includes(th);
                return (
                  <button
                    key={th}
                    type="button"
                    aria-pressed={on}
                    title={evidence.get(th) ? `Matched: ${evidence.get(th)}` : undefined}
                    onClick={() => setThemes(on ? themes.filter((x) => x !== th) : [...themes, th])}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      on ? "border-ink bg-ink text-paper" : suggested ? "border-dashed border-accent bg-card" : "border-rule bg-card hover:border-ink"
                    }`}
                  >
                    {th}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">
              {suggestion.length ? (
                <>
                  Matcher suggests <strong>{suggestion.join(", ")}</strong> (dashed). Until you save themes, its star sits there.{" "}
                  {suggestion.join("|") !== themes.join("|") ? (
                    <button type="button" onClick={() => setThemes(suggestion)} className="underline hover:text-accent">
                      Use suggestion
                    </button>
                  ) : null}
                </>
              ) : (
                "The matcher found no clear theme; choose one so its star joins a constellation."
              )}
            </p>
          </fieldset>
        </div>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Editor notes (private)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
        </label>
      </div>

      <div className="space-y-4 border-t border-ink pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="eyebrow">Public excerpt</p>
          {t.excerptId ? (
            <span className="flex items-center gap-3">
              <FeatureToggle excerptId={t.excerptId} />
              <Badge tone="ok">Live in archive</Badge>
            </span>
          ) : null}
        </div>
        {!t.consentPublish ? (
          <Notice kind="error">The participant did not allow publication. This testimony can&apos;t be published.</Notice>
        ) : (
          <>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={5}
              placeholder="Select and anonymize a passage. Remove names, institutions and anything identifying."
              className={`${inputClass} font-serif text-base leading-relaxed`}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Title (optional)</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Public participant category</span>
                <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1.5 flex items-center justify-between font-medium">
                Full testimony (optional) · readable from its star
                <button type="button" onClick={() => setBody(t.originalText)} className="text-xs font-normal underline hover:text-accent">
                  Use the full text
                </button>
              </span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={body ? 10 : 3}
                placeholder="Leave empty to publish only the excerpt. Blank lines separate paragraphs; start a line with > for a pull quote."
                className={`${inputClass} font-serif text-base leading-relaxed`}
              />
            </label>
            <fieldset className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <legend className="mb-1.5 font-medium">Shown publicly with it</legend>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showCountry && !!publicCountry} disabled={!publicCountry} onChange={(e) => setShowCountry(e.target.checked)} className="size-4 accent-accent" />
                Country {publicCountry ? `(${publicCountry})` : "(none given)"}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showAge && !!t.ageRange} disabled={!t.ageRange} onChange={(e) => setShowAge(e.target.checked)} className="size-4 accent-accent" />
                Age range {t.ageRange ? `(${t.ageRange})` : "(none given)"}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={credit}
                  disabled={!t.consentNamedCredit}
                  onChange={(e) => setCredit(e.target.checked)}
                  className="size-4 accent-accent"
                />
                {t.consentNamedCredit ? `Name: ${t.creditName} (with exact date)` : "Name (no named-credit consent)"}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={credit || exactDate}
                  disabled={credit}
                  onChange={(e) => setExactDate(e.target.checked)}
                  className="size-4 accent-accent"
                />
                Exact date ({formatDay(t.submittedAt)})
              </label>
              {!t.excerptId ? (
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-4 accent-accent" />
                  Feature on the home page
                </label>
              ) : null}
            </fieldset>
            {needsConfirmation ? (
              <label className="flex items-start gap-2 rounded-sm border border-accent/40 bg-accent-soft px-4 py-3 text-sm">
                <input type="checkbox" checked={authorConfirmed} onChange={(e) => setAuthorConfirmed(e.target.checked)} className="mt-0.5 size-4 accent-accent" />
                I confirmed with the author (by the email above) that this reflection is theirs.
              </label>
            ) : null}
            {bodyEdited ? (
              <label className="flex items-start gap-2 rounded-sm border border-accent/40 bg-accent-soft px-4 py-3 text-sm">
                <input type="checkbox" checked={approvedEdits} onChange={(e) => setApprovedEdits(e.target.checked)} className="mt-0.5 size-4 accent-accent" />
                The full text differs from the original. The author has approved these edits.
              </label>
            ) : null}
            <p className="text-xs text-muted">
              Leave off anything that, with the text, would let someone recognise this person.
            </p>
          </>
        )}
      </div>

      {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}

      <div className="sticky bottom-0 flex flex-wrap gap-3 border-t border-rule bg-paper py-4">
        <button type="button" onClick={save} disabled={busy || !dirty} className={primaryButton}>
          Save
        </button>
        {t.consentPublish ? (
          <button type="button" onClick={publish} disabled={busy || !excerpt.trim() || status === "WITHDRAWN" || (bodyEdited && !approvedEdits) || (needsConfirmation && !authorConfirmed)} className={secondaryButton}>
            {t.excerptId ? "Update published excerpt" : "Approve & publish excerpt"}
          </button>
        ) : null}
        {t.excerptId ? (
          <button type="button" onClick={unpublish} disabled={busy} className={secondaryButton}>
            Unpublish
          </button>
        ) : null}
        <button type="button" onClick={remove} disabled={busy} className="ml-auto text-xs text-muted underline hover:text-accent">
          Delete permanently
        </button>
      </div>
    </article>
  );
}

/** Hand-pick a published excerpt for the homepage's "From the archive" section. */
function FeatureToggle({ excerptId }: { excerptId: string }) {
  const [featured, setFeatured] = useState<boolean | null>(null);

  useEffect(() => {
    client.models.Excerpt.get({ id: excerptId }, auth).then(({ data }) => setFeatured(data?.featured === true));
  }, [excerptId]);

  if (featured === null) return null;
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={featured}
        onChange={async (e) => {
          const next = e.target.checked;
          setFeatured(next);
          const { errors } = await client.models.Excerpt.update({ id: excerptId, featured: next }, auth);
          if (errors?.length) setFeatured(!next);
        }}
        className="size-4 accent-accent"
      />
      Feature on the home page
    </label>
  );
}

function Meta({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1">{value || <span className="text-muted">—</span>}</dd>
    </div>
  );
}
