// FICTIONAL sample testimonies, shared by scripts/seed.ts (test data for the
// editor dashboard) and scripts/check-theme-matcher.ts (editor-labelled themes
// to measure the constellation matcher against).

export type Seed = {
  id: string;
  at: string;
  code: string;
  entry?: number;
  text: string;
  promptId?: string;
  promptText?: string;
  relationship?: string;
  fieldOfWork?: string;
  country?: string;
  aiUseFrequency?: string;
  feelings?: string[];
  publish: boolean;
  status: "NEW" | "IN_REVIEW" | "APPROVED" | "PUBLISHED";
  themes?: string[];
  excerpt?: string;
};

export const SEEDS: Seed[] = [
  {
    id: "seed-0001",
    at: "2026-05-12T14:20:00.000Z",
    code: "HARF-SEED-AAAA-0001",
    entry: 1,
    text: "Fictional sample. I'm a second-year comparative literature student. This spring I realized I had stopped finishing my own sentences. I would write half a thought, ask the model to 'make it flow', and accept whatever came back. My grades went up. My confidence in my own writing went down. I don't know how to explain that to my advisor without sounding like I'm confessing to something.",
    promptId: "confidence",
    promptText: "Has AI changed how confident you feel about your own thinking?",
    relationship: "Student",
    fieldOfWork: "Comparative Literature",
    country: "United States",
    aiUseFrequency: "Several times a day",
    feelings: ["Dependent", "Conflicted", "Anxious"],
    publish: true,
    status: "PUBLISHED",
    themes: ["Authorship", "Identity", "Dependency"],
    excerpt:
      "My grades went up. My confidence in my own writing went down. I don't know how to explain that without sounding like I'm confessing to something.",
  },
  {
    id: "seed-0002",
    at: "2026-10-21T19:05:00.000Z",
    code: "HARF-SEED-AAAA-0001",
    entry: 2,
    text: "Fictional sample. Coming back to this after the summer. I made a rule: I write the ugly first draft completely alone, and only then do I argue with the AI about it. It turns out I like arguing with it more than obeying it. I feel more confident now than before any of this started, which I would not have predicted in May.",
    relationship: "Student",
    fieldOfWork: "Comparative Literature",
    country: "United States",
    aiUseFrequency: "About daily",
    feelings: ["Empowered", "Curious"],
    publish: true,
    status: "PUBLISHED",
    themes: ["Authorship", "Learning", "Human Agency"],
    excerpt:
      "I write the ugly first draft completely alone, and only then do I argue with the AI about it. It turns out I like arguing with it more than obeying it.",
  },
  {
    id: "seed-0003",
    at: "2026-09-30T16:40:00.000Z",
    code: "HARF-SEED-BBBB-0002",
    text: "Fictional sample. I teach introductory statistics. This semester I stopped grading the final answers and started grading the questions students ask along the way. Half my colleagues think I've given up. I think I've finally noticed what the course was for.",
    promptId: "understood",
    promptText: "What do you wish your professors, colleagues, or employers understood about your experience?",
    relationship: "Educator",
    fieldOfWork: "Statistics",
    country: "United States",
    aiUseFrequency: "A few times a week",
    feelings: ["Curious", "Conflicted"],
    publish: true,
    status: "PUBLISHED",
    themes: ["Learning", "Work"],
    excerpt:
      "I stopped grading the final answers and started grading the questions students ask along the way. Half my colleagues think I've given up. I think I've finally noticed what the course was for.",
  },
  {
    id: "seed-0004",
    at: "2026-10-02T22:15:00.000Z",
    code: "HARF-SEED-CCCC-0003",
    text: "Fictional sample. I've never told anyone in my lab how much of my code is generated. In group meetings I explain it as if I wrote every line. Sometimes I'm not sure I could. The strange part is that nobody would mind — I'm the one who minds.",
    promptId: "hidden",
    promptText: "Have you ever hidden how much you rely on AI?",
    relationship: "Researcher",
    fieldOfWork: "Computational Biology",
    country: "Brazil",
    aiUseFrequency: "Several times a day",
    feelings: ["Dependent", "Anxious"],
    publish: true,
    status: "PUBLISHED",
    themes: ["Trust", "Identity", "Dependency"],
    excerpt: "In group meetings I explain it as if I wrote every line. Sometimes I'm not sure I could. Nobody would mind — I'm the one who minds.",
  },
  {
    id: "seed-0005",
    at: "2026-10-09T11:30:00.000Z",
    code: "HARF-SEED-DDDD-0004",
    text: "Fictional sample. I always believed I was 'not a visual person'. I started describing images to a model just to see what would come out, then I started correcting it, then sketching over its results. Three months later I'm drawing on paper every evening. AI didn't make me creative, but it removed the shame of starting.",
    promptId: "discovery",
    promptText: "Has AI helped you discover an ability you didn't know you had?",
    relationship: "Professional",
    fieldOfWork: "Accounting",
    country: "Portugal",
    aiUseFrequency: "A few times a week",
    feelings: ["Excited", "Empowered"],
    publish: true,
    status: "PUBLISHED",
    themes: ["Creativity", "Identity"],
    excerpt: "AI didn't make me creative, but it removed the shame of starting.",
  },
  {
    id: "seed-0006",
    at: "2026-10-14T08:50:00.000Z",
    code: "HARF-SEED-EEEE-0005",
    text: "Fictional sample. Every time I learn a tool, it changes. I'm a nursing student and I feel like I'm preparing for a profession whose shape nobody can describe. It isn't fear of being replaced exactly. It's not knowing which parts of what I'm learning will still be mine.",
    promptId: "speed",
    promptText: "Do you sometimes feel overwhelmed by the speed of technological change?",
    relationship: "Student",
    fieldOfWork: "Nursing",
    country: "United States",
    aiUseFrequency: "A few times a month",
    feelings: ["Overwhelmed", "Skeptical"],
    publish: true,
    status: "PUBLISHED",
    themes: ["Work", "Human Agency"],
    excerpt: "It isn't fear of being replaced exactly. It's not knowing which parts of what I'm learning will still be mine.",
  },
  {
    id: "seed-0007",
    at: "2026-10-23T13:10:00.000Z",
    code: "HARF-SEED-FFFF-0006",
    text: "Fictional sample. I no longer read the full papers. I read the summary, then the abstract, then sometimes the figures. Last week a friend asked me about a study I had 'read' and I realized I could only repeat the summary's phrasing. I felt like a translator of something I'd never seen in the original.",
    promptId: "delegated",
    promptText: "Is there something you no longer do yourself because AI does it for you?",
    relationship: "Student",
    fieldOfWork: "Public Health",
    country: "India",
    aiUseFrequency: "Several times a day",
    feelings: ["Conflicted", "Dependent"],
    publish: false,
    status: "IN_REVIEW",
    themes: ["Learning", "Dependency"],
  },
  {
    id: "seed-0008",
    at: "2026-10-26T20:45:00.000Z",
    code: "HARF-SEED-GGGG-0007",
    text: "Fictional sample. I use it to rehearse difficult conversations before office hours. It's the first time I've gone to a professor with a question that wasn't already half an apology. I don't think the AI taught me statistics. I think it taught me that asking is allowed.",
    promptId: "learning",
    promptText: "Has AI changed how you learn or approach difficult problems?",
    relationship: "Student",
    fieldOfWork: "Economics",
    country: "Mexico",
    aiUseFrequency: "About daily",
    feelings: ["Empowered", "Curious"],
    publish: true,
    status: "NEW",
  },
  {
    id: "seed-0009",
    at: "2026-10-27T09:05:00.000Z",
    code: "HARF-SEED-HHHH-0008",
    text: "Fictional sample. I'm an architect and I'm skeptical. The renderings are impressive but they flatten the arguments we used to have in the studio. Everyone converges faster. I'm not sure converging faster is the same as thinking better.",
    relationship: "Professional",
    fieldOfWork: "Architecture",
    country: "Italy",
    aiUseFrequency: "A few times a week",
    feelings: ["Skeptical"],
    publish: true,
    status: "NEW",
  },
];
