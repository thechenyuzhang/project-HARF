"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { REFLECTION, type Theme } from "@/lib/harf";

// Prototype: a star-trail timelapse that slows into a constellation map of the
// ideas people raise about AI. The idea words are placeholders until they are
// drawn from published stories.

type Idea = { text: string; dx: number; dy: number; weight: 1 | 2 | 3 };
type Constellation = {
  theme: Theme;
  x: number;
  y: number;
  hue: string;
  question: string;
  ideas: Idea[];
  /** Extra links between ideas (indices), on top of centre → idea. */
  chain?: [number, number][];
};

const SKY: Constellation[] = [
  {
    theme: "Learning",
    x: 18,
    y: 30,
    hue: "#9cc9ff",
    question: "Has AI changed how you learn or approach difficult problems?",
    ideas: [
      { text: "a tutor at 2am", dx: -8, dy: -9, weight: 3 },
      { text: "shortcuts", dx: 9, dy: -6, weight: 2 },
      { text: "deeper questions", dx: 10, dy: 8, weight: 2 },
      { text: "forgetting how", dx: -7, dy: 10, weight: 1 },
    ],
    chain: [[0, 1]],
  },
  {
    theme: "Authorship",
    x: 46,
    y: 26,
    hue: "#f3d38a",
    question: "When AI helps you write, whose words are they?",
    ideas: [
      { text: "whose voice?", dx: -9, dy: 7, weight: 3 },
      { text: "first draft", dx: 8, dy: -7, weight: 2 },
      { text: "ghostwriter", dx: 11, dy: 7, weight: 1 },
      { text: "credit", dx: -6, dy: -8, weight: 1 },
    ],
    chain: [[1, 2]],
  },
  {
    theme: "Identity",
    x: 76,
    y: 29,
    hue: "#e7a6ff",
    question: "Has AI changed how confident you feel about your own thinking?",
    ideas: [
      { text: "imposter", dx: -9, dy: -7, weight: 2 },
      { text: "more capable", dx: 9, dy: -6, weight: 3 },
      { text: "self-doubt", dx: -8, dy: 9, weight: 2 },
      { text: "who am I without it", dx: 8, dy: 10, weight: 1 },
    ],
    chain: [[0, 2]],
  },
  {
    theme: "Creativity",
    x: 30,
    y: 55,
    hue: "#ffb08a",
    question: "Has AI helped you discover an ability you didn't know you had?",
    ideas: [
      { text: "a spark", dx: -8, dy: -7, weight: 3 },
      { text: "sameness", dx: 10, dy: -5, weight: 2 },
      { text: "collaborator", dx: 9, dy: 8, weight: 2 },
      { text: "play", dx: -9, dy: 7, weight: 1 },
    ],
    chain: [[2, 3]],
  },
  {
    theme: "Dependency",
    x: 63,
    y: 52,
    hue: "#7fe3d0",
    question:
      "Is there something you no longer do yourself because AI does it for you?",
    ideas: [
      { text: "can't start without it", dx: -10, dy: -8, weight: 3 },
      { text: "habit", dx: 9, dy: -7, weight: 2 },
      { text: "reliance", dx: 10, dy: 8, weight: 2 },
      { text: "offline", dx: -8, dy: 9, weight: 1 },
    ],
    chain: [[1, 2]],
  },
  {
    theme: "Trust",
    x: 85,
    y: 64,
    hue: "#a7b7ff",
    question: "When do you believe what AI tells you, and when don't you?",
    ideas: [
      { text: "hallucinations", dx: -9, dy: -9, weight: 2 },
      { text: "second opinion", dx: -10, dy: 8, weight: 3 },
      { text: "verify", dx: 4, dy: 11, weight: 1 },
      { text: "blind faith", dx: 3, dy: -12, weight: 1 },
    ],
  },
  {
    theme: "Work",
    x: 17,
    y: 80,
    hue: "#ffd6a5",
    question: "Is AI changing what your work is, or only how fast it happens?",
    ideas: [
      { text: "productivity", dx: 9, dy: -8, weight: 3 },
      { text: "replaced?", dx: -6, dy: -9, weight: 2 },
      { text: "new skills", dx: 11, dy: 6, weight: 2 },
      { text: "faster deadlines", dx: -4, dy: 9, weight: 1 },
    ],
    chain: [[0, 2]],
  },
  {
    theme: "Human Agency",
    x: 53,
    y: 80,
    hue: "#ff8fa3",
    question: REFLECTION,
    ideas: [
      { text: "deciding for myself", dx: -11, dy: -8, weight: 3 },
      { text: "control", dx: 10, dy: -7, weight: 2 },
      { text: "delegated", dx: 11, dy: 7, weight: 2 },
      { text: "choice", dx: -9, dy: 8, weight: 1 },
    ],
    chain: [[0, 3]],
  },
];

