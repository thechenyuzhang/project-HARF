import { randomBytes, randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Schema } from "../../data/resource";
import { EMAIL_PATTERN, participantRefFor } from "../shared/participant-ref";
import {
  ACADEMIC_STAGES,
  AGE_RANGES,
  AI_DURATIONS,
  AI_TOOLS,
  AI_USES,
  AI_USE_FREQUENCIES,
  GENDERS,
  NOTICED_CHANGE,
  CONSENT_VERSION,
  FEELINGS,
  LANGUAGES,
  LIMITS,
  MEDIA,
  OPTIONAL_PROMPTS,
  PARTICIPANT_CODE_ALPHABET,
  PARTICIPANT_CODE_PATTERN,
  RELATIONSHIPS,
  isAllowedMediaType,
  normalizeParticipantCode,
} from "../../../src/lib/harf";
import { readTone } from "../../../src/lib/tone";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const TESTIMONY_TABLE = process.env.TESTIMONY_TABLE!;
const CONTACT_TABLE = process.env.CONTACT_TABLE!;
const WEEKLY_QUESTION_TABLE = process.env.WEEKLY_QUESTION_TABLE!;
const MEDIA_BUCKET = process.env.MEDIA_BUCKET!;

const s3 = new S3Client({});
const UPLOAD_KEY = /^uploads\/[0-9a-f-]{36}\/([^/]{1,200})$/;

type MediaItem = { key: string; name: string; contentType: string; size: number };

/**
 * Checks each browser upload (type, size) and copies it from uploads/, which
 * expires, to media/<testimonyId>/, which only editors can read.
 */
async function claimMedia(keys: (string | null)[] | null | undefined, testimonyId: string): Promise<MediaItem[]> {
  const unique = [...new Set((keys ?? []).filter((k): k is string => !!k))];
  if (unique.length > MEDIA.maxFiles) throw new ValidationError(`You can attach up to ${MEDIA.maxFiles} files.`);
  const claimed: MediaItem[] = [];
  try {
    for (const [i, uploadKey] of unique.entries()) {
      const match = UPLOAD_KEY.exec(uploadKey);
      if (!match) throw new ValidationError("One of the attachments couldn't be found. Please attach it again.");
      const head = await s3.send(new HeadObjectCommand({ Bucket: MEDIA_BUCKET, Key: uploadKey })).catch(() => {
        throw new ValidationError("One of the attachments couldn't be found. Please attach it again.");
      });
      const contentType = head.ContentType ?? "";
      const size = head.ContentLength ?? 0;
      if (!isAllowedMediaType(contentType) || size > MEDIA.maxBytes) {
        await deleteObjects([uploadKey]);
        throw new ValidationError(
          isAllowedMediaType(contentType)
            ? `Each file must be under ${MEDIA.maxBytes / 1024 / 1024} MB.`
            : "Only images, audio and video can be attached.",
        );
      }
      const name = match[1];
      const key = `media/${testimonyId}/${i + 1}-${name}`;
      await s3.send(
        new CopyObjectCommand({
          Bucket: MEDIA_BUCKET,
          Key: key,
          CopySource: `${MEDIA_BUCKET}/${encodeURIComponent(uploadKey).replace(/%2F/g, "/")}`,
          ContentType: contentType,
          MetadataDirective: "REPLACE",
        }),
      );
      claimed.push({ key, name, contentType, size });
    }
    return claimed;
  } catch (err) {
    await deleteObjects(claimed.map((m) => m.key));
    throw err;
  }
}

async function deleteObjects(keys: string[]) {
  await Promise.all(
    keys.map((Key) => s3.send(new DeleteObjectCommand({ Bucket: MEDIA_BUCKET, Key })).catch(() => undefined)),
  );
}

class ValidationError extends Error {}

function clean(value: string | null | undefined, max: number = LIMITS.shortField): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > max) throw new ValidationError(`A field is longer than ${max} characters.`);
  return trimmed;
}

