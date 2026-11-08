// The words people use, for the word cloud. Shared by the participant function
// (which counts them across stories) and the browser (which reads the
// participant's own story), so keep it free of browser- or Node-only code.

const list = (s: string) => new Set(s.split(/\s+/).filter(Boolean));

// Common words that say little on their own. Kept short and readable on purpose.
const STOP = list(`
  a about above after again against all almost also although always am among an and another any anyone anything
  are aren't around as at away back be became because become becomes been before being below between both but by
  came can can't cannot could couldn't did didn't do does doesn't doing don't done down during each either else
  enough even ever every everything few first for from get gets getting give given go goes going gone got had
  hadn't has hasn't have haven't having he her here hers herself him himself his how however i i'd i'll i'm i've
  if in into is isn't it it's its itself just know last least less let like likely lot lots made make makes making
  many may maybe me might mine more most much must my myself never new next no nor not now of off often oh ok okay
  on once one only onto or other others otherwise our ours ourselves out over own per perhaps put quite rather
  really right said same say says see seem seemed seems seen several shall she should shouldn't since so some
  someone something sometimes somewhat still such sure take taken than that that's the their theirs them
  themselves then there there's these they they're thing things think this those though through thus to too
  took toward towards try trying under until up upon us use used uses using very via was wasn't way ways we we're
  we've well went were weren't what what's whatever when where whether which while who whom whose why will with
  within without won't would wouldn't yes yet you you're your yours yourself yourselves also actually feel felt
  want wanted year years time times day days lot kind sort able etc
`);

const MIN_LENGTH = 3;

/** The distinct, meaningful words in a text, lower-cased. "AI" is kept despite being short. */
export function storyWords(text: string): Set<string> {
  const tokens =
    text
      .toLowerCase()
      .replace(/[‘’]/g, "'")
      .match(/[\p{L}\p{N}']+/gu) ?? [];
  const out = new Set<string>();
  for (const raw of tokens) {
    const token = raw.replace(/^'+|'+$/g, "").replace(/'s$/, "");
    if (/^\p{N}+$/u.test(token) || STOP.has(token)) continue;
    if (token.length < MIN_LENGTH && token !== "ai") continue;
    if (token.length > 24) continue;
    out.add(token);
  }
  return out;
}

/** How many words the cloud shows at most. */
export const CLOUD_SIZE = 60;
