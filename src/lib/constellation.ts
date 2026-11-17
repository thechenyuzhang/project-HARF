// Which constellations a testimony belongs to. A small, transparent keyword
// matcher, shared by the participant function (to place a new testimony's star
// the moment it arrives), the editor dashboard (shown as a suggestion an editor
// confirms or corrects) and scripts/check-theme-matcher.ts (which measures how
// often it agrees with editors). Keep it free of browser- or Node-only code.

import { THEMES, type Theme } from "./harf";

/**
 * Word stems per theme. A stem matches any word that starts with it, so
 * "learn" covers learn, learned, learning, learner. Phrases (with a space)
 * match anywhere in the text.
 */
export const THEME_LEXICON: Record<Theme, readonly string[]> = {
  Learning: [
    "learn", "study", "studies", "studied", "studying", "student", "class", "course", "lecture", "professor",
    "teach", "tutor", "exam", "homework", "assignment", "reading", "concept", "understand", "explain", "explanation",
    "school", "universit", "curricul", "syllab", "summar", "education", "knowledge", "memor", "problem set",
  ],
  Authorship: [
    "writ", "wrote", "draft", "essay", "author", "voice", "sentence", "paragraph", "ghostwrit", "plagiar", "credit",
    "own words", "my words", "rewrit", "edited", "editing", "polish", "prose", "style", "position paper", "vows",
  ],
  Identity: [
    "identity", "myself", "who i am", "confiden", "imposter", "impostor", "insecur", "self-", "selfhood", "ashamed",
    "shame", "embarrass", "culture", "cultural", "language", "background", "belong", "humanity", "human being",
    "personality", "complex", "becoming ourselves", "who we are", "i'm the one", "not sure i could", "mine",
    "my own writing", "sounding like", "visual person",
  ],
  Trust: [
    "trust", "believ", "verif", "accura", "hallucinat", "reliab", "fact", "source", "honest", "decept", "deceiv",
    "lie", "lied", "privacy", "knows my", "knew my", "know my", "disclosed", "true", "skeptic", "transparen",
    "never told", "hidden", "hide", "hiding", "secret", "confess", "admit", "pretend", "as if i",
  ],
  Dependency: [
    "rely", "reli", "depend", "addict", "habit", "crutch", "outsourc", "without it", "every day", "everything",
    "convenien", "shortcut", "delegat", "lazy", "pacifier", "automatic", "can't stop", "give up", "always",
    "hand so much", "surrender", "generated", "how much of", "ask the model", "accept whatever", "reach for",
    "reaching for", "without asking",
  ],
  Creativity: [
    "creat", "art", "artist", "imagin", "draw", "design", "music", "idea", "invent", "discover", "spark", "curious",
    "curiosity", "explor", "play", "novel", "diversity", "variation", "unexpected", "breakthrough", "experiment",
  ],
  Work: [
    "work", "job", "career", "employ", "boss", "colleague", "productiv", "deadline", "profession", "skill", "office",
    "linkedin", "company", "hire", "hiring", "salary", "task", "efficien", "research group", "supervis", "code",
    "coding", "programm", "email", "agent", "automat", "replac", "nurs", "lab", "workplace", "prepar",
  ],
  "Human Agency": [
    "choice", "choose", "chose", "decide", "decision", "control", "agency", "freedom", "autonom", "judgment",
    "discernment", "my own", "ourselves", "think for", "relationship", "friend", "husband", "wife", "partner",
    "family", "people", "human", "conversation", "community", "slow down", "on my own", "deciding",
    "still be mine", "allowed",
  ],
};

export type ThemeMatch = { theme: Theme; hits: number; words: string[] };

const tokenize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .match(/[\p{L}\p{N}'-]+/gu) ?? [];

/** Every theme with at least one hit, strongest first. */
export function scoreThemes(text: string): ThemeMatch[] {
  const lower = ` ${text.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ")} `;
  const tokens = tokenize(text);
  const out: ThemeMatch[] = [];
  for (const theme of THEMES) {
    let hits = 0;
    const words = new Set<string>();
    for (const stem of THEME_LEXICON[theme]) {
      if (stem.includes(" ")) {
        const n = lower.split(` ${stem}`).length - 1;
        if (n) {
          hits += n * 2; // a phrase says more than a single word
          words.add(stem);
        }
        continue;
      }
      for (const token of tokens) {
        if (token.startsWith(stem)) {
          hits++;
          words.add(token);
        }
      }
    }
    if (hits) out.push({ theme, hits, words: [...words].slice(0, 8) });
  }
  return out.sort((a, b) => b.hits - a.hits || THEMES.indexOf(a.theme) - THEMES.indexOf(b.theme));
}

/**
 * The constellations a testimony joins: the strongest theme, plus any other
 * whose signal is at least `RELATIVE` of it, up to three. Short texts need a
 * single clear hit; long ones need a few, so a passing word doesn't count.
 */
const RELATIVE = 0.4;
export function matchThemes(text: string): Theme[] {
  const scored = scoreThemes(text);
  if (!scored.length) return [];
  const words = tokenize(text).length;
  const floor = Math.max(1, Math.round(words / 250));
  const top = scored[0].hits;
  if (top < floor) return [];
  return scored
    .filter((m) => m.hits >= floor && m.hits >= top * RELATIVE)
    .slice(0, 3)
    .map((m) => m.theme);
}

/** How well a guess agrees with an editor's choice. */
export function agreement(predicted: readonly string[], expected: readonly string[]) {
  const p = new Set(predicted);
  const e = new Set(expected);
  const both = [...p].filter((t) => e.has(t)).length;
  const union = new Set([...p, ...e]).size;
  return {
    precision: p.size ? both / p.size : e.size ? 0 : 1,
    recall: e.size ? both / e.size : 1,
    jaccard: union ? both / union : 1,
    hitAny: both > 0,
  };
}