function oneOf<T extends readonly string[]>(value: string | null | undefined, allowed: T): T[number] | undefined {
  const v = clean(value);
  if (v === undefined) return undefined;
  if (!(allowed as readonly string[]).includes(v)) throw new ValidationError(`Unexpected value: ${v}`);
  return v;
}

function newParticipantCode(): string {
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => PARTICIPANT_CODE_ALPHABET[b % PARTICIPANT_CODE_ALPHABET.length]);
  return `HARF-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}


const submitStory: Schema["submitTestimony"]["functionHandler"] = async (event) => {
  const args = event.arguments;

  // Honeypot filled in: behave as if it worked, store nothing.
  if (args.website) {
    return { testimonyId: randomUUID(), participantCode: newParticipantCode(), entryNumber: 1 };
  }

  try {
    const text = (args.text ?? "").trim();
    if (text.length < LIMITS.testimonyMin) {
      throw new ValidationError(`Please write at least ${LIMITS.testimonyMin} characters.`);
    }
    if (text.length > LIMITS.testimonyMax) {
      throw new ValidationError(`Testimonies are limited to ${LIMITS.testimonyMax} characters.`);
    }
    if (args.consentResearch !== true) {
      throw new ValidationError("Consent to store and analyze the contribution is required.");
    }
    if (args.consentReview !== true) {
      throw new ValidationError("Please confirm that you understand stories are reviewed before publication.");
    }
    if (args.consentVersion !== CONSENT_VERSION) {
      throw new ValidationError("The consent text has changed. Please reload the page and review it again.");
    }

    const channel = args.channel === "WEEKLY_QUESTION" ? "WEEKLY_QUESTION" : "OPEN";
    let promptId: string | undefined;
    let promptText: string | undefined;
    let weeklyQuestionId: string | undefined;
    let weeklyQuestionWeekOf: string | undefined;

    if (channel === "WEEKLY_QUESTION") {
      weeklyQuestionId = clean(args.weeklyQuestionId, 64);
      if (!weeklyQuestionId) throw new ValidationError("Missing weekly question.");
      const res = await db.send(
        new QueryCommand({
          TableName: WEEKLY_QUESTION_TABLE,
          KeyConditionExpression: "id = :id",
          ExpressionAttributeValues: { ":id": weeklyQuestionId },
        }),
      );
      const question = res.Items?.[0];
      if (!question) throw new ValidationError("Unknown weekly question.");
      promptId = `weekly:${weeklyQuestionId}`;
      promptText = question.question as string;
      weeklyQuestionWeekOf = question.weekOf as string;
    } else if (args.promptId) {
      const prompt = OPTIONAL_PROMPTS.find((p) => p.id === args.promptId);
      if (!prompt) throw new ValidationError("Unknown prompt.");
      promptId = prompt.id;
      promptText = prompt.text;
    }

    let participantCode = newParticipantCode();
    if (args.participantCode) {
      const normalized = normalizeParticipantCode(args.participantCode);
      if (!PARTICIPANT_CODE_PATTERN.test(normalized)) {
        throw new ValidationError("That participant code doesn't look right. It has the form HARF-XXXX-XXXX-XXXX.");
      }
      participantCode = normalized;
    }
    const participantRef = participantRefFor(participantCode);

    const previous = await db.send(
      new QueryCommand({
        TableName: TESTIMONY_TABLE,
        IndexName: "byParticipant",
        KeyConditionExpression: "participantRef = :p",
        ExpressionAttributeValues: { ":p": participantRef },
        Select: "COUNT",
      }),
    );
    const entryNumber = (previous.Count ?? 0) + 1;

    const manyOf = <T extends readonly string[]>(values: (string | null)[] | null | undefined, allowed: T) => {
      const picked = [...new Set((values ?? []).filter((v): v is string => !!v).map((v) => oneOf(v, allowed)!))];
      return picked.length ? picked : undefined;
    };
    const gender = oneOf(args.gender, GENDERS);
    const mainAiTool = oneOf(args.mainAiTool, AI_TOOLS);

    const feelings = (args.feelings ?? [])
      .filter((f): f is string => typeof f === "string")
      .map((f) => oneOf(f, FEELINGS)!)
      .filter((f, i, all) => all.indexOf(f) === i);

    const language = oneOf(
      args.language,
      LANGUAGES.map((l) => l.code),
    );

    const now = new Date().toISOString();
    const testimonyId = randomUUID();
    const consentContact = args.consentContact === true;
    const contactEmail = consentContact ? clean(args.contactEmail, 254) : undefined;
    const contactName = consentContact ? clean(args.contactName) : undefined;
    if (contactEmail && !EMAIL_PATTERN.test(contactEmail)) {
      throw new ValidationError("Please check the email address.");
    }
    const contactId = contactEmail ? randomUUID() : undefined;
    const media = await claimMedia(args.mediaKeys, testimonyId);

    const testimony = {
      id: testimonyId,
      __typename: "Testimony",
      createdAt: now,
      updatedAt: now,
      submittedAt: now,
      language,
      originalText: text,
      channel,
      promptId,
      promptText,
      weeklyQuestionId,
      weeklyQuestionWeekOf,
      noticedChange: oneOf(args.noticedChange, NOTICED_CHANGE),
      firstNoticed: clean(args.firstNoticed, 5000),
      participantRef,
      entryNumber,
      relationship: oneOf(args.relationship, RELATIONSHIPS),
      fieldOfWork: clean(args.fieldOfWork),
      country: clean(args.country),
      countryOfBirth: clean(args.countryOfBirth),
      ageRange: oneOf(args.ageRange, AGE_RANGES),
      gender,
      genderSelfDescribed: gender === "Self-describe" ? clean(args.genderSelfDescribed) : undefined,
      firstLanguage: clean(args.firstLanguage),
      academicStage: oneOf(args.academicStage, ACADEMIC_STAGES),
      mainAiTool,
      otherAiTools: manyOf(args.otherAiTools, AI_TOOLS)?.filter((t) => t !== mainAiTool && t !== "I don't use AI"),
      aiDuration: oneOf(args.aiDuration, AI_DURATIONS),
      aiUses: manyOf(args.aiUses, AI_USES),
      aiUseFrequency: oneOf(args.aiUseFrequency, AI_USE_FREQUENCIES),
      feelings: feelings.length ? feelings : undefined,
      feelingsOther: feelings.includes("Other") ? clean(args.feelingsOther) : undefined,
      consentResearch: true,
      consentPublish: args.consentPublish === true,
      consentContact,
      consentReview: true,
      consentVersion: CONSENT_VERSION,
      consentRecordedAt: now,
      contactId,
      media: media.length ? media : undefined,
      synthetic: false,
      tone: readTone(text)?.tone,
      editorialStatus: "NEW",
      themes: [],
    };

    const write = () =>
      contactId
        ? db.send(
            new TransactWriteCommand({
              TransactItems: [
                { Put: { TableName: TESTIMONY_TABLE, Item: testimony } },
                {
                  Put: {
                    TableName: CONTACT_TABLE,
                    Item: {
                      id: contactId,
                      __typename: "Contact",
                  purpose: "INTERVIEW",
                  source: "story",
                  consentVersion: CONSENT_VERSION,
                      createdAt: now,
                      updatedAt: now,
                      testimonyId,
                      participantRef,
                      name: contactName,
                      email: contactEmail,
                    },
                  },
                },
              ],
            }),
          )
        : db.send(new PutCommand({ TableName: TESTIMONY_TABLE, Item: testimony }));

    try {
      await write();
    } catch (err) {
      await deleteObjects(media.map((m) => m.key));
      throw err;
    }
    // The originals in uploads/ would expire anyway; remove them now.
    await deleteObjects((args.mediaKeys ?? []).filter((k): k is string => !!k && UPLOAD_KEY.test(k)));

    return { testimonyId, participantCode, entryNumber };
  } catch (err) {
    if (err instanceof ValidationError) throw new Error(err.message);
    console.error("submitTestimony failed", err);
    throw new Error("We couldn't save your testimony. Please try again in a moment.");
  }
};

type ReflectionArgs = Schema["submitReflection"]["args"];

/**
 * A later chapter for a published story. Only its original contributor can add
 * one: the participant code must belong to the testimony behind the excerpt.
 * The reflection is stored as its own testimony, pending review; the original
 * is never touched.
 */
async function submitReflection(args: ReflectionArgs): Promise<boolean> {
  if (args.website) return true;
  try {
    const text = (args.text ?? "").trim();
    if (text.length < LIMITS.testimonyMin) throw new ValidationError(`Please write at least ${LIMITS.testimonyMin} characters.`);
    if (text.length > LIMITS.testimonyMax) throw new ValidationError(`Reflections are limited to ${LIMITS.testimonyMax} characters.`);
    if (args.consent !== true) throw new ValidationError("Please confirm the consent statement.");
    if (args.consentVersion !== CONSENT_VERSION) {
      throw new ValidationError("The consent text has changed. Please reload the page and review it again.");
    }
    const code = normalizeParticipantCode(args.participantCode ?? "");
    if (!PARTICIPANT_CODE_PATTERN.test(code)) {
      throw new ValidationError("That participant code doesn't look right. It has the form HARF-XXXX-XXXX-XXXX.");
    }
    const participantRef = participantRefFor(code);
    const mine: Record<string, unknown>[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const page = await db.send(
        new QueryCommand({
          TableName: TESTIMONY_TABLE,
          IndexName: "byParticipant",
          KeyConditionExpression: "participantRef = :p",
          ExpressionAttributeValues: { ":p": participantRef },
          ExclusiveStartKey,
        }),
      );
      mine.push(...(page.Items ?? []));
      ExclusiveStartKey = page.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    const original = mine.find((t) => t.excerptId === args.excerptId && !t.followUpOf);
    if (!original || original.editorialStatus === "WITHDRAWN") {
      throw new ValidationError("That code doesn't match this story. Use the code you received when you first shared it.");
    }

    const now = new Date().toISOString();
    const copy = (k: string) => original[k] as string | undefined;
    await db.send(
      new PutCommand({
        TableName: TESTIMONY_TABLE,
        ConditionExpression: "attribute_not_exists(id)",
        Item: {
          id: randomUUID(),
          __typename: "Testimony",
          createdAt: now,
          updatedAt: now,
          submittedAt: now,
          language: copy("language"),
          originalText: text,
          channel: "REFLECTION",
          followUpOf: original.id,
          participantRef,
          entryNumber: mine.length + 1,
          // Context stays the person's own; editors can still leave it off when publishing.
          relationship: copy("relationship"),
          academicStage: copy("academicStage"),
          fieldOfWork: copy("fieldOfWork"),
          country: copy("country"),
          countryOfBirth: copy("countryOfBirth"),
          ageRange: copy("ageRange"),
          mainAiTool: copy("mainAiTool"),
          consentResearch: true,
          consentPublish: true,
          consentContact: false,
          consentReview: true,
          consentNamedCredit: original.consentNamedCredit === true ? true : undefined,
          creditName: original.consentNamedCredit === true ? copy("creditName") : undefined,
          creditLine: original.consentNamedCredit === true ? copy("creditLine") : undefined,
          consentVersion: CONSENT_VERSION,
          consentRecordedAt: now,
          synthetic: original.synthetic === true,
          tone: readTone(text)?.tone,
          editorialStatus: "NEW",
          themes: [],
        },
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ValidationError) throw new Error(err.message);
    console.error("submitReflection failed", err);
    throw new Error("We couldn't save your reflection. Please try again in a moment.");
  }
}

type StoryEvent = Parameters<typeof submitStory>[0];

export const handler = async (
  event: StoryEvent & { info?: { fieldName?: string } },
  context: Parameters<typeof submitStory>[1],
  callback: Parameters<typeof submitStory>[2],
) => {
  if (event.info?.fieldName === "submitReflection") {
    return submitReflection(event.arguments as unknown as ReflectionArgs);
  }
  return submitStory(event, context, callback);
};
