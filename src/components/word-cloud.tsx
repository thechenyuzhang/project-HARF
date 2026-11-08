"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export type CloudWord = {
  word: string;
  /** People who used the word (or a rounded count of them). */
  weight: number;
  /** One of the reader's own words. */
  mine?: boolean;
  /** Order in which a new word arrives, for a gentle stagger. */
  arrival?: number;
};

type Placed = {
  key: string;
  word: string;
  x: number;
  y: number;
  size: number;
  color: string;
  mine: boolean;
  delay: number;
  filler: boolean;
};

// The light bulb, in SVG units. Nothing is drawn: the words alone make the shape.
const W = 600;
const H = 760;
const GLOBE = { cx: 300, cy: 262, r: 250 };
const NECK = { bottom: 588, half: 116 };
const BASE = { top: 604, bottom: 712, half: 100 };
const TIP = { top: 712, bottom: 748, half: 54 };

const CELL = 4;
const GW = W / CELL;
const GH = H / CELL;
const MAX_SIZE = 72;
const MIN_SIZE = 14;
const FILL_SIZES = [22, 18, 15, 12, 10, 8];
const MAX_FILLERS = 520;
const TRIES = 6;
const GAP_X = 5;

/** Bright, readable on the card; assigned per word so colours stay put between renders. */
const PALETTE = ["#e4572e", "#c2185b", "#1b998b", "#2e86de", "#8e44ad", "#c0392b", "#16a085", "#d35400", "#5561c4", "#e84393", "#27ae60", "#00838f"];

function hash(word: string) {
  let h = 2166136261;
  for (let i = 0; i < word.length; i++) h = Math.imul(h ^ word.charCodeAt(i), 16777619);
  return h >>> 0;
}

function inShape(x: number, y: number) {
  const dx = Math.abs(x - GLOBE.cx);
  if ((x - GLOBE.cx) ** 2 + (y - GLOBE.cy) ** 2 <= GLOBE.r ** 2) return true;
  if (y >= GLOBE.cy && y <= NECK.bottom && dx <= NECK.half) return true;
  if (y >= BASE.top && y <= BASE.bottom && dx <= BASE.half) return true;
  return y >= TIP.top && y <= TIP.bottom && dx <= TIP.half;
}

const MASK = (() => {
  const mask = new Uint8Array(GW * GH);
  for (let gy = 0; gy < GH; gy++)
    for (let gx = 0; gx < GW; gx++) mask[gy * GW + gx] = inShape((gx + 0.5) * CELL, (gy + 0.5) * CELL) ? 1 : 0;
  return mask;
})();

/** Free cells inside the bulb. Words claim the cells their box covers. */
class Grid {
  taken = new Uint8Array(GW * GH);
  private cells(x0: number, y0: number, x1: number, y1: number) {
    return [Math.floor(x0 / CELL), Math.floor(y0 / CELL), Math.ceil(x1 / CELL), Math.ceil(y1 / CELL)] as const;
  }
  free(x0: number, y0: number, x1: number, y1: number) {
    const [a, b, c, d] = this.cells(x0, y0, x1, y1);
    if (a < 0 || b < 0 || c > GW || d > GH) return false;
    for (let gy = b; gy < d; gy++)
      for (let gx = a; gx < c; gx++) {
        const i = gy * GW + gx;
        if (!MASK[i] || this.taken[i]) return false;
      }
    return true;
  }
  take(x0: number, y0: number, x1: number, y1: number) {
    const [a, b, c, d] = this.cells(x0, y0, x1, y1);
    for (let gy = b; gy < d; gy++) for (let gx = a; gx < c; gx++) this.taken[gy * GW + gx] = 1;
  }
}

type Measure = (word: string, size: number) => number;
const boxHeight = (size: number) => size * 0.78;
const colorOf = (word: string) => PALETTE[hash(word) % PALETTE.length];

/**
 * Packs the words into a light bulb: the real words first, biggest in the
 * middle, then smaller repeats of them fill every gap so the shape is made of
 * words alone.
 */
