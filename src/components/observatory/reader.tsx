"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { RevisitButton } from "@/components/revisit-form";
import { formatDate, type Story } from "./stories";

/** One line of facts under a testimony: role, country, age, date. */
export function StoryMeta({ story, className = "text-white/55" }: { story: Story; className?: string }) {
  const bits = [story.role, story.country, story.ageRange, formatDate(story)].filter(Boolean);
  return (
    <p className={`text-xs tracking-wide ${className}`}>
      {bits.join(" · ")}
      {story.synthetic ? " · Fictional sample" : ""}
    </p>
  );
}

/**
 * The full testimony. Blank lines separate paragraphs; "> " marks a pull
 * quote; a short line without a full stop is a section heading.
 */
function Body({ text }: { text: string }) {
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        if (block.startsWith(">")) {
          return (
            <blockquote key={i} className="my-8 border-l-2 border-accent pl-6 font-serif text-2xl italic leading-snug text-ink">
              {block.replace(/^>\s?/gm, "")}
            </blockquote>
          );
        }
        if (block.length < 70 && !/[.!?:;”"…]$/.test(block) && !block.includes("\n")) {
          return (
            <h3 key={i} className="pt-6 font-serif text-2xl text-ink">
              {block}
            </h3>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {block}
          </p>
        );
      })}
    </div>
  );
}

/** Reading a story: the same paper page as the Living Archive, opened over the sky. */
export function Reader({ story, onClose }: { story: Story; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus();
    };
  }, [onClose]);

  const long = !!story.body;

  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-night-deep/75 backdrop-blur-sm" onClick={onClose}>
      <article
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-title"
        onClick={(e) => e.stopPropagation()}
        className="observatory-rise relative my-0 w-full max-w-2xl self-start bg-paper px-6 pb-20 pt-16 text-ink-soft shadow-2xl sm:my-12 sm:rounded-lg sm:px-12"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-2 text-muted hover:bg-card hover:text-ink"
        >
          <X className="size-5" />
        </button>
        <p className="eyebrow">{story.themes.join(" · ")}</p>
        <h2 id="reader-title" className="mt-4 font-serif text-4xl leading-tight text-ink sm:text-5xl">
          {story.title ?? (long ? "A testimony" : `“${story.text}”`)}
        </h2>
        {story.creditName ? (
          <p className="mt-5 text-sm text-ink">
            {story.creditName}
            {story.creditLine ? <span className="text-muted"> · {story.creditLine}</span> : null}
          </p>
        ) : null}
        <StoryMeta story={story} className={`text-muted ${story.creditName ? "mt-2" : "mt-5"}`} />
        {story.title && !long ? (
          <p className="mt-10 font-serif text-2xl italic leading-snug text-ink">“{story.text}”</p>
        ) : null}
        {long ? (
          <div className="mt-10 text-[1.05rem] leading-relaxed">
            <Body text={story.body!} />
          </div>
        ) : null}
        {story.reflections?.map((r) => (
          <section key={r.id} className="mt-14 border-t border-rule pt-8">
            <p className="eyebrow">{formatDate(r)}</p>
            {r.title ? <h3 className="mt-3 font-serif text-3xl text-ink">{r.title}</h3> : null}
            {r.body ? (
              <div className="mt-6 text-[1.05rem] leading-relaxed">
                <Body text={r.body} />
              </div>
            ) : (
              <p className="mt-4 font-serif text-2xl italic leading-snug text-ink">“{r.text}”</p>
            )}
          </section>
        ))}
        {!story.synthetic ? (
          <div className="mt-14 border-t border-rule pt-6">
            <RevisitButton excerptId={story.id} title={story.title} className="text-muted hover:text-accent" />
          </div>
        ) : null}
      </article>
    </div>
  );
}
