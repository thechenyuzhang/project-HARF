import { randomUUID } from "node:crypto";
import type { AppSyncResolverEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import {
  ANALYTICS_EVENTS,
  CONSENT_VERSION,
  PARTICIPANT_CODE_PATTERN,
  normalizeParticipantCode,
} from "../../../src/lib/harf";
import {
  summarizeCommunity,
  summarizeTrend,
  type CommunityRecord,
  type CommunityRow,
  type TrendPoint,
} from "../../../src/lib/community";
import { readTone } from "../../../src/lib/tone";
import { EMAIL_PATTERN, participantRefFor } from "../shared/participant-ref";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const TESTIMONY_TABLE = process.env.TESTIMONY_TABLE!;
const CONTACT_TABLE = process.env.CONTACT_TABLE!;
const WITHDRAWAL_TABLE = process.env.WITHDRAWAL_TABLE!;
const ANALYTICS_TABLE = process.env.ANALYTICS_TABLE!;
const THIRTEEN_MONTHS = 400 * 24 * 60 * 60;

class ValidationError extends Error {}

function email(value: unknown): string {
  const v = typeof value === "string" ? value.trim() : "";
  if (v.length > 254 || !EMAIL_PATTERN.test(v)) throw new ValidationError("Please check the email address.");
  return v;
}

function participantRef(code: unknown): string | undefined {
  if (typeof code !== "string" || !code.trim()) return undefined;
  const normalized = normalizeParticipantCode(code);
  if (!PARTICIPANT_CODE_PATTERN.test(normalized)) {
    throw new ValidationError("That participant code doesn't look right. It has the form HARF-XXXX-XXXX-XXXX.");
  }
  return participantRefFor(normalized);
}

function inSixMonths() {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + 6);
  return d.toISOString().slice(0, 10);
}

async function requestRevisit(args: Record<string, unknown>) {
  if (args.consent !== true) throw new ValidationError("Please tick the box to agree to be contacted.");
  if (args.consentVersion !== CONSENT_VERSION) {
    throw new ValidationError("The consent text has changed. Please reload the page and review it again.");
  }
  const source = args.source === "survey" ? "survey" : "story";
  const community = args.purpose === "COMMUNITY";
  let testimonyId: string | undefined;
  let ref: string | undefined;

  if (source === "story" && !community) {
    // The participant code proves this person wrote the testimony.
    testimonyId = typeof args.testimonyId === "string" ? args.testimonyId : undefined;
    ref = participantRef(args.participantCode);
    if (!testimonyId || !ref) throw new ValidationError("Missing submission details. Please reload and try again.");
    const { Item } = await db.send(new GetCommand({ TableName: TESTIMONY_TABLE, Key: { id: testimonyId } }));
    if (!Item || Item.participantRef !== ref) throw new ValidationError("We couldn't find that submission.");
  }

  const now = new Date().toISOString();
  await db.send(
    new PutCommand({
      TableName: CONTACT_TABLE,
      Item: {
        id: randomUUID(),
        __typename: "Contact",
        createdAt: now,
        updatedAt: now,
        purpose: community ? "COMMUNITY" : "SIX_MONTH_REVISIT",
        source,
        testimonyId,
        participantRef: ref,
        email: email(args.email),
        remindAfter: community ? undefined : inSixMonths(),
        consentVersion: CONSENT_VERSION,
      },
    }),
  );
  return true;
}

async function requestWithdrawal(args: Record<string, unknown>) {
  const message = typeof args.message === "string" ? args.message.trim() : "";
  if (message.length < 5) throw new ValidationError("Please tell us which contribution you'd like removed.");
  if (message.length > 2000) throw new ValidationError("Please keep the message under 2,000 characters.");
  const replyEmail = typeof args.replyEmail === "string" && args.replyEmail.trim() ? email(args.replyEmail) : undefined;
  const now = new Date().toISOString();
  await db.send(
    new PutCommand({
      TableName: WITHDRAWAL_TABLE,
      Item: {
        id: randomUUID(),
        __typename: "WithdrawalRequest",
        createdAt: now,
        updatedAt: now,
        participantRef: participantRef(args.participantCode),
        message,
        replyEmail,
        resolved: false,
      },
    }),
  );
  return true;
}

const short = (value: unknown, max: number) => (typeof value === "string" && value ? value.slice(0, max) : undefined);

