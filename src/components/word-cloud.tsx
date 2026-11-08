"use client";

import { AnimatePresence, motion } from "motion/react";

export type CloudWord = {
  word: string;
  /** People who used the word (or a rounded count of them). */
  weight: number;
  /** One of the reader's own words. */
  mine?: boolean;
  /** Order in which a new word arrives, for a gentle stagger. */
  arrival?: number;
};

const MIN_REM = 0.95;
const MAX_REM = 3.1;

/** A stable pseudo-random order, so big words are scattered rather than sorted to one end. */
function hash(word: string) {
  let h = 2166136261;
  for (let i = 0; i < word.length; i++) h = Math.imul(h ^ word.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * A flowing word cloud. Words animate in, grow when their weight changes and
 * reflow smoothly, so a change to the words (a new story) can be watched.
 */
export function WordCloud({ words, label }: { words: CloudWord[]; label: string }) {
  const weights = words.map((w) => Math.sqrt(w.weight));
  const top = Math.max(...weights, 1);
  const bottom = Math.min(...weights, top);
  const size = (weight: number) => {
    const t = top === bottom ? 0.5 : (Math.sqrt(weight) - bottom) / (top - bottom);
    return `${(MIN_REM + t * (MAX_REM - MIN_REM)).toFixed(3)}rem`;
  };
  const ordered = [...words].sort((a, b) => hash(a.word) - hash(b.word));

  return (
    <ul
      aria-label={label}
      className="flex min-h-40 flex-wrap items-center justify-center gap-x-4 gap-y-1 px-2 py-4 font-serif leading-tight"
    >
      <AnimatePresence initial={false}>
        {ordered.map((w) => (
          <motion.li
            key={w.word}
            layout="position"
            initial={{ opacity: 0, scale: 0.2, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0, fontSize: size(w.weight) }}
            exit={{ opacity: 0, scale: 0.4 }}
            transition={{
              type: "spring",
              stiffness: 170,
              damping: 20,
              delay: (w.arrival ?? 0) * 0.05,
              layout: { type: "spring", stiffness: 200, damping: 26 },
            }}
            className={`whitespace-nowrap transition-colors duration-700 ${
              w.mine ? "font-semibold text-accent" : "text-navy/80"
            }`}
          >
            {w.word}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
