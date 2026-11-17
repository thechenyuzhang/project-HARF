"use client";

import { useEffect, useRef } from "react";
import type { Look, LookId } from "./variants";

// The fixed backdrop for the landing concepts. One canvas, four looks: the sky
// never scrolls; the page's title and sections travel over it. Each word is a
// constellation whose stars are its letters, read along the line.

const WORDS = [
  "learning", "wonder", "memory", "agency", "trust", "voice", "doubt", "spark", "habit", "draft",
  "credit", "choice", "verify", "human", "tutor", "think", "work", "play", "self", "hope",
  "fear", "why", "us", "ai",
];
const DUST =
  "if or and we us you me it so yes no how why who now then here with new old ask say see".split(" ");
const MILKY =
  "prompt answer question draft idea voice learn write think doubt trust faster easier lost found mine yours ours help habit choice change memory future student teacher work study skill craft tool mirror shortcut wonder worry hope fear curious honest real human machine words thought attention time".split(
    " ",
  );
const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

type Rgb = string; // "r,g,b"
type Spec = {
  star: Rgb;
  line: Rgb;
  grid: Rgb;
  dust: Rgb;
  /** Resting brightness of a constellation; hover and twinkles lift it to 1. */
  wordAlpha: number;
  lineAlpha: number;
  lineWidth: number;
  /** Space left between a star and the line that leaves it. */
  gap: number;
  /** Where the title sits at the top of the page, as fractions of the viewport. */
  titleBox: [number, number, number, number];
  pole: [number, number];
};

const SPECS: Record<LookId, Spec> = {
  letters: {
    star: "255,255,255",
    line: "200,212,255",
    grid: "255,255,255",
    dust: "255,255,255",
    wordAlpha: 0.72,
    lineAlpha: 0.34,
    lineWidth: 0.8,
    gap: 13,
    titleBox: [0.2, 0.31, 0.8, 0.72],
    pole: [0.5, 0.5],
  },
  chart: {
    star: "240,228,196",
    line: "226,204,160",
    grid: "96,186,190",
    dust: "232,212,104",
    wordAlpha: 0.8,
    lineAlpha: 0.6,
    lineWidth: 0.9,
    gap: 5,
    titleBox: [0.16, 0.0, 0.84, 0.44],
    pole: [0.5, 0.6],
  },
  field: {
    star: "255,255,255",
    line: "255,255,255",
    grid: "255,255,255",
    dust: "255,255,255",
    wordAlpha: 0.78,
    lineAlpha: 0.5,
    lineWidth: 0.7,
    gap: 4,
    titleBox: [0.0, 0.5, 0.56, 1.0],
    pole: [0.52, 0.48],
  },
  atlas: {
    star: "240,214,160",
    line: "222,190,130",
    grid: "214,180,120",
    dust: "232,204,150",
    wordAlpha: 0.82,
    lineAlpha: 0.6,
    lineWidth: 0.9,
    gap: 8,
    titleBox: [0.0, 0.2, 0.52, 0.82],
    pole: [0.7, 0.5],
  },
};
// On narrow screens every look centres its title.
const NARROW_TITLE_BOX: Spec["titleBox"] = [0, 0.28, 1, 0.76];

type Pt = { x: number; y: number };
type Star = Pt & { ch: string; mag: number; phase: number; speed: number };
type Box = { x0: number; y0: number; x1: number; y1: number };
type Word = {
  text: string;
  stars: Star[];
  /** An unlettered star off one side, so the shape reads as a constellation. */
  spur: { from: number; x: number; y: number } | null;
  box: Box;
  t0: number;
  pulseAt: number;
  lift: number;
};
type Live = Pt & { r: number; phase: number; speed: number; delay: number; glint: boolean };

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const ease = (t: number) => t * t * (3 - 2 * t);
const rgba = (c: Rgb, a: number) => `rgba(${c},${a})`;
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

