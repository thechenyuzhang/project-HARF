// The constellation looks and title wordings. The home page uses Letter Sky with
// "On AI and Us: The Observatory"; /concepts/ keeps every combination for review.

export type LookId = "letters" | "chart" | "field" | "atlas";

export type Look = {
  id: LookId;
  tab: string;
  /** One line on what makes this direction different. */
  note: string;
  /** CSS background of the fixed backdrop, behind the canvas. */
  backdrop: string;
  /** Title and accent colours for the page content. */
  ink: string;
  accent: string;
  /** Colour the sky is dimmed with, so text stays readable over it. */
  veil: string;
  defaultTitle: TitleId;
};

export const LOOKS: Look[] = [
  {
    id: "letters",
    tab: "Letter Sky",
    note: "Every star is a letter. Constellations spell the words people use about AI.",
    backdrop: "radial-gradient(120% 90% at 50% 40%, #0b0e19 0%, #05060c 55%, #020308 100%)",
    ink: "#ffffff",
    accent: "#cfd8ff",
    veil: "3,4,9",
    defaultTitle: "observatory",
  },
  {
    id: "chart",
    tab: "Star Chart",
    note: "A modern star map: navy, cream and teal, with words plotted like named constellations.",
    backdrop: "radial-gradient(110% 100% at 50% 55%, #17304a 0%, #10233a 50%, #0a1626 100%)",
    ink: "#ece0bd",
    accent: "#6fc3c4",
    veil: "9,20,34",
    defaultTitle: "review",
  },
  {
    id: "field",
    tab: "Deep Field",
    note: "Monochrome and dense. The Milky Way is made of tiny words; boundaries follow the grid.",
    backdrop: "#000000",
    ink: "#ffffff",
    accent: "#ffffff",
    veil: "0,0,0",
    defaultTitle: "observatory-plain",
  },
  {
    id: "atlas",
    tab: "Antique Atlas",
    note: "Gold on midnight blue, after engraved celestial atlases: meridians, rings and eight-point stars.",
    backdrop: "radial-gradient(120% 110% at 68% 50%, #131c3f 0%, #0c1330 55%, #080d22 100%)",
    ink: "#ecd3a0",
    accent: "#d9b77a",
    veil: "8,12,32",
    defaultTitle: "us",
  },
];

export type TitleId = "observatory" | "review" | "observatory-plain" | "us" | "constellation" | "current";

export type Title = {
  id: TitleId;
  /** Short name on the picker. */
  label: string;
  /** Where the wording comes from. */
  source: "Allison" | "Variation" | "Live today";
  kicker?: string;
  main: string;
  sub: string;
};

const RECORD = "A living record of our relationship with artificial intelligence.";

export const TITLES: Title[] = [
  {
    id: "observatory",
    label: "On AI and Us: The Observatory",
    source: "Allison",
    kicker: "On AI and Us:",
    main: "The Observatory",
    sub: RECORD,
  },
  {
    id: "review",
    label: "The Intelligence Review",
    source: "Allison",
    main: "The Intelligence Review",
    sub: RECORD,
  },
  {
    id: "observatory-plain",
    label: "The Observatory",
    source: "Variation",
    main: "The Observatory",
    sub: "On AI and us: a living record of our relationship with artificial intelligence.",
  },
  {
    id: "us",
    label: "On AI and Us",
    source: "Variation",
    kicker: "The Intelligence Review",
    main: "On AI and Us",
    sub: RECORD,
  },
  {
    id: "constellation",
    label: "A Constellation of AI and Us",
    source: "Variation",
    main: "A Constellation of AI and Us",
    sub: "A living record of our relationship with artificial intelligence, one voice at a time.",
  },
  {
    id: "current",
    label: "A Living Memory (current)",
    source: "Live today",
    main: "A Living Memory of the AI Transition",
    sub: "We are experiencing a transformation we do not yet fully understand.",
  },
];
