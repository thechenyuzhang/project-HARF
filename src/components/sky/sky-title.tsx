import { Cormorant_Garamond, Josefin_Sans } from "next/font/google";
import type { CSSProperties, ReactNode } from "react";
import type { Look, LookId, Title } from "./looks";

// The fonts and title treatments shared by the home page and /concepts.

export const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"] });
export const josefin = Josefin_Sans({ subsets: ["latin"], weight: ["300", "400"] });
export const SKY_FONTS = { serif: cormorant.style.fontFamily, sans: josefin.style.fontFamily };

// How each look sets the title. All of them centre on narrow screens.
export const TITLE_TYPE: Record<LookId, { hero: string; block: string; kicker: string; main: string; sub: string }> = {
  letters: {
    hero: "items-center justify-center text-center",
    block: "max-w-5xl",
    kicker: `${cormorant.className} text-2xl italic sm:text-4xl`,
    main: `${cormorant.className} text-[clamp(3.25rem,9vw,8.5rem)] font-medium italic leading-[0.95]`,
    sub: "mx-auto mt-7 max-w-xl text-base font-light sm:text-lg",
  },
  chart: {
    hero: "items-center justify-center text-center md:items-start md:pt-[7svh]",
    block: "max-w-4xl",
    kicker: `${josefin.className} text-sm uppercase tracking-[0.32em] sm:text-base`,
    main: `${josefin.className} text-[clamp(1.7rem,4.6vw,4rem)] uppercase leading-[1.15] tracking-[0.2em]`,
    sub: `${josefin.className} mx-auto mt-5 max-w-2xl text-base font-light tracking-[0.16em] sm:text-lg`,
  },
  field: {
    hero: "items-center justify-center text-center md:items-end md:justify-start md:pb-[11svh] md:text-left",
    block: "max-w-2xl",
    kicker: `${josefin.className} text-xs uppercase tracking-[0.5em] sm:text-sm`,
    main: `${josefin.className} text-[clamp(1.5rem,3.3vw,2.9rem)] font-light uppercase leading-[1.35] tracking-[0.42em]`,
    sub: "mt-6 max-w-md text-sm font-light leading-relaxed max-md:mx-auto sm:text-base",
  },
  atlas: {
    hero: "items-center justify-center text-center md:justify-start md:text-left",
    block: "max-w-2xl",
    kicker: `${cormorant.className} text-2xl italic sm:text-3xl`,
    main: `${cormorant.className} text-[clamp(3rem,6.6vw,6.5rem)] leading-[0.98]`,
    sub: `${cormorant.className} mt-6 max-w-md text-xl italic leading-snug max-md:mx-auto sm:text-2xl`,
  },
};

/** The title, arriving a letter at a time; a few letters catch the light and keep twinkling. */
export function SkyTitle({ look, title, children }: { look: Look; title: Title; children?: ReactNode }) {
  const type = TITLE_TYPE[look.id];
  const words = title.main.split(" ");
  const lettersBefore = (index: number) => words.slice(0, index).reduce((n, word) => n + word.length, 0);
  const settled = 0.5 + title.main.length * 0.05;

  return (
    <div className={`relative ${type.block}`} style={{ color: look.ink }}>
      {/* A soft pool of darkness, so the sky never fights the words. */}
      <span
        aria-hidden
        className="absolute -inset-x-24 -inset-y-16 -z-10 blur-2xl"
        style={{ background: `radial-gradient(closest-side, rgb(${look.veil} / 0.8), rgb(${look.veil} / 0))` }}
      />
      {title.kicker && (
        <p className={`concept-fade mb-3 opacity-85 ${type.kicker}`} style={{ "--d": "0.3s" } as CSSProperties}>
          {title.kicker}
        </p>
      )}
      <h1 aria-label={title.main} className={`text-balance ${type.main}`}>
        {words.map((word, w) => (
          <span key={w} aria-hidden className="inline-block whitespace-nowrap">
            {[...word].map((ch, i) => {
              const n = lettersBefore(w) + i;
              const glint = (n * 5 + title.main.length) % 7 === 3;
              return (
                <span
                  key={i}
                  className={`concept-letter ${glint ? "concept-letter-glint" : ""}`}
                  style={{ "--d": `${0.5 + n * 0.05}s`, "--g": `${1.2 + ((n * 37) % 50) / 10}s` } as CSSProperties}
                >
                  {ch}
                  {glint && (
                    <svg viewBox="0 0 24 24" className="concept-glint" fill="currentColor">
                      <path d="M12 0c.5 8.2 3.3 11 12 12-8.7 1-11.5 3.8-12 12-.5-8.2-3.3-11-12-12 8.7-1 11.5-3.8 12-12Z" />
                    </svg>
                  )}
                </span>
              );
            })}
            {w < words.length - 1 && " "}
          </span>
        ))}
      </h1>
      {look.id === "atlas" && (
        <span
          aria-hidden
          className="concept-fade mt-7 block h-px w-28 bg-[var(--concept-accent)] max-md:mx-auto"
          style={{ "--d": `${settled}s` } as CSSProperties}
        />
      )}
      <p className={`concept-fade text-white/80 ${type.sub}`} style={{ "--d": `${settled + 0.2}s` } as CSSProperties}>
        {title.sub}
      </p>
      {children ? (
        <div className="concept-fade" style={{ "--d": `${settled + 0.6}s` } as CSSProperties}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