/** Seeded, so a look keeps its sky across reloads and resizes. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lay each word out as a wandering left-to-right path, clear of the title and of each other. */
function layoutWords(rand: () => number, w: number, h: number, titleBox: Spec["titleBox"], u: number): Word[] {
  const title: Box = { x0: titleBox[0] * w, y0: titleBox[1] * h, x1: titleBox[2] * w, y1: titleBox[3] * h };
  const top = 150; // clear of the header and the tabs
  const margin = 26;
  const pad = 20 * u;
  const step = 46 * u;
  const max = Math.round(clamp((w * h) / 62000, 6, 22));
  const placed: Word[] = [];

  for (const text of WORDS) {
    if (placed.length >= max) break;
    for (let attempt = 0; attempt < 140; attempt++) {
      let x = 0;
      let y = 0;
      let heading = (rand() - 0.5) * 1.1;
      const pts: Pt[] = [{ x, y }];
      for (let i = 1; i < text.length; i++) {
        heading = clamp(heading + (rand() - 0.5) * 2, -1.15, 1.15);
        const len = step * (0.75 + rand() * 0.6);
        x += Math.cos(heading) * len;
        y += Math.sin(heading) * len;
        pts.push({ x, y });
      }
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const bw = Math.max(...xs) - minX;
      const bh = Math.max(...ys) - minY;
      const roomX = w - 2 * margin - bw - 2 * pad;
      const roomY = h - top - margin - bh - 2 * pad;
      if (roomX < 0 || roomY < 0) continue;
      const ox = margin + pad + rand() * roomX - minX;
      const oy = top + pad + rand() * roomY - minY;
      const box: Box = {
        x0: ox + minX - pad,
        y0: oy + minY - pad,
        x1: ox + minX + bw + pad,
        y1: oy + minY + bh + pad,
      };
      if (overlaps(box, title) || placed.some((p) => overlaps(box, p.box))) continue;

      const stars: Star[] = pts.map((p, i) => ({
        x: p.x + ox,
        y: p.y + oy,
        ch: text[i],
        mag: i === 0 ? 1 : 0.35 + rand() * 0.65,
        phase: rand() * Math.PI * 2,
        speed: 0.6 + rand() * 1.6,
      }));
      let spur: Word["spur"] = null;
      if (text.length >= 5) {
        const from = 1 + Math.floor(rand() * (text.length - 2));
        const a = stars[from - 1];
        const b = stars[from + 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const side = rand() < 0.5 ? 1 : -1;
        const reach = step * (0.55 + rand() * 0.3) * side;
        spur = {
          from,
          x: clamp(stars[from].x - ((b.y - a.y) / len) * reach, box.x0 + 6, box.x1 - 6),
          y: clamp(stars[from].y + ((b.x - a.x) / len) * reach, box.y0 + 6, box.y1 - 6),
        };
      }
      placed.push({ text, stars, spur, box, t0: 0, pulseAt: -10, lift: 0 });
      break;
    }
  }

  // Light the constellations one after another, in a shuffled order.
  const order = placed.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  order.forEach((index, n) => {
    placed[index].t0 = 0.7 + n * 0.2;
  });
  return placed;
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, points: number, inner: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i * Math.PI) / points - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * inner;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

type Fonts = { serif: string; sans: string };

/** Everything that never changes after layout: grids, dust, the Milky Way. Painted once. */
function paintStatic(
  ctx: CanvasRenderingContext2D,
  look: LookId,
  spec: Spec,
  words: Word[],
  rand: () => number,
  w: number,
  h: number,
  u: number,
  fonts: Fonts,
) {
  const px = spec.pole[0] * w;
  const py = spec.pole[1] * h;
  const far = Math.hypot(w, h);
  const circle = (x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
  };
  const dot = (x: number, y: number, r: number, color: Rgb, a: number) => {
    ctx.fillStyle = rgba(color, a);
    circle(x, y, r);
    ctx.fill();
  };
  const spoke = (angle: number, from: number, to: number) => {
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(angle) * from, py + Math.sin(angle) * from);
    ctx.lineTo(px + Math.cos(angle) * to, py + Math.sin(angle) * to);
    ctx.stroke();
  };

  if (look === "letters") {
    for (let i = (w * h) / 3600; i > 0; i--) dot(rand() * w, rand() * h, 0.3 + rand() * 0.9, spec.dust, 0.12 + rand() * 0.6);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = (w * h) / 6500; i > 0; i--) {
      ctx.save();
      ctx.translate(rand() * w, rand() * h);
      ctx.rotate((rand() - 0.5) * 0.9);
      ctx.font = `italic ${Math.round((8 + rand() * 7) * u)}px ${fonts.serif}`;
      ctx.fillStyle = rgba(spec.dust, 0.1 + rand() * 0.24);
      ctx.fillText(ALPHABET[Math.floor(rand() * 26)], 0, 0);
      ctx.restore();
    }
    for (let i = (w * h) / 52000; i > 0; i--) {
      ctx.font = `italic ${Math.round((10 + rand() * 3) * u)}px ${fonts.serif}`;
      ctx.fillStyle = rgba(spec.dust, 0.2 + rand() * 0.16);
      ctx.fillText(DUST[Math.floor(rand() * DUST.length)], rand() * w, rand() * h);
    }
    return;
  }

  if (look === "chart") {
    const R = Math.min(w * 0.47, h * 0.62);
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(spec.grid, 0.42);
    for (const k of [0.26, 0.52, 0.78]) {
      circle(px, py, R * k);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(spec.grid, 0.7);
    ctx.lineWidth = 1.6;
    circle(px, py, R);
    ctx.stroke();
    ctx.lineWidth = 0.8;
    circle(px, py, R * 1.035);
    ctx.stroke();
    // The ecliptic: an off-centre dashed circle.
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = rgba(spec.grid, 0.55);
    circle(px + R * 0.1, py - R * 0.08, R * 0.74);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = rgba(spec.grid, 0.26);
    ctx.font = `${Math.round(9 * u)}px ${fonts.sans}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let d = 0; d < 360; d += 30) {
      const a = (d * Math.PI) / 180 - Math.PI / 2;
      spoke(a, R * 0.26, R);
      ctx.fillStyle = rgba(spec.grid, 0.8);
      ctx.fillText(`${d / 15}h`, px + Math.cos(a) * R * 1.075, py + Math.sin(a) * R * 1.075);
    }
    ctx.strokeStyle = rgba(spec.grid, 0.5);
    for (let d = 0; d < 360; d += 5) {
      const a = (d * Math.PI) / 180;
      spoke(a, R, R * (d % 15 === 0 ? 1.035 : 1.018));
    }
    for (let i = (w * h) / 3400; i > 0; i--) dot(rand() * w, rand() * h, 0.5 + rand() * 0.9, spec.dust, 0.25 + rand() * 0.6);
    for (let i = (w * h) / 26000; i > 0; i--) dot(rand() * w, rand() * h, 1 + rand() * 1.1, spec.star, 0.4 + rand() * 0.4);
    return;
  }

  if (look === "field") {
    const R = Math.max(w, h) * 0.085;
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = rgba(spec.grid, 0.1);
    for (let k = 1; k * R < far; k++) {
      circle(px, py, k * R);
      ctx.stroke();
    }
    for (let d = 0; d < 360; d += 15) spoke((d * Math.PI) / 180, R, far);

    // The Milky Way: a soft band, and inside it the small words people say.
    const band = (x: number) => h * (0.3 + 0.19 * Math.sin((x / w) * 2.4 + 0.4)) + (x / w - 0.5) * h * 0.14;
    const gauss = () => (rand() + rand() + rand() - 1.5) * 1.15;
    for (let i = 0; i < 170; i++) {
      const x = rand() * w;
      const y = band(x) + gauss() * h * 0.05;
      const r = (50 + rand() * 110) * u;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
      glow.addColorStop(0, rgba(spec.dust, 0.034));
      glow.addColorStop(1, rgba(spec.dust, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = clamp((w * h) / 2300, 160, 760); i > 0; i--) {
      const x = rand() * w;
      ctx.font = `${Math.round(6 + rand() * 4)}px ${fonts.sans}`;
      ctx.fillStyle = rgba(spec.dust, 0.14 + rand() * 0.4);
      ctx.fillText(MILKY[Math.floor(rand() * MILKY.length)], x, band(x) + gauss() * h * 0.065);
    }
    for (let i = Math.min(3400, (w * h) / 650); i > 0; i--) {
      const bright = rand() < 0.06;
      dot(rand() * w, rand() * h, bright ? 1.1 + rand() * 0.7 : 0.35 + rand() * 0.55, spec.dust, 0.3 + rand() * 0.7);
    }

    // Constellation boundaries follow the grid: a ring segment around each word.
    ctx.strokeStyle = rgba(spec.grid, 0.24);
    ctx.lineWidth = 0.8;
    for (const word of words) {
      const cx = (word.box.x0 + word.box.x1) / 2;
      const cy = (word.box.y0 + word.box.y1) / 2;
      const mid = Math.atan2(cy - py, cx - px);
      let rMin = Infinity;
      let rMax = 0;
      let aMin = 0;
      let aMax = 0;
      for (const s of word.spur ? [...word.stars, word.spur] : word.stars) {
        const r = Math.hypot(s.x - px, s.y - py);
        const turn = Math.atan2(s.y - py, s.x - px) - mid;
        const a = Math.atan2(Math.sin(turn), Math.cos(turn)); // wrapped to ±π
        rMin = Math.min(rMin, r);
        rMax = Math.max(rMax, r);
        aMin = Math.min(aMin, a);
        aMax = Math.max(aMax, a);
      }
      const room = 20 * u;
      rMin = Math.max(8, rMin - room);
      rMax += room;
      const spread = room / ((rMin + rMax) / 2);
      const a0 = mid + aMin - spread;
      const a1 = mid + aMax + spread;
      ctx.beginPath();
      ctx.arc(px, py, rMin, a0, a1);
      ctx.lineTo(px + Math.cos(a1) * rMax, py + Math.sin(a1) * rMax);
      ctx.arc(px, py, rMax, a1, a0, true);
      ctx.closePath();
      ctx.stroke();
    }
    return;
  }

  // Antique atlas: meridians fanning from the pole, rings, and a graduated border.
  const R = Math.max(w, h) * 0.085;
  const rim = Math.min(w, h) * 0.6;
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = rgba(spec.grid, 0.3);
  for (let k = 1; k * R < far; k++) {
    if (Math.abs(k * R - rim) < R * 0.3) continue;
    circle(px, py, k * R);
    ctx.stroke();
  }
  for (let d = 0; d < 360; d += 15) spoke((d * Math.PI) / 180, d % 45 === 0 ? 0 : R, far);
  ctx.strokeStyle = rgba(spec.grid, 0.6);
  ctx.lineWidth = 1.2;
  circle(px, py, rim);
  ctx.stroke();
  circle(px, py, rim + 9 * u);
  ctx.stroke();
  ctx.lineWidth = 0.8;
  for (let d = 0; d < 360; d += 1) {
    if (d % 5 !== 0 && rim < 260) continue;
    spoke((d * Math.PI) / 180, rim, rim + (d % 5 === 0 ? 9 : 4.5) * u);
  }
  ctx.fillStyle = rgba(spec.star, 0.95);
  starPath(ctx, px, py, 9 * u, 16, 0.3);
  ctx.fill();
  for (let i = (w * h) / 8200; i > 0; i--) {
    ctx.fillStyle = rgba(spec.dust, 0.3 + rand() * 0.5);
    starPath(ctx, rand() * w, rand() * h, (1.2 + rand() * 2.4) * u, rand() < 0.3 ? 8 : 4, 0.4);
    ctx.fill();
  }
}

export function SkyCanvas({ look, fonts }: { look: Look; fonts: Fonts }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const id = look.id;
    const spec = SPECS[id];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const still = document.createElement("canvas");
    const stillCtx = still.getContext("2d");
    const glow = document.createElement("canvas");
    glow.width = glow.height = 64;
    const glowCtx = glow.getContext("2d");
    if (!stillCtx || !glowCtx) return;
    const halo = glowCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    halo.addColorStop(0, rgba(spec.star, 0.9));
    halo.addColorStop(0.25, rgba(spec.star, 0.28));
    halo.addColorStop(1, rgba(spec.star, 0));
    glowCtx.fillStyle = halo;
    glowCtx.fillRect(0, 0, 64, 64);

    let w = 0;
    let h = 0;
    let u = 1;
    let dpr = 1;
    let words: Word[] = [];
    let live: Live[] = [];

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      u = clamp(Math.min(w, h) / 760, 0.72, 1.15);
      for (const c of [canvas, still]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      const rand = mulberry32(id.length * 7919 + 11);
      const narrow = w < 768;
      words = layoutWords(rand, w, h, narrow ? NARROW_TITLE_BOX : spec.titleBox, u);
      live = Array.from({ length: Math.round(clamp((w * h) / 10000, 40, 170)) }, () => ({
        x: rand() * w,
        y: rand() * h,
        r: 0.7 + rand() * 1.3,
        phase: rand() * Math.PI * 2,
        speed: 0.5 + rand() * 1.9,
        delay: 0.15 + rand() * 2.6,
        glint: rand() < 0.16,
      }));
      stillCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stillCtx.clearRect(0, 0, w, h);
      const pole: [number, number] = narrow ? [0.5, id === "atlas" ? 0.3 : spec.pole[1]] : spec.pole;
      paintStatic(stillCtx, id, { ...spec, pole }, words, rand, w, h, u, fonts);
    };
    build();
    // Canvas text only picks up a web font once it has loaded, so repaint then.
    let alive = true;
    Promise.all([
      document.fonts.load(`italic 500 20px ${fonts.serif}`),
      document.fonts.load(`20px ${fonts.sans}`),
    ]).then(() => alive && build(), () => {});

    let resizeTimer = 0;
    const onResize = () => {
      // Mobile browsers resize on every address-bar slide; only rebuild for real changes.
      if (canvas.clientWidth === w && Math.abs(canvas.clientHeight - h) < 120) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(build, 120);
    };
    window.addEventListener("resize", onResize);

    const pointer = { x: -1, y: -1 };
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };
    window.addEventListener("pointermove", onMove);

    const STEP = 0.09; // seconds between one letter igniting and the next
    let start = 0; // set on the first frame that has a sky to draw
    let nextPulse = 5;
    let raf = 0;

    /** A flare: soft halo plus a four-point glint. */
    const flare = (x: number, y: number, strength: number) => {
      const r = (12 + 26 * strength) * u;
      ctx.globalAlpha = Math.min(1, strength);
      ctx.drawImage(glow, x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
      const arm = (9 + 30 * strength) * u;
      ctx.strokeStyle = rgba(spec.star, 0.75 * Math.min(1, strength));
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - arm, y);
      ctx.lineTo(x + arm, y);
      ctx.moveTo(x, y - arm);
      ctx.lineTo(x, y + arm);
      ctx.stroke();
    };

    const drawStar = (s: Star, alpha: number) => {
      ctx.fillStyle = rgba(spec.star, alpha);
      if (id === "letters") {
        ctx.font = `italic 500 ${Math.round((15 + 9 * s.mag) * u)}px ${fonts.serif}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(s.ch, s.x, s.y);
        return;
      }
      if (id === "atlas") {
        starPath(ctx, s.x, s.y, (3 + 4 * s.mag) * u, 8, 0.42);
        ctx.fill();
        ctx.font = `italic 500 ${Math.round(16 * u)}px ${fonts.serif}`;
      } else {
        ctx.beginPath();
        ctx.arc(s.x, s.y, (id === "chart" ? 1.5 + 2.3 * s.mag : 1 + 1.7 * s.mag) * u, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `${Math.round((id === "chart" ? 10 : 9) * u)}px ${fonts.sans}`;
      }
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = rgba(spec.star, alpha * (id === "atlas" ? 0.95 : 0.8));
      ctx.fillText(id === "atlas" ? s.ch : s.ch.toUpperCase(), s.x + 7 * u, s.y - 6 * u);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // Mounted while hidden (a background tab, say): wait until there is room to draw.
      if (!w || !h) {
        if (canvas.clientWidth && canvas.clientHeight) build();
        return;
      }
      start ||= now;
      const t = reduced ? 60 : (now - start) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = ease(clamp(t / 2.4));
      ctx.drawImage(still, 0, 0, w, h);
      ctx.globalAlpha = 1;

      // Stars that keep twinkling after everything else has settled.
      for (const s of live) {
        const age = t - s.delay;
        if (age < 0) continue;
        const arrive = Math.max(0, 1 - age / 0.8);
        const shimmer = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(t * s.speed + s.phase);
        ctx.fillStyle = rgba(spec.star, clamp(age / 0.3) * shimmer);
        if (id === "atlas") {
          starPath(ctx, s.x, s.y, s.r * 2.4 * u, 8, 0.42);
        } else {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * u, 0, Math.PI * 2);
        }
        ctx.fill();
        const spark = Math.max(arrive * (s.glint ? 0.8 : 0.25), s.glint ? Math.max(0, shimmer - 0.82) * 2.2 : 0);
        if (spark > 0.03) flare(s.x, s.y, spark * 0.6);
      }

      if (!reduced && t > nextPulse && words.length) {
        words[Math.floor(Math.random() * words.length)].pulseAt = t;
        nextPulse = t + 1.4 + Math.random() * 2.2;
      }

      for (const word of words) {
        const local = t - word.t0;
        if (local < 0) continue;
        const { stars, spur, box } = word;
        const hot = pointer.x > box.x0 && pointer.x < box.x1 && pointer.y > box.y0 && pointer.y < box.y1;
        word.lift += ((hot ? 1 : 0) - word.lift) * 0.1;
        const base = spec.wordAlpha + (1 - spec.wordAlpha) * word.lift;
        const gap = spec.gap * u;

        ctx.lineWidth = spec.lineWidth + 0.5 * word.lift;
        ctx.strokeStyle = rgba(spec.line, clamp(spec.lineAlpha * (0.85 + word.lift)));
        ctx.beginPath();
        for (let i = 1; i < stars.length; i++) {
          const grow = ease(clamp((local - i * STEP) / 0.45));
          if (grow <= 0) break;
          const a = stars[i - 1];
          const b = stars[i];
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          if (len <= gap * 2) continue;
          const ux = (b.x - a.x) / len;
          const uy = (b.y - a.y) / len;
          const reach = gap + (len - gap * 2) * grow;
          ctx.moveTo(a.x + ux * gap, a.y + uy * gap);
          ctx.lineTo(a.x + ux * reach, a.y + uy * reach);
        }
        const spurGrow = spur ? ease(clamp((local - stars.length * STEP) / 0.5)) : 0;
        if (spur && spurGrow > 0) {
          const a = stars[spur.from];
          const len = Math.hypot(spur.x - a.x, spur.y - a.y) || 1;
          const reach = gap + (len - gap) * spurGrow;
          ctx.moveTo(a.x + ((spur.x - a.x) / len) * gap, a.y + ((spur.y - a.y) / len) * gap);
          ctx.lineTo(a.x + ((spur.x - a.x) / len) * reach, a.y + ((spur.y - a.y) / len) * reach);
        }
        ctx.stroke();
        if (spur && spurGrow > 0.9) {
          ctx.fillStyle = rgba(spec.star, base * 0.8);
          ctx.beginPath();
          ctx.arc(spur.x, spur.y, 1.4 * u, 0, Math.PI * 2);
          ctx.fill();
        }

        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          const age = local - i * STEP;
          if (age < 0) break;
          const ignite = Math.max(0, 1 - age / 1.1);
          const wave = t - word.pulseAt - i * 0.13;
          const pulse = wave > 0 && wave < 1 ? Math.sin(wave * Math.PI) : 0;
          const shimmer = reduced ? 0 : 0.14 * Math.sin(t * s.speed + s.phase);
          const spark = Math.max(ignite, pulse);
          drawStar(s, clamp(base + shimmer + 0.5 * spark) * clamp(age / 0.25));
          const strength = Math.max(spark * 0.8, word.lift * 0.3) * (0.6 + 0.4 * s.mag);
          if (strength > 0.04) flare(s.x, s.y, strength);
        }

        // The chart and the atlas name their constellations.
        if (id === "chart" || id === "atlas") {
          const shown = clamp((local - stars.length * STEP) / 0.8);
          if (shown > 0) {
            ctx.font =
              id === "chart" ? `${Math.round(10 * u)}px ${fonts.sans}` : `500 ${Math.round(12 * u)}px ${fonts.serif}`;
            ctx.letterSpacing = id === "chart" ? "3px" : "4px";
            ctx.textAlign = "center";
            ctx.textBaseline = "alphabetic";
            ctx.fillStyle = rgba(id === "chart" ? spec.star : spec.line, shown * (0.5 + 0.5 * word.lift));
            ctx.fillText(word.text.toUpperCase(), (box.x0 + box.x1) / 2, box.y1 - 4 * u);
            ctx.letterSpacing = "0px";
          }
        }
      }

      // The sky stays where it is; it only dims as the next section arrives over it.
      if (veilRef.current) {
        veilRef.current.style.opacity = String(0.62 * ease(clamp(window.scrollY / (window.innerHeight * 0.85))));
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
    };
  }, [look, fonts]);

  return (
    <div aria-hidden className="fixed inset-x-0 top-0 -z-10 h-lvh" style={{ background: look.backdrop }}>
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      <div ref={veilRef} className="absolute inset-0 opacity-0" style={{ background: `rgb(${look.veil})` }} />
    </div>
  );
}
