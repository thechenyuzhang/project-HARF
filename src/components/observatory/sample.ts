// FICTIONAL sample data for reviewing the Observatory before real excerpts are
// published. Shown only when the page is opened with #sample, under a banner.

import type { SkyStarData, Story } from "./stories";

const S = (
  id: string,
  date: string,
  themes: Story["themes"],
  role: string,
  country: string,
  ageRange: string,
  text: string,
  extra: Partial<Story> = {},
): Story => ({ id, date, exactDate: false, themes, role, country, ageRange, text, featured: false, synthetic: true, ...extra });

export const SAMPLE_STORIES: Story[] = [
  S("s01", "2026-05-01", ["Authorship", "Identity"], "Student", "United States", "18–24", "My grades went up. My confidence in my own writing went down."),
  S("s02", "2026-06-01", ["Learning", "Work"], "Educator", "United States", "45–54", "I stopped grading the final answers and started grading the questions students ask along the way."),
  S("s03", "2026-07-01", ["Trust", "Dependency"], "Researcher", "Brazil", "25–34", "In group meetings I explain the code as if I wrote every line. Sometimes I'm not sure I could."),
  S("s04", "2026-07-01", ["Creativity", "Identity"], "Professional", "Portugal", "35–44", "AI didn't make me creative, but it removed the shame of starting."),
  S("s05", "2026-08-01", ["Work", "Human Agency"], "Student", "Kenya", "18–24", "It's not knowing which parts of what I'm learning will still be mine."),
  S("s06", "2026-08-01", ["Learning", "Dependency"], "Student", "India", "25–34", "I could only repeat the summary's phrasing. I felt like a translator of something I'd never seen."),
  S("s07", "2026-09-01", ["Learning", "Human Agency"], "Student", "Mexico", "25–34", "I don't think the AI taught me statistics. I think it taught me that asking is allowed."),
  S("s08", "2026-09-01", ["Work", "Trust"], "Professional", "Italy", "55–64", "Everyone converges faster. I'm not sure converging faster is the same as thinking better."),
  S("s09", "2026-09-01", ["Identity", "Human Agency"], "Researcher", "China", "35–44", "I write my first thoughts in Chinese, then ask it to make them English. Lately I skip the first step."),
  S("s10", "2026-10-01", ["Dependency"], "Student", "China", "18–24", "I open it before I open the problem. That's the habit I want to break."),
  S("s11", "2026-10-01", ["Creativity", "Work"], "Professional", "South Africa", "25–34", "It drafts the boring parts so I can argue about the interesting ones."),
  S("s12", "2026-10-01", ["Trust"], "Educator", "Germany", "45–54", "I trust it like a confident stranger: useful, and never the last word."),
  S("s13", "2026-11-01", ["Authorship", "Human Agency"], "Student", "Brazil", "25–34", "The words you choose to say to someone you love should come from you."),
  S("s14", "2026-11-01", ["Learning", "Creativity"], "Student", "Nigeria", "18–24", "It found me a course I didn't know existed. Then I had to do the work myself."),
  S(
    "s15",
    "2026-09-08",
    ["Identity", "Work", "Human Agency"],
    "Researcher",
    "South Africa",
    "35–44",
    "Our individual limitations and mistakes can contribute to something collectively useful.",
    {
      title: "“A sample credited testimony”",
      exactDate: true,
      creditName: "Sample Contributor",
      creditLine: "Researcher · Sample University",
      featured: true,
      body:
        "This is a fictional sample of a full, credited testimony, shown so editors can review the reader.\n\nA testimony can run to many paragraphs, with the occasional pull quote.\n\n> “Our individual limitations and mistakes can contribute to something collectively useful.”\n\nShort lines without a full stop become headings\n\nAnd the reader keeps going until the end of the piece.",
    },
  ),
];

/** Anonymous stars: testimonies still waiting for an editor, plus the published ones above. */
export const SAMPLE_SKY: SkyStarData[] = [
  ...SAMPLE_STORIES.map((s) => ({ key: `k${s.id}`, themes: s.themes, verified: true, month: s.date.slice(0, 7), excerptId: s.id })),
  ...Array.from({ length: 34 }, (_, i) => {
    const themes = [
      ["Learning"], ["Dependency", "Learning"], ["Work"], ["Trust"], ["Identity"], ["Human Agency"],
      ["Creativity"], ["Authorship", "Learning"], ["Dependency"], ["Work", "Human Agency"], ["Learning"],
    ][i % 11];
    const month = `2026-${String(6 + (i % 6)).padStart(2, "0")}`;
    return { key: `anon${i}`, themes, verified: i % 3 === 0, month, excerptId: null };
  }),
];
