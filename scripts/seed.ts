/**
 * Seeds the archive with FICTIONAL sample entries for testing.
 *
 *   AWS_PROFILE=chenyu npx tsx scripts/seed.ts          # write seeds
 *   AWS_PROFILE=chenyu npx tsx scripts/seed.ts --remove # delete them again
 *
 * Every record is marked `synthetic: true` and uses a `seed-` id prefix, so
 * re-running is idempotent and the samples are easy to filter out of exports.
 * The samples are private test data for the editor dashboard only: nothing is
 * published to the public archive, and no Question of the Week is created.
 * `--remove` also cleans up excerpts and the weekly question that older
 * versions of this script created.
 * Reads amplify_outputs.json to find the deployed API and its tables.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { AppSyncClient, paginateListGraphqlApis } from "@aws-sdk/client-appsync";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { CONSENT_VERSION } from "../src/lib/harf";
import { SEEDS } from "./seed-data";

const outputs = JSON.parse(readFileSync(new URL("../amplify_outputs.json", import.meta.url), "utf8"));
const region: string = outputs.data.aws_region;
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
});

async function apiId(): Promise<string> {
  const appsync = new AppSyncClient({ region });
  for await (const page of paginateListGraphqlApis({ client: appsync }, {})) {
    const api = page.graphqlApis?.find((a) => a.uris?.GRAPHQL === outputs.data.url);
    if (api?.apiId) return api.apiId;
  }
  throw new Error(`No AppSync API found for ${outputs.data.url}`);
}

const ref = (code: string) => createHash("sha256").update(`harf:${code}`).digest("hex");

const WEEKLY = {
  id: "seed-weekly-0001",
  question: "Have you ever felt less intelligent while using a tool that makes you more productive?",
  introduction: "A short reflection is enough. Contradictions are especially welcome.",
  weekOf: "2026-10-26",
  active: true,
};

async function batch(table: string, requests: Record<string, unknown>[]) {
  for (let i = 0; i < requests.length; i += 25) {
    await db.send(new BatchWriteCommand({ RequestItems: { [table]: requests.slice(i, i + 25) } }));
  }
}

async function main() {
  const id = await apiId();
  const table = (model: string) => `${model}-${id}-NONE`;
  const remove = process.argv.includes("--remove");

  if (remove) {
    await batch(table("Testimony"), SEEDS.map((s) => ({ DeleteRequest: { Key: { id: s.id } } })));
    await batch(
      table("Excerpt"),
      SEEDS.filter((s) => s.excerpt).map((s) => ({ DeleteRequest: { Key: { id: `${s.id}-excerpt` } } })),
    );
    await batch(table("WeeklyQuestion"), [{ DeleteRequest: { Key: { id: WEEKLY.id } } }]);
    console.log("Removed synthetic seed data.");
    return;
  }

  const now = new Date().toISOString();
  const testimonies = SEEDS.map((s) => ({
    id: s.id,
    __typename: "Testimony",
    createdAt: s.at,
    updatedAt: now,
    submittedAt: s.at,
    language: "en",
    originalText: s.text,
    channel: "OPEN",
    promptId: s.promptId,
    promptText: s.promptText,
    participantRef: ref(s.code),
    entryNumber: s.entry ?? 1,
    relationship: s.relationship,
    fieldOfWork: s.fieldOfWork,
    country: s.country,
    aiUseFrequency: s.aiUseFrequency,
    feelings: s.feelings,
    consentResearch: true,
    consentPublish: s.publish,
    consentContact: false,
    consentVersion: CONSENT_VERSION,
    consentRecordedAt: s.at,
    synthetic: true,
    editorialStatus: s.status === "PUBLISHED" ? "APPROVED" : s.status,
    themes: s.themes ?? [],
    excerptDraft: s.excerpt,
    reviewedAt: s.status === "NEW" ? undefined : now,
  }));
  await batch(table("Testimony"), testimonies.map((Item) => ({ PutRequest: { Item } })));
  console.log(`Seeded ${testimonies.length} private, fictional testimonies (nothing published).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