function layout(words: CloudWord[], measure: Measure): Placed[] {
  if (!words.length) return [];
  const sorted = [...words].sort((a, b) => b.weight - a.weight || a.word.localeCompare(b.word));
  const roots = sorted.map((w) => Math.sqrt(w.weight));
  const top = roots[0];
  const bottom = roots[roots.length - 1];
  const ceiling = Math.min(MAX_SIZE, 34 + 240 / Math.sqrt(words.length + 4));

  const attempt = (scale: number, skip = false): { grid: Grid; out: Placed[] } | null => {
    const grid = new Grid();
    const out: Placed[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const w = sorted[i];
      const t = top === bottom ? 0.55 + 0.45 * ((hash(w.word) % 100) / 100) : (roots[i] - bottom) / (top - bottom);
      // The reader's own new words start at a readable size so they can be found.
      const shown = w.mine ? Math.max(t, 0.3) : t;
      const size = Math.max(MIN_SIZE, (MIN_SIZE + shown * (ceiling - MIN_SIZE)) * scale);
      const half = measure(w.word, size) / 2 + GAP_X;
      const halfH = boxHeight(size) / 2;
      const start = (hash(w.word) % 628) / 100;
      let spot: [number, number] | null = null;
      for (let s = 0; s < 1200 && !spot; s++) {
        const angle = start + s * 0.4;
        const radius = 9 * Math.sqrt(s);
        const x = GLOBE.cx + Math.cos(angle) * radius * 1.1;
        const y = GLOBE.cy + 40 + Math.sin(angle) * radius * 1.15;
        if (grid.free(x - half, y - halfH, x + half, y + halfH)) spot = [x, y];
      }
      if (!spot) {
        if (skip) continue;
        return null;
      }
      grid.take(spot[0] - half, spot[1] - halfH, spot[0] + half, spot[1] + halfH);
      out.push({
        key: w.word,
        word: w.word,
        x: spot[0],
        y: spot[1],
        size,
        color: colorOf(w.word),
        mine: !!w.mine,
        delay: (w.arrival ?? 0) * 0.04,
        filler: false,
      });
    }
    return { grid, out };
  };

  // The real words take up to about half the glass; repeats fill the rest.
  let low = 0.2;
  let high = 1.25;
  let best = attempt(low, true)!;
  for (let i = 0; i < 7; i++) {
    const mid = (low + high) / 2;
    const result = attempt(mid);
    if (result) {
      best = result;
      low = mid;
    } else high = mid;
  }

  const { grid, out } = best;
  // Very short words make the fill look like noise; use them only if nothing else exists.
  const longer = sorted.map((w) => w.word).filter((w) => w.length >= 3);
  const pool = longer.length ? longer : sorted.map((w) => w.word);
  let n = 0;
  for (const size of FILL_SIZES) {
    const h = boxHeight(size);
    for (let y = h / 2; y < H - h / 2 && n < MAX_FILLERS; y += CELL) {
      for (let x = 0; x < W && n < MAX_FILLERS; x += CELL) {
        // Try a few different words here; near the curve a shorter one often fits.
        let word = "";
        let width = 0;
        for (let k = 0; k < TRIES && !word; k++) {
          const candidate = pool[(n + k * 7 + Math.floor(y)) % pool.length];
          const w = measure(candidate, size) + GAP_X;
          if (grid.free(x, y - h / 2, x + w, y + h / 2)) {
            word = candidate;
            width = w;
          }
        }
        if (!word) continue;
        grid.take(x, y - h / 2, x + width, y + h / 2);
        out.push({
          key: `${word}#${n}`,
          word,
          x: x + width / 2,
          y,
          size,
          color: colorOf(word),
          mine: false,
          delay: 0.3 + (y / H) * 0.6,
          filler: true,
        });
        n++;
        x += width - CELL;
      }
    }
  }
  return out;
}

/**
 * A word cloud in the shape of a light bulb, made only of words. Words animate
 * in, grow and move to their new places when the words change (a new story).
 */
export function WordCloud({ words, label }: { words: CloudWord[]; label: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const [placed, setPlaced] = useState<Placed[] | null>(null);
  // Re-lay out only when the words themselves change, not on every new array.
  const signature = words.map((w) => `${w.word}:${w.weight}:${w.mine ? 1 : 0}:${w.arrival ?? 0}`).join("|");

  useEffect(() => {
    let live = true;
    const run = () => {
      const family = svg.current ? getComputedStyle(svg.current).fontFamily : "serif";
      const ctx = document.createElement("canvas").getContext("2d");
      const cache = new Map<string, number>();
      const measure: Measure = (word, size) => {
        const key = `${word}@${size.toFixed(1)}`;
        let width = cache.get(key);
        if (width === undefined) {
          if (ctx) {
            ctx.font = `700 ${size}px ${family}`;
            width = ctx.measureText(word).width;
          } else width = word.length * size * 0.55;
          cache.set(key, width);
        }
        return width;
      };
      if (live) setPlaced(layout(words, measure));
    };
    (document.fonts?.ready ?? Promise.resolve()).then(run);
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return (
    <svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="mx-auto block w-full max-w-md font-serif">
      <AnimatePresence initial={false}>
        {(placed ?? []).map((p) => (
          <motion.text
            key={p.key}
            textAnchor="middle"
            dominantBaseline="central"
            fill={p.color}
            fontWeight={700}
            initial={{ opacity: 0, x: p.x, y: p.y, fontSize: p.size * 0.2 }}
            animate={{ opacity: p.filler ? 0.82 : 1, x: p.x, y: p.y, fontSize: p.size }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 140, damping: 20, delay: p.delay }}
            style={p.mine ? { filter: "drop-shadow(0 0 5px rgba(255, 190, 0, 0.95))" } : undefined}
          >
            {p.word}
          </motion.text>
        ))}
      </AnimatePresence>
    </svg>
  );
}
