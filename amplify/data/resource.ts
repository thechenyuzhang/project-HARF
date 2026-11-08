import { a, defineData, type ClientSchema } from "@aws-amplify/backend";
import { submitTestimony } from "../functions/submit-testimony/resource";
import { editorial } from "../functions/editorial/resource";
import { participant } from "../functions/participant/resource";

/*
 * Data model
 *
 * Testimony      private. The original, unedited contribution plus context,
 *                consent record and editorial metadata. Created only by the
 *                submitTestimony function; editors can read it but can never
 *                change the original text, context or consent fields.
 * Contact        private, separate table. Only exists when the participant
 *                opted in: to an interview (from the consent step) or to a
 *                six-month invitation to revisit their answers.
 * WithdrawalRequest  private. Removal requests sent from the privacy page.
 * AnalyticsEvent private, anonymous usage events written by the participant
 *                function; they expire after about 13 months.
 *
 * Deletion goes through the removeTestimony function so a testimony never
 * leaves an orphaned contact record or public excerpt behind.
 * Excerpt        public. An edited, anonymized excerpt. Created only by the
 *                editorial function after it checks publication consent, and
 *                carries no reference back to the private testimony.
 * WeeklyQuestion public. The Question of the Week, managed by editors.
 *
 * Attached media live in S3 (see storage/resource.ts); a testimony stores
 * only their keys and metadata.
 *
 * Longitudinal participation: participants receive a private code. Only a
 * SHA-256 hash of it (participantRef) is stored, which links a person's
 * testimonies over time without identifying them.
 */

const editorsReadOnly = (allow: Parameters<Parameters<ReturnType<typeof a.string>["authorization"]>[0]>[0]) => [
  allow.group("ADMINS").to(["read"]),
];