/** Faint threads between constellations, drawn once the whole sky is lit. */
const WEB: [Theme, Theme][] = [
  ["Learning", "Creativity"],
  ["Authorship", "Identity"],
  ["Authorship", "Creativity"],
  ["Dependency", "Trust"],
  ["Dependency", "Human Agency"],
  ["Work", "Human Agency"],
  ["Identity", "Dependency"],
  ["Creativity", "Work"],
];

const TRANSITION_START = Date.UTC(2022, 10, 30); // ChatGPT's public release
const SKY_SPEED = 240;
const OMEGA = 0.03; // sky rotation, radians per second: a slow drift
const MAX_TRAIL = 0.5; // longest star trail, in radians // timelapse: one real second = four minutes of sky

// Scroll choreography, as fractions of the pinned section.
const FOCUS_START = 0.44;
const FOCUS_END = 0.9;
const FOCUS_STEP = (FOCUS_END - FOCUS_START) / SKY.length;

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const ramp = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function UniverseSky() {
  const trackRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0);
  const skyClockRef = useRef<HTMLSpanElement>(null);
  const [p, setP] = useState(0);
  const [now, setNow] = useState<number | null>(null);
  const [hovered, setHovered] = useState<Theme | null>(null);
  const [pinned, setPinned] = useState<Theme | null>(null);
  const [idea, setIdea] = useState<{
    text: string;
    theme: Theme;
    x: number;
    y: number;
  } | null>(null);
  const [myStar, setMyStar] = useState<{ x: number; y: number } | null>(null);
  const parallaxRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Live wall clock (client only, so the static export doesn't bake in a time).
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Star-trail timelapse + scroll tracking, one animation loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    const track = trackRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !track || !ctx) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const BUCKETS = [
      "#ffffff",
      "#cfe0ff",
      "#9fc3ff",
      "#ffe6c4",
      "#ffd0a8",
      "#e6ecff",
    ];
    type Star = { r: number; a: number; size: number; b: number };
    let stars: Star[] = [];
    let w = 0;
    let h = 0;
    let px = 0;
    let py = 0;
    let maxR = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      px = w * 0.6;
      py = h * 0.3;
      maxR = Math.hypot(Math.max(px, w - px), Math.max(py, h - py));
      const count = Math.min(1600, Math.round((w * h) / 900));
      stars = Array.from({ length: count }, () => ({
        r: Math.sqrt(Math.random()),
        a: Math.random() * Math.PI * 2,
        size: Math.random() < 0.08 ? 1.6 : Math.random() < 0.4 ? 1.1 : 0.7,
        b: Math.floor(Math.random() * BUCKETS.length),
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    let angle = 0;
    let exposure = 0; // trail length in radians, builds up after load
    let last = performance.now();
    let skyTime = Date.now();
    let lastShown = -1;
    let satellite: { x: number; y: number; vx: number; vy: number } | null =
      null;
    let raf = 0;
    const mouse = { x: 0, y: 0, ex: 0, ey: 0 };
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX / window.innerWidth - 0.5;
      mouse.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onMove);

    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;

      // Scroll progress through the pinned section.
      const rect = track.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      const prog = clamp(-rect.top / (span || 1));
      progressRef.current = prog;
      const rounded = Math.round(prog * 1000) / 1000;
      if (rounded !== lastShown) {
        lastShown = rounded;
        setP(rounded);
      }

      // Cursor parallax: deeper layers drift less.
      if (!reduced) {
        mouse.ex += (mouse.x - mouse.ex) * 0.025;
        mouse.ey += (mouse.y - mouse.ey) * 0.025;
        const depths = [2, 4, 7];
        parallaxRefs.current.forEach((el, i) => {
          if (el)
            el.style.transform = `translate3d(${-mouse.ex * depths[i]}px, ${-mouse.ey * depths[i]}px, 0)`;
        });
      }

      // Slow timelapse at the top, settling to a still sky as you scroll in.
      const speed = reduced ? 0 : 1 - ramp(0.1, 0.34, prog);
      angle += OMEGA * speed * dt;
      exposure = Math.min(MAX_TRAIL, exposure + OMEGA * speed * dt);
      skyTime += dt * 1000 * (1 + (SKY_SPEED - 1) * speed);
      if (skyClockRef.current) {
        skyClockRef.current.textContent = new Date(skyTime).toLocaleTimeString(
          [],
          { hour: "2-digit", minute: "2-digit" },
        );
      }

      // Redraw from scratch every frame, so nothing ghosts on the canvas.
      ctx.clearRect(0, 0, w, h);

      // Trails are arcs that grow as the exposure builds, brighter at the head.
      const trail = exposure * speed;
      const moving = trail > 0.004;
      const pieces = [
        [0, 0.4, 0.12],
        [0.4, 0.75, 0.35],
        [0.75, 1, 0.85],
      ] as const;
      for (let b = 0; b < BUCKETS.length; b++) {
        ctx.strokeStyle = BUCKETS[b];
        ctx.fillStyle = BUCKETS[b];
        if (moving) {
          ctx.lineWidth = 1.2;
          for (const [from, to, alpha] of pieces) {
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            for (const s of stars) {
              if (s.b !== b) continue;
              const r = s.r * maxR;
              const head = s.a + angle;
              const a0 = head - trail * (1 - from);
              const a1 = head - trail * (1 - to);
              ctx.moveTo(px + Math.cos(a0) * r, py + Math.sin(a0) * r);
              ctx.arc(px, py, r, a0, a1);
            }
            ctx.stroke();
          }
        }
        // The star itself: a point that twinkles once the sky is still.
        ctx.globalAlpha = moving
          ? 0.9
          : 0.55 + 0.45 * Math.sin(t / 700 + b * 1.7);
        ctx.beginPath();
        for (const s of stars) {
          if (s.b !== b) continue;
          const r = s.r * maxR;
          ctx.rect(
            px + Math.cos(s.a + angle) * r - s.size / 2,
            py + Math.sin(s.a + angle) * r - s.size / 2,
            s.size,
            s.size,
          );
        }
        ctx.fill();
      }

      // A rare satellite gliding across, with a short fading tail.
      if (!reduced) {
        if (!satellite && speed > 0.5 && Math.random() < dt * 0.04) {
          const fromLeft = Math.random() < 0.5;
          satellite = {
            x: fromLeft ? -10 : w + 10,
            y: Math.random() * h * 0.5,
            vx: (fromLeft ? 1 : -1) * (40 + Math.random() * 30),
            vy: 8 + Math.random() * 12,
          };
        }
        if (satellite) {
          const s = satellite;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          const len = 50 / Math.hypot(s.vx, s.vy);
          const tail = ctx.createLinearGradient(
            s.x - s.vx * len,
            s.y - s.vy * len,
            s.x,
            s.y,
          );
          tail.addColorStop(0, "rgba(255,255,255,0)");
          tail.addColorStop(1, "rgba(255,255,255,0.7)");
          ctx.globalAlpha = 1;
          ctx.strokeStyle = tail;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(s.x - s.vx * len, s.y - s.vy * len);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();
          if (s.x < -60 || s.x > w + 60 || s.y > h) satellite = null;
        }
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  // Derived choreography.
  const heroOut = ramp(0.05, 0.15, p);
  const interlude = ramp(0.16, 0.22, p) * (1 - ramp(0.3, 0.36, p));
  const horizonDrop = ramp(0.08, 0.36, p);
  const reveal = ramp(0.3, 0.44, p);
  const focusIdx =
    p >= FOCUS_START && p < FOCUS_END
      ? Math.floor((p - FOCUS_START) / FOCUS_STEP)
      : -1;
  // The finale hands the sky over to placing your own star.
  const interactive = reveal > 0.6 && p < FOCUS_END;
  const chosen = interactive ? (pinned ?? hovered) : null;
  const focused = chosen
    ? SKY.find((c) => c.theme === chosen)!
    : focusIdx >= 0
      ? SKY[focusIdx]
      : null;
  const shownIdx = focused ? SKY.indexOf(focused) : -1;
  const finale = ramp(FOCUS_END, 0.96, p);
  const gridOn = ramp(0.26, 0.42, p);

  const goTo = (fraction: number) => {
    const track = trackRef.current;
    if (!track) return;
    const top =
      track.offsetTop + fraction * (track.offsetHeight - window.innerHeight);
    window.scrollTo({ top, behavior: "smooth" });
  };

  const days = now ? Math.floor((now - TRANSITION_START) / 86_400_000) : null;
  const seconds = now ? Math.floor((now - TRANSITION_START) / 1000) : null;

  const pos = (name: Theme) => SKY.find((c) => c.theme === name)!;

  return (
    <div className="universe-page bg-[#03050d] text-white">
      <section
        ref={trackRef}
        aria-label="The AI universe"
        className="relative"
        style={{ height: "720vh" }}
      >
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          {/* Deep night, with a last glow of dusk on the horizon */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `radial-gradient(120% 70% at 50% 120%, rgba(255,140,70,${0.55 * (1 - horizonDrop)}) 0%, rgba(40,90,150,${0.35 * (1 - horizonDrop)}) 35%, transparent 70%), radial-gradient(90% 80% at 60% 30%, #0c1430 0%, #050816 55%, #02030a 100%)`,
            }}
          />

          <div
            ref={(el) => {
              parallaxRefs.current[0] = el;
            }}
            className="absolute -inset-10"
          >
            <canvas
              ref={canvasRef}
              aria-hidden
              className="absolute inset-0 size-full transition-transform duration-[1400ms] ease-out"
              style={{
                transform: focused ? "scale(1.12)" : "scale(1)",
                transformOrigin: focused
                  ? `${focused.x}% ${focused.y}%`
                  : "60% 30%",
              }}
            />
          </div>

          {/* Star-chart grid around the celestial pole */}
          <div
            ref={(el) => {
              parallaxRefs.current[1] = el;
            }}
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ opacity: gridOn * (focused ? 0.5 : 1) }}
          >
            <svg
              className="absolute left-[60%] top-[30%] size-[230vmax] -translate-x-1/2 -translate-y-1/2"
              viewBox="-100 -100 200 200"
            >
              {[8, 16, 24, 32, 40, 48, 56, 64].map((r) => (
                <circle
                  key={r}
                  r={r}
                  fill="none"
                  stroke="#6f9bd8"
                  strokeOpacity={0.28}
                  strokeWidth={0.06}
                  strokeDasharray="0.25 0.6"
                />
              ))}
              {Array.from({ length: 24 }, (_, i) => {
                const a = (i / 24) * Math.PI * 2;
                return (
                  <line
                    key={i}
                    x1={+(Math.cos(a) * 8).toFixed(3)}
                    y1={+(Math.sin(a) * 8).toFixed(3)}
                    x2={+(Math.cos(a) * 64).toFixed(3)}
                    y2={+(Math.sin(a) * 64).toFixed(3)}
                    stroke="#6f9bd8"
                    strokeOpacity={0.2}
                    strokeWidth={0.05}
                    strokeDasharray="0.25 0.6"
                  />
                );
              })}
            </svg>
          </div>

          {/* Constellations: the word cloud */}
          <div
            ref={(el) => {
              parallaxRefs.current[2] = el;
            }}
            className="absolute inset-0"
          >
            <div
              onClick={(e) => {
                if (
                  finale < 0.5 ||
                  (e.target as HTMLElement).closest("a,button")
                )
                  return;
                const box = e.currentTarget.getBoundingClientRect();
                setMyStar({
                  x: ((e.clientX - box.left) / box.width) * 100,
                  y: ((e.clientY - box.top) / box.height) * 100,
                });
              }}
              className={`absolute inset-0 transition-transform duration-[1400ms] ease-out ${finale > 0.5 ? "cursor-crosshair" : ""}`}
              style={{
                transform: focused ? "scale(1.35)" : "scale(1)",
                transformOrigin: focused
                  ? `${focused.x}% ${focused.y}%`
                  : "50% 50%",
              }}
            >
              {/* Nebula glow behind each constellation */}
              {SKY.map((c) => (
                <div
                  key={`neb-${c.theme}`}
                  aria-hidden
                  className="pointer-events-none absolute size-[34vmin] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-700"
                  style={{
                    left: `${c.x}%`,
                    top: `${c.y}%`,
                    background: `radial-gradient(circle, ${c.hue}55 0%, #2a4cff22 40%, transparent 70%)`,
                    filter: "blur(18px)",
                    opacity:
                      (0.25 + 0.75 * reveal) *
                      (focused ? (focused === c ? 1 : 0.15) : 0.55),
                  }}
                />
              ))}

              <svg
                aria-hidden
                className="absolute inset-0 size-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {WEB.map(([a, b]) => {
                  const A = pos(a);
                  const B = pos(b);
                  return (
                    <line
                      key={`${a}-${b}`}
                      x1={A.x}
                      y1={A.y}
                      x2={B.x}
                      y2={B.y}
                      stroke="white"
                      strokeOpacity={0.22 * finale}
                      strokeWidth={1}
                      strokeDasharray="2 6"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
                {SKY.map((c) => {
                  const dim = focused && focused !== c ? 0.15 : 1;
                  const segs: [number, number, number, number][] = [
                    ...c.ideas.map(
                      (i) =>
                        [c.x, c.y, c.x + i.dx, c.y + i.dy] as [
                          number,
                          number,
                          number,
                          number,
                        ],
                    ),
                    ...(c.chain ?? []).map(
                      ([m, n]) =>
                        [
                          c.x + c.ideas[m].dx,
                          c.y + c.ideas[m].dy,
                          c.x + c.ideas[n].dx,
                          c.y + c.ideas[n].dy,
                        ] as [number, number, number, number],
                    ),
                  ];
                  return segs.map(([x1, y1, x2, y2], k) => (
                    <line
                      key={`${c.theme}-${k}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={c.hue}
                      strokeOpacity={0.55 * dim * reveal}
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                      className="transition-[stroke-opacity] duration-700"
                    />
                  ));
                })}
              </svg>

              {SKY.map((c) => {
                const isFocus = focused === c;
                const dim = focused && !isFocus ? 0.2 : 1;
                // Theme names glimmer from the very first frame; ideas join as the sky stills.
                const themeOpacity = (0.45 + 0.55 * reveal) * dim;
                return (
                  <div key={c.theme}>
                    <Node
                      x={c.x}
                      y={c.y}
                      hue={c.hue}
                      opacity={themeOpacity}
                      star={9}
                      label={c.theme}
                      labelClass="font-serif text-[clamp(1.05rem,2.3vw,1.9rem)] tracking-tight"
                      pulse
                      interactive={interactive}
                      active={pinned === c.theme}
                      onEnter={() => setHovered(c.theme)}
                      onLeave={() =>
                        setHovered((h) => (h === c.theme ? null : h))
                      }
                      onSelect={() =>
                        setPinned((cur) => (cur === c.theme ? null : c.theme))
                      }
                    />
                    {c.ideas.map((i) => (
                      <Node
                        key={i.text}
                        x={c.x + i.dx}
                        y={c.y + i.dy}
                        hue={c.hue}
                        opacity={reveal * dim * (isFocus ? 1 : 0.85)}
                        star={i.weight + 3}
                        interactive={interactive}
                        onEnter={() =>
                          setIdea({
                            text: i.text,
                            theme: c.theme,
                            x: c.x + i.dx,
                            y: c.y + i.dy,
                          })
                        }
                        onLeave={() =>
                          setIdea((cur) => (cur?.text === i.text ? null : cur))
                        }
                        onSelect={() => setPinned(c.theme)}
                        label={i.text}
                        labelClass={`italic text-white/80 ${
                          i.weight === 3
                            ? "text-[clamp(0.8rem,1.4vw,1.15rem)]"
                            : i.weight === 2
                              ? "text-[clamp(0.7rem,1.1vw,0.95rem)]"
                              : "text-[clamp(0.62rem,0.9vw,0.8rem)]"
                        }`}
                      />
                    ))}
                  </div>
                );
              })}

              {idea && (
                <div
                  className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 rounded-lg border border-white/10 bg-[#050816]/85 px-3 py-2 text-xs leading-snug text-white/80 backdrop-blur"
                  style={{ left: `${idea.x}%`, top: `calc(${idea.y}% + 30px)` }}
                >
                  <span className="font-serif text-sm italic text-white">
                    &ldquo;{idea.text}&rdquo;
                  </span>
                  <span className="mt-1 block text-white/50">
                    An idea in {idea.theme}. Stories about it will light up this
                    star.
                  </span>
                </div>
              )}

              {myStar && (
                <div
                  className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                  style={{ left: `${myStar.x}%`, top: `${myStar.y}%` }}
                >
                  <span className="universe-born block size-3 rounded-full bg-white shadow-[0_0_24px_8px_#ffd6a5]" />
                  <span className="mt-2 whitespace-nowrap font-serif text-sm italic text-[#ffd6a5]">
                    your star
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Horizon: observatory silhouette that sinks away as you go deeper */}
          <svg
            aria-hidden
            viewBox="0 0 1440 220"
            preserveAspectRatio="xMidYMax slice"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[26vh] w-full"
            style={{
              transform: `translateY(${horizonDrop * 100}%)`,
              opacity: 1 - horizonDrop * 0.6,
            }}
          >
            <path
              fill="#010208"
              d="M0 160 L120 120 L210 140 L320 96 L430 132 L520 118 L610 150 L760 128 L900 150 L1010 110 L1120 136 L1240 100 L1340 128 L1440 112 L1440 220 L0 220 Z"
            />
            {/* dome */}
            <path
              fill="#010208"
              d="M1010 132 L1010 92 A42 42 0 0 1 1094 92 L1094 132 Z"
            />
            <rect x="1046" y="48" width="12" height="44" fill="#03050d" />
            {/* radio dish */}
            <path fill="#010208" d="M280 108 L300 60 L306 62 L292 110 Z" />
            <path fill="#010208" d="M250 70 Q300 20 350 40 Q320 90 250 70 Z" />
            {/* tiny telescope on a tripod */}
            <path
              fill="#010208"
              d="M640 150 L662 104 L666 106 L648 150 Z M676 150 L664 106 L668 104 L684 150 Z"
            />
            <rect
              x="644"
              y="88"
              width="56"
              height="12"
              rx="3"
              transform="rotate(-28 672 94)"
              fill="#010208"
            />
          </svg>

          {/* Time readouts: a sense that this moment is passing */}
          <div className="pointer-events-none absolute left-5 right-5 top-24 flex flex-wrap items-center gap-x-6 gap-y-1 text-[0.68rem] uppercase tracking-[0.2em] text-white/60 sm:left-10">
            <span className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#ff8fa3] opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-[#ff8fa3]" />
              </span>
              Live ·{" "}
              {now
                ? new Date(now).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "--:--:--"}
            </span>
            <span>
              Sky time{" "}
              <span ref={skyClockRef} className="tabular-nums text-white/85" />{" "}
              · {p < 0.34 ? `×${SKY_SPEED}` : "paused"}
            </span>
          </div>

          {/* Hero copy */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-[16vh] px-5 sm:px-10"
            style={{
              opacity: 1 - heroOut,
              transform: `translateY(${-heroOut * 40}px)`,
            }}
          >
            <p className="eyebrow !text-white/60">
              A Living Memory of the AI Transition
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-5xl leading-[1.02] sm:text-7xl md:text-8xl">
              The AI Universe
            </h1>
            <p className="mt-5 max-w-xl font-serif text-xl leading-snug text-white/85 sm:text-2xl">
              The transition is{" "}
              <span className="tabular-nums text-[#ffd6a5]">
                {days?.toLocaleString() ?? "…"}
              </span>{" "}
              days old.
              <br />
              Tonight&rsquo;s sky won&rsquo;t look like this again.
            </p>
            <p className="mt-3 text-sm tabular-nums text-white/55">
              {seconds?.toLocaleString() ?? "…"} seconds since ChatGPT&rsquo;s
              release, and counting.
            </p>
          </div>

          {/* Interlude */}
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center"
            style={{ opacity: interlude }}
          >
            <p className="max-w-2xl font-serif text-3xl leading-snug sm:text-5xl">
              Every story is a point of light.
              <span className="mt-3 block text-lg text-white/65 sm:text-2xl">
                Slow down. Look for the patterns between them.
              </span>
            </p>
          </div>

          {/* Focused constellation caption */}
          {focused && finale < 0.5 && (
            <div
              key={focused.theme}
              className="universe-caption absolute bottom-8 left-5 right-5 max-w-md rounded-xl border border-white/10 bg-[#050816]/70 p-5 backdrop-blur-md sm:bottom-10 sm:left-10"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="eyebrow !text-white/50">
                  Constellation {shownIdx + 1} of {SKY.length}
                </p>
                {pinned && (
                  <button
                    type="button"
                    onClick={() => setPinned(null)}
                    className="-mt-1 text-xs text-white/50 hover:text-white"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                )}
              </div>
              <h2
                className="mt-2 font-serif text-3xl"
                style={{ color: focused.hue }}
              >
                {focused.theme}
              </h2>
              <p className="mt-2 font-serif text-lg leading-snug text-white/85">
                {focused.question}
              </p>
              <Link
                href={`/archive/?theme=${encodeURIComponent(focused.theme)}`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white"
              >
                Read stories in {focused.theme}{" "}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          )}

          {/* Finale */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center bg-gradient-to-t from-[#03050d] via-[#03050d]/85 to-transparent px-6 pb-10 pt-24 text-center [&_a]:pointer-events-auto"
            style={{
              opacity: finale,
              visibility: finale > 0.02 ? "visible" : "hidden",
            }}
          >
            <p className="max-w-2xl font-serif text-2xl leading-snug sm:text-4xl">
              This is AI as people are living it, mapped one story at a time.
            </p>
            <p className="mt-3 text-sm text-white/60">
              {myStar
                ? "Your star is on the map. Now give it a story."
                : "Click anywhere in the sky to place your star."}
            </p>
            <Link
              href="/share/"
              data-track="share_click"
              data-track-from="universe"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-white transition-colors hover:bg-white hover:text-ink"
            >
              Add your star <ArrowRight className="size-4" />
            </Link>
          </div>

          {/* Constellation rail */}
          <nav
            aria-label="Constellations"
            className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col gap-3 sm:flex"
            style={{ opacity: reveal }}
          >
            {SKY.map((c, i) => (
              <button
                key={c.theme}
                type="button"
                onClick={() => {
                  setPinned(null);
                  goTo(FOCUS_START + (i + 0.5) * FOCUS_STEP);
                }}
                className="group flex items-center justify-end gap-2 text-[0.65rem] uppercase tracking-[0.18em] text-white/40 hover:text-white"
              >
                <span
                  className={`transition-opacity ${shownIdx === i ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                >
                  {c.theme}
                </span>
                <span
                  className="size-2 rounded-full transition-transform"
                  style={{
                    background: c.hue,
                    transform: shownIdx === i ? "scale(1.6)" : "scale(1)",
                    opacity: shownIdx === i ? 1 : 0.45,
                  }}
                />
              </button>
            ))}
          </nav>

          {/* Scroll cue */}
          <button
            type="button"
            onClick={() => goTo(0.4)}
            className="absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center text-[0.65rem] uppercase tracking-[0.2em] text-white/55 hover:text-white"
            style={{ opacity: 1 - heroOut }}
          >
            Scroll into the night
            <ChevronDown className="mt-1 size-5 animate-bounce" />
          </button>
        </div>
      </section>

      <section className="relative mx-auto max-w-4xl px-5 py-28 text-center">
        <p className="eyebrow !text-white/50">The sky keeps moving</p>
        <h2 className="mt-4 font-serif text-4xl leading-tight sm:text-6xl">
          What you notice today, you may not remember noticing tomorrow.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-white/70">
          Write it down while it&rsquo;s still happening. Your experience
          becomes part of the map.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/share/"
            data-track="share_click"
            data-track-from="universe_footer"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 transition-colors hover:bg-white hover:text-ink"
          >
            Share your story <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/archive/"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 ring-1 ring-white/25 transition-colors hover:bg-white/10"
          >
            Explore the archive
          </Link>
        </div>
      </section>
    </div>
  );
}

function Node({
  x,
  y,
  hue,
  opacity,
  star,
  label,
  labelClass,
  pulse,
  interactive,
  active,
  onEnter,
  onLeave,
  onSelect,
}: {
  x: number;
  y: number;
  hue: string;
  opacity: number;
  star: number;
  label: string;
  labelClass: string;
  pulse?: boolean;
  interactive?: boolean;
  active?: boolean;
  onEnter?: () => void;
  onLeave?: () => void;
  onSelect?: () => void;
}) {
  const Tag = interactive && onSelect ? "button" : "div";
  return (
    <Tag
      {...(Tag === "button"
        ? {
            type: "button" as const,
            onClick: onSelect,
            onMouseEnter: onEnter,
            onMouseLeave: onLeave,
            onFocus: onEnter,
            onBlur: onLeave,
            "aria-pressed": active,
          }
        : {})}
      className={`absolute flex flex-col items-center transition-[opacity,filter] duration-700 ${
        Tag === "button"
          ? "pointer-events-auto cursor-pointer hover:brightness-125"
          : "pointer-events-none"
      }`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        opacity,
        transform: `translate(-50%, -${star / 2}px)`,
      }}
    >
      <StarGlint size={star} hue={hue} twinkle={pulse} />
      <span
        className={`mt-2.5 whitespace-nowrap leading-none ${labelClass}`}
        style={{ textShadow: "0 0 12px rgba(0,0,0,0.9)" }}
      >
        {label}
      </span>
    </Tag>
  );
}

/** A lens-flare star: white core, coloured halo and four diffraction spikes. */
function StarGlint({
  size,
  hue,
  twinkle,
}: {
  size: number;
  hue: string;
  twinkle?: boolean;
}) {
  const spike = size * (twinkle ? 6 : 4.5);
  const thin = Math.max(1, size / 5);
  const beam = (angle: number, length: number, alpha: number) => (
    <span
      className="absolute left-1/2 top-1/2"
      style={{
        width: length,
        height: thin,
        marginLeft: -length / 2,
        marginTop: -thin / 2,
        transform: `rotate(${angle}deg)`,
        opacity: alpha,
        background: `linear-gradient(90deg, transparent, ${hue} 35%, #fff 50%, ${hue} 65%, transparent)`,
        borderRadius: thin,
      }}
    />
  );
  return (
    <span className="relative block" style={{ width: size, height: size }}>
      <span className={`absolute inset-0 ${twinkle ? "universe-pulse" : ""}`}>
        <span
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: size * 5,
            height: size * 5,
            marginLeft: (-size * 5) / 2,
            marginTop: (-size * 5) / 2,
            background: `radial-gradient(circle, ${hue}aa 0%, ${hue}33 35%, transparent 70%)`,
          }}
        />
        {beam(0, spike, 1)}
        {beam(90, spike, 1)}
        {beam(45, spike * 0.45, 0.5)}
        {beam(-45, spike * 0.45, 0.5)}
      </span>
      <span
        className="absolute inset-0 rounded-full bg-white"
        style={{
          boxShadow: `0 0 ${size}px ${size / 3}px #fff, 0 0 ${size * 2}px ${size / 2}px ${hue}`,
        }}
      />
    </span>
  );
}
