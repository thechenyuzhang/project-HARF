"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { cormorant } from "@/components/sky/sky-title";
import { formatDate, type Story } from "./stories";

/** One line of facts under a testimony: role, country, age, date. */
export function StoryMeta({ story, className = "" }: { story: Story; className?: string }) {
  const bits = [story.role, story.country, story.ageRange, formatDate(story)].filter(Boolean);
  return (
    <p className={`text-xs tracking-wide text-white/55 ${className}`}>
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
            <blockquote
              key={i}
              className={`my-8 border-l border-[var(--concept-accent,#cfd8ff)] pl-6 text-2xl italic leading-snug text-white ${cormorant.className}`}
            >
              {block.replace(/^>\s?/gm, "")}
            </blockquote>
          );
        }
        if (block.length < 70 && !/[.!?:;”"…]$/.test(block) && !block.includes("\n")) {
          return (
            <h3 key={i} className={`pt-6 text-2xl text-white ${cormorant.className}`}>
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
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <article
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-title"
        onClick={(e) => e.stopPropagation()}
        className="observatory-rise relative my-0 w-full max-w-2xl self-start bg-[#070912] px-6 pb-20 pt-16 text-white/85 ring-1 ring-white/10 sm:my-12 sm:rounded-lg sm:px-12"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X className="size-5" />
        </button>
        <p className="eyebrow !text-white/45">{story.themes.join(" · ")}</p>
        <h2 id="reader-title" className={`mt-4 text-4xl leading-tight text-white sm:text-5xl ${cormorant.className}`}>
          {story.title ?? (long ? "A testimony" : `“${story.text}”`)}
        </h2>
        {story.creditName ? (
          <p className="mt-5 text-sm text-white">
            {story.creditName}
            {story.creditLine ? <span className="text-white/55"> · {story.creditLine}</span> : null}
          </p>
        ) : null}
        <StoryMeta story={story} className="mt-2" />
        {story.title && !long ? (
          <p className={`mt-10 text-2xl italic leading-snug text-white ${cormorant.className}`}>“{story.text}”</p>
        ) : null}
        {long ? (
          <div className="mt-10 text-[1.05rem] leading-relaxed">
            <Body text={story.body!} />
          </div>
        ) : null}
      </article>
    </div>
  );
}