const schema = a.schema({
  EditorialStatus: a.enum(["NEW", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED", "WITHDRAWN"]),
  Channel: a.enum(["OPEN", "WEEKLY_QUESTION"]),
  MediaItem: a.customType({
    key: a.string().required(),
    name: a.string(),
    contentType: a.string(),
    size: a.integer(),
  }),

  Testimony: a
    .model({
      // Immutable record of what the participant wrote and agreed to.
      submittedAt: a.datetime().required().authorization(editorsReadOnly),
      language: a.string().authorization(editorsReadOnly),
      originalText: a.string().required().authorization(editorsReadOnly),
      channel: a.ref("Channel").authorization(editorsReadOnly),
      promptId: a.string().authorization(editorsReadOnly),
      promptText: a.string().authorization(editorsReadOnly),
      weeklyQuestionWeekOf: a.date().authorization(editorsReadOnly),
      noticedChange: a.string().authorization(editorsReadOnly),
      firstNoticed: a.string().authorization(editorsReadOnly),
      weeklyQuestionId: a.id().authorization(editorsReadOnly),
      participantRef: a.string().required().authorization(editorsReadOnly),
      entryNumber: a.integer().authorization(editorsReadOnly),
      relationship: a.string().authorization(editorsReadOnly),
      fieldOfWork: a.string().authorization(editorsReadOnly),
      country: a.string().authorization(editorsReadOnly), // the country they're in when contributing
      countryOfBirth: a.string().authorization(editorsReadOnly),
      ageRange: a.string().authorization(editorsReadOnly),
      gender: a.string().authorization(editorsReadOnly),
      genderSelfDescribed: a.string().authorization(editorsReadOnly),
      firstLanguage: a.string().authorization(editorsReadOnly),
      academicStage: a.string().authorization(editorsReadOnly),
      mainAiTool: a.string().authorization(editorsReadOnly),
      otherAiTools: a.string().array().authorization(editorsReadOnly),
      aiDuration: a.string().authorization(editorsReadOnly),
      aiUses: a.string().array().authorization(editorsReadOnly),
      aiUseFrequency: a.string().authorization(editorsReadOnly),
      feelings: a.string().array().authorization(editorsReadOnly),
      feelingsOther: a.string().authorization(editorsReadOnly),
      consentResearch: a.boolean().required().authorization(editorsReadOnly),
      consentPublish: a.boolean().required().authorization(editorsReadOnly),
      consentContact: a.boolean().required().authorization(editorsReadOnly),
      consentVersion: a.string().required().authorization(editorsReadOnly),
      consentRecordedAt: a.datetime().required().authorization(editorsReadOnly),
      contactId: a.id().authorization(editorsReadOnly),
      media: a.ref("MediaItem").array().authorization(editorsReadOnly),
      synthetic: a.boolean().authorization(editorsReadOnly),
      tone: a.string().authorization(editorsReadOnly), // broad word-list label from src/lib/tone.ts, for community counts
      // Editorial layer. Kept apart from the original text.
      editorialStatus: a.ref("EditorialStatus").required(),
      themes: a.string().array(),
      editorNotes: a.string(),
      excerptDraft: a.string(),
      excerptId: a.id(),
      reviewedAt: a.datetime(),
    })
    .secondaryIndexes((index) => [
      index("participantRef").sortKeys(["submittedAt"]).name("byParticipant").queryField("listTestimoniesByParticipant"),
    ])
    .authorization((allow) => [allow.group("ADMINS").to(["read", "update"])]),

  ContactPurpose: a.enum(["INTERVIEW", "SIX_MONTH_REVISIT", "COMMUNITY"]),

  Contact: a
    .model({
      purpose: a.ref("ContactPurpose"),
      source: a.string(), // "story" or "survey"
      testimonyId: a.id(), // absent for survey opt-ins: Tally keeps its own responses
      participantRef: a.string(),
      name: a.string(),
      email: a.email(),
      notes: a.string(),
      remindAfter: a.date(),
      consentVersion: a.string(),
    })
    .authorization((allow) => [allow.group("ADMINS").to(["read"])]),

  Excerpt: a
    .model({
      text: a.string().required(),
      themes: a.string().array(),
      participantCategory: a.string(),
      language: a.string(),
      contributedOn: a.date(),
      publishedAt: a.datetime().required(),
      synthetic: a.boolean(),
      featured: a.boolean(), // hand-picked by an editor for the homepage
    })
    .authorization((allow) => [allow.guest().to(["read"]), allow.group("ADMINS").to(["read", "update"])]),

  WithdrawalRequest: a
    .model({
      participantRef: a.string(),
      message: a.string().required(),
      replyEmail: a.email(),
      resolved: a.boolean(),
    })
    .authorization((allow) => [allow.group("ADMINS").to(["read", "update", "delete"])]),

  AnalyticsEvent: a
    .model({
      name: a.string().required(),
      path: a.string(),
      referrer: a.string(),
      device: a.string(),
      visitorId: a.string(),
      from: a.string(),
      expiresAt: a.timestamp(),
    })
    .authorization((allow) => [allow.group("ADMINS").to(["read"])]),

  WeeklyQuestion: a
    .model({
      question: a.string().required(),
      introduction: a.string(),
      weekOf: a.date().required(),
      active: a.boolean().required(),
    })
    .authorization((allow) => [allow.guest().to(["read"]), allow.group("ADMINS")]),

  SubmitTestimonyResult: a.customType({
    testimonyId: a.id().required(),
    participantCode: a.string().required(),
    entryNumber: a.integer().required(),
  }),

  CommunityStat: a.customType({
    dimension: a.string().required(),
    label: a.string().required(),
    count: a.integer().required(),
    respondents: a.integer().required(),
  }),

  ParticipantEntry: a.customType({
    entryNumber: a.integer(),
    submittedOn: a.date().required(),
    tone: a.string(),
    toneScore: a.float(),
    words: a.integer(),
    feelings: a.string().array(),
    aiUseFrequency: a.string(),
    mainAiTool: a.string(),
    noticedChange: a.string(),
  }),

  // A participant's own entries, oldest first, for the "over time" view. The
  // private participant code proves who is asking; no story text is returned.
  myEntries: a
    .query()
    .arguments({ participantCode: a.string().required() })
    .returns(a.ref("ParticipantEntry").array())
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(participant)),

  // Rounded counts for the charts shown after a story; small groups are left out.
  communityStats: a
    .query()
    .returns(a.ref("CommunityStat").array())
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(participant)),

  submitTestimony: a
    .mutation()
    .arguments({
      text: a.string().required(),
      language: a.string(),
      channel: a.string(),
      promptId: a.string(),
      weeklyQuestionId: a.id(),
      participantCode: a.string(),
      relationship: a.string(),
      fieldOfWork: a.string(),
      country: a.string(),
      countryOfBirth: a.string(),
      ageRange: a.string(),
      gender: a.string(),
      genderSelfDescribed: a.string(),
      firstLanguage: a.string(),
      academicStage: a.string(),
      mainAiTool: a.string(),
      otherAiTools: a.string().array(),
      aiDuration: a.string(),
      aiUses: a.string().array(),
      aiUseFrequency: a.string(),
      feelings: a.string().array(),
      feelingsOther: a.string(),
      consentResearch: a.boolean().required(),
      consentPublish: a.boolean().required(),
      consentContact: a.boolean().required(),
      consentVersion: a.string().required(),
      contactName: a.string(),
      contactEmail: a.string(),
      noticedChange: a.string(),
      firstNoticed: a.string(),
      mediaKeys: a.string().array(), // S3 keys under uploads/, from the browser upload
      website: a.string(), // honeypot: real people leave this empty
    })
    .returns(a.ref("SubmitTestimonyResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(submitTestimony)),

  publishExcerpt: a
    .mutation()
    .arguments({
      testimonyId: a.id().required(),
      text: a.string().required(),
      themes: a.string().array(),
      participantCategory: a.string(),
    })
    .returns(a.ref("Excerpt"))
    .authorization((allow) => [allow.group("ADMINS")])
    .handler(a.handler.function(editorial)),

  // Permanent removal on a participant's request: deletes the testimony with its
  // contact record and any published excerpt.
  removeTestimony: a
    .mutation()
    .arguments({ testimonyId: a.id().required() })
    .returns(a.boolean())
    .authorization((allow) => [allow.group("ADMINS")])
    .handler(a.handler.function(editorial)),

  // Optional invitation to come back in six months. A story opt-in must prove
  // it owns the testimony with the participant code returned on submission.
  requestRevisit: a
    .mutation()
    .arguments({
      email: a.string().required(),
      consent: a.boolean().required(),
      consentVersion: a.string().required(),
      source: a.string().required(),
      testimonyId: a.id(),
      participantCode: a.string(),
      purpose: a.string(), // "SIX_MONTH_REVISIT" (default) or "COMMUNITY"
    })
    .returns(a.boolean())
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(participant)),

  requestWithdrawal: a
    .mutation()
    .arguments({ message: a.string().required(), participantCode: a.string(), replyEmail: a.string() })
    .returns(a.boolean())
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(participant)),

  track: a
    .mutation()
    .arguments({
      name: a.string().required(),
      path: a.string(),
      referrer: a.string(),
      device: a.string(),
      visitorId: a.string(),
      from: a.string(),
    })
    .returns(a.boolean())
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(participant)),

  unpublishExcerpt: a
    .mutation()
    .arguments({ testimonyId: a.id().required() })
    .returns(a.boolean())
    .authorization((allow) => [allow.group("ADMINS")])
    .handler(a.handler.function(editorial)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "identityPool",
  },
});
