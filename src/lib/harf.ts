// Shared vocabulary for HARF. Imported by both the web app and the backend
// functions, so keep this file free of browser- or Node-only code.

export const THEMES = [
  "Learning",
  "Authorship",
  "Identity",
  "Trust",
  "Dependency",
  "Creativity",
  "Work",
  "Human Agency",
] as const;
export type Theme = (typeof THEMES)[number];

export const OPTIONAL_PROMPTS = [
  { id: "confidence", text: "Has AI changed how confident you feel about your own thinking?" },
  { id: "hidden", text: "Have you ever hidden how much you rely on AI?" },
  { id: "discovery", text: "Has AI helped you discover an ability you didn't know you had?" },
  { id: "speed", text: "Do you sometimes feel overwhelmed by the speed of technological change?" },
  { id: "learning", text: "Has AI changed how you learn or approach difficult problems?" },
  { id: "delegated", text: "Is there something you no longer do yourself because AI does it for you?" },
  {
    id: "understood",
    text: "What do you wish your professors, colleagues, or employers understood about your experience?",
  },
] as const;

// Opening of the share flow: an easy first answer, then a concrete moment.
export const OPENING_QUESTION = "Have you noticed AI changing the way you think?";
export const NOTICED_CHANGE = [
  "I rely on it more than I expected.",
  "I feel more capable with it.",
  "I sometimes question my own abilities.",
  "I haven't noticed much change.",
  "I'm still figuring it out.",
] as const;
export const FIRST_NOTICED_PROMPT = "Can you remember a moment when you first noticed this?";

export const MAIN_PROMPT =
  "Can you describe a specific moment when AI changed something about the way you think, work, learn, or relate to others?";

// Shown after a contribution. One reflection for the MVP; could vary by theme later.
export const REFLECTION = "What if the most important change isn't what AI can do, but what you no longer do without it?";

export const RELATIONSHIPS = ["Student", "Educator", "Researcher", "Professional", "Other"] as const;

// Optional "About you" questions. Every one can be skipped.
export const AGE_RANGES = ["18–24", "25–34", "35–44", "45–54", "55–64", "65+"] as const;

export const GENDERS = ["Woman", "Man", "Non-binary", "Self-describe"] as const;

export const ACADEMIC_STAGES = [
  "Undergraduate",
  "Master's",
  "PhD",
  "Postdoc",
  "Faculty",
  "Staff",
  "Not in academia",
] as const;

// Optional "Your AI use" questions.
export const AI_TOOLS = [
  "ChatGPT (OpenAI)",
  "Claude (Anthropic)",
  "Gemini (Google)",
  "DeepSeek",
  "Copilot (Microsoft)",
  "Meta AI",
  "Perplexity",
  "Grok (xAI)",
  "Le Chat (Mistral)",
  "Qwen (Alibaba)",
  "Other",
  "I don't use AI",
] as const;

export const AI_DURATIONS = ["Under 6 months", "6–12 months", "1–2 years", "2+ years"] as const;

export const AI_USES = [
  "Writing",
  "Studying",
  "Research and reading",
  "Coding",
  "Brainstorming",
  "Work tasks",
  "Conversation or support",
  "Other",
] as const;

export const AI_USE_FREQUENCIES = [
  "Several times a day",
  "About daily",
  "A few times a week",
  "A few times a month",
  "Rarely",
  "Never",
] as const;

export const FEELINGS = [
  "Excited",
  "Empowered",
  "Curious",
  "Anxious",
  "Overwhelmed",
  "Dependent",
  "Conflicted",
  "Skeptical",
  "Other",
] as const;

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "ar", label: "العربية" },
  { code: "hi", label: "हिन्दी" },
  { code: "other", label: "Other" },
] as const;

export const EDITORIAL_STATUSES = [
  "NEW",
  "IN_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
  "WITHDRAWN",
] as const;
export type EditorialStatus = (typeof EDITORIAL_STATUSES)[number];

/**
 * The consent wording a participant agrees to. Bump the version whenever the
 * text changes: every testimony stores the version it was submitted under.
 */
export const CONSENT_VERSION = "2026-10-29.v3";

export const CONSENT_TEXT = {
  research:
    "I am 18 or older, and I agree that HARF may store my contribution and analyze it for the research purposes described in the privacy notice. This is required to submit.",
  publish:
    "HARF may publish an anonymized excerpt of my contribution in the Living Archive after editorial review. Nothing is published automatically.",
  contact:
    "HARF may contact me about a future interview. My contact details are stored separately from my testimony and never published.",
  revisit:
    "HARF may email me in about six months to invite me to revisit my answers. My email is stored separately from my contribution, never published, and used for nothing else.",
  community:
    "HARF may email me occasional community updates and invitations to share my experience. My email is stored separately from any contribution, never published or shared, and I can ask to be removed at any time.",
} as const;

export const LIMITS = {
  testimonyMin: 20,
  testimonyMax: 20000,
  shortField: 120,
  excerptMax: 2000,
} as const;

/** Attachments: images, audio and video, checked again on the server. */
export const MEDIA = {
  maxFiles: 5,
  maxBytes: 50 * 1024 * 1024,
  types: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
    "audio/mpeg",
    "audio/mp4",
    "audio/x-m4a",
    "audio/wav",
    "audio/webm",
    "audio/ogg",
    "video/mp4",
    "video/quicktime",
    "video/webm",
  ],
} as const;

export function isAllowedMediaType(type: string): boolean {
  return (MEDIA.types as readonly string[]).includes(type);
}

/** Anonymous usage events. Anything else sent to `track` is rejected. */
export const ANALYTICS_EVENTS = [
  "page_view",
  "share_click",
  "survey_click",
  "archive_click",
  "qotw_click",
  "story_start",
  "story_submit",
  "survey_view",
  "survey_start",
  "survey_submit",
  "followup_optin",
  "community_join",
] as const;
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

/** Participant codes look like HARF-7K2M-QX9D-4TPA (60 bits of entropy). */
export const PARTICIPANT_CODE_PATTERN = /^HARF-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
export const PARTICIPANT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeParticipantCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = raw.startsWith("HARF") ? raw.slice(4) : raw;
  if (body.length !== 12) return input.trim().toUpperCase();
  return `HARF-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
}