/** One anonymous usage event. No IP address or user agent is stored. */
async function track(args: Record<string, unknown>) {
  if (!(ANALYTICS_EVENTS as readonly string[]).includes(args.name as string)) throw new ValidationError("Unknown event");
  const now = new Date();
  await db.send(
    new PutCommand({
      TableName: ANALYTICS_TABLE,
      Item: {
        id: randomUUID(),
        __typename: "AnalyticsEvent",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        name: args.name,
        path: short(args.path, 200),
        referrer: short(args.referrer, 200),
        device: args.device === "mobile" ? "mobile" : "desktop",
        visitorId: short(args.visitorId, 40),
        from: short(args.from, 40),
        expiresAt: Math.floor(now.getTime() / 1000) + THIRTEEN_MONTHS,
      },
    }),
  );
  return true;
}

const STATS_TTL = 5 * 60 * 1000;
let recordsCache: { at: number; records: CommunityRecord[] } | null = null;

/**
 * Guests can call these, so the table is read for only the fields counted, at
 * most once per five minutes. Story text is read to count words and tone and
 * never leaves this function.
 */
async function communityRecords() {
  if (recordsCache && Date.now() - recordsCache.at < STATS_TTL) return recordsCache.records;
  const records: CommunityRecord[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const page = await db.send(
      new ScanCommand({
        TableName: TESTIMONY_TABLE,
        ProjectionExpression:
          "participantRef, synthetic, editorialStatus, tone, feelings, aiUseFrequency, mainAiTool, noticedChange, originalText, submittedAt",
        ExclusiveStartKey,
      }),
    );
    records.push(...((page.Items ?? []) as CommunityRecord[]));
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  recordsCache = { at: Date.now(), records };
  return records;
}

async function communityStats(): Promise<CommunityRow[]> {
  return summarizeCommunity(await communityRecords());
}

async function communityTrend(): Promise<TrendPoint[]> {
  return summarizeTrend(await communityRecords());
}

/** A participant's own entries, oldest first: broad readings only, never the text itself. */
async function myEntries(args: Record<string, unknown>) {
  const ref = participantRef(args.participantCode);
  if (!ref) throw new ValidationError("Please enter your participant code.");
  const items: Record<string, unknown>[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const page = await db.send(
      new QueryCommand({
        TableName: TESTIMONY_TABLE,
        IndexName: "byParticipant",
        KeyConditionExpression: "participantRef = :ref",
        ExpressionAttributeValues: { ":ref": ref },
        ExclusiveStartKey,
      }),
    );
    items.push(...(page.Items ?? []));
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items
    .filter((t) => t.editorialStatus !== "WITHDRAWN")
    .sort((a, b) => String(a.submittedAt).localeCompare(String(b.submittedAt)))
    .map((t) => {
      const text = typeof t.originalText === "string" ? t.originalText : "";
      const reading = readTone(text);
      return {
        entryNumber: t.entryNumber ?? null,
        submittedOn: String(t.submittedAt).slice(0, 10),
        tone: reading?.tone ?? null,
        toneScore: reading ? Math.round(reading.score * 100) / 100 : null,
        words: text.trim() ? text.trim().split(/\s+/).length : 0,
        feelings: Array.isArray(t.feelings) ? t.feelings : [],
        aiUseFrequency: t.aiUseFrequency ?? null,
        mainAiTool: t.mainAiTool ?? null,
        noticedChange: t.noticedChange ?? null,
      };
    });
}

type ResolverEvent = AppSyncResolverEvent<Record<string, unknown>> & { fieldName?: string };

export const handler = async (event: ResolverEvent) => {
  const fieldName = event.fieldName ?? event.info?.fieldName;
  try {
    if (fieldName === "requestRevisit") return await requestRevisit(event.arguments);
    if (fieldName === "requestWithdrawal") return await requestWithdrawal(event.arguments);
    if (fieldName === "track") return await track(event.arguments);
    if (fieldName === "communityStats") return await communityStats();
    if (fieldName === "communityTrend") return await communityTrend();
    if (fieldName === "myEntries") return await myEntries(event.arguments);
    throw new Error(`Unsupported operation ${fieldName}`);
  } catch (err) {
    if (err instanceof ValidationError) throw new Error(err.message);
    console.error(`${fieldName} failed`, err);
    throw new Error("Something went wrong. Please try again in a moment.");
  }
};
