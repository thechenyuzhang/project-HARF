/**
 * Imports testimonies HARF collected outside the website (edited interviews,
 * essays sent in by contributors) into the private Testimony table, so they
 * sit alongside web submissions in the editor dashboard and the analysis.
 *
 *   npx tsx scripts/import-testimonies.ts private/interviews/manifest.json          # dry run
 *   AWS_PROFILE=chenyu npx tsx scripts/import-testimonies.ts <manifest> --write     # write
 *
 * The manifest and the texts are personal data: keep them in the gitignored
 * private/ folder, never in the repository. Each manifest entry points to a
 * plain-text file (relative to the manifest) holding the testimony body.
 *
 * - Nothing is written unless every entry records research and publication
 *   consent explicitly (true or false; null means "not confirmed yet").
 * - Each contributor gets a participant code, as on the website. It is written
 *   back into the manifest so re-runs are stable and the code can be passed on
 *   to them; only its hash is stored.
 * - Existing records are never overwritten, so editorial work done in the
 *   dashboard survives a re-run.
 * - A contributor who agreed in writing to be named can carry a `credit`
 *   (name and affiliation line); it stays private until an editor publishes
 *   with credit, and the editorial function checks consentNamedCredit again.
 * - Records arrive as NEW. Publishing an excerpt still goes through the editor
 *   dashboard, which checks publication consent.
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { AppSyncClient, paginateListGraphqlApis } from "@aws-sdk/client-appsync";
import { ConditionalCheckFailedException, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { participantRefFor } from "../amplify/functions/shared/participant-ref";
import {
  ACADEMIC_STAGES,
  AI_TOOLS,
  AI_USE_FREQUENCIES,
  PARTICIPANT_CODE_ALPHABET,
  RELATIONSHIPS,
  THEMES,
} from "../src/lib/harf";
import { readTone } from "../src/lib/tone";

type Entry = {
  id: string;
  file: string;
  submittedAt: string;
  /** The piece's title, if it has one. */
  title?: string;
  language?: string;
  participantCode?: string;
  relationship?: string;
  academicStage?: string;
  fieldOfWork?: string;
  country?: string;
  countryOfBirth?: string;
  mainAiTool?: string;
  otherAiTools?: string[];
  aiUseFrequency?: string;
  themes?: string[];
  editorNotes?: string;
  /** Only for contributors who agreed in writing to be named (consent.namedCredit). */
  credit?: { name: string; line?: string };
  consent: {
    research: boolean | null;
    publish: boolean | null;
    contact: boolean;
    namedCredit?: boolean;
    recordedAt: string;
    version: string;
  };
};

const [manifestArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const write = process.argv.includes("--write");
if (!manifestArg) {
  console.error("Usage: npx tsx scripts/import-testimonies.ts <manifest.json> [--write]");
  process.exit(1);
}
const manifestPath = resolve(manifestArg);
const entries: Entry[] = JSON.parse(readFileSync(manifestPath, "utf8"));

const newCode = () => {
  const chars = Array.from(randomBytes(12), (b) => PARTICIPANT_CODE_ALPHABET[b % PARTICIPANT_CODE_ALPHABET.length]);
  return `HARF-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
};

function check(e: Entry): string[] {
  const problems: string[] = [];
  const oneOf = (field: string, value: string | undefined, allowed: readonly string[]) => {
    if (value !== undefined && !allowed.includes(value)) problems.push(`${field} "${value}" is not one of: ${allowed.join(", ")}`);
  };
  if (!/^[a-z0-9-]+$/.test(e.id)) problems.push(`id "${e.id}" must be lower-case letters, digits and dashes`);
  if (Number.isNaN(Date.parse(e.submittedAt))) problems.push(`submittedAt "${e.submittedAt}" is not a date`);
  if (typeof e.consent?.research !== "boolean") problems.push("consent.research is not confirmed (true or false)");
  if (typeof e.consent?.publish !== "boolean") problems.push("consent.publish is not confirmed (true or false)");
  if (e.consent?.research === false) problems.push("no research consent: this testimony should not be imported");
  if (e.credit && e.consent?.namedCredit !== true) problems.push("credit given without consent.namedCredit: true");
  if (e.credit && e.consent?.publish !== true) problems.push("credit given without publication consent");
  oneOf("relationship", e.relationship, RELATIONSHIPS);
  oneOf("academicStage", e.academicStage, ACADEMIC_STAGES);
  oneOf("mainAiTool", e.mainAiTool, AI_TOOLS);
  oneOf("aiUseFrequency", e.aiUseFrequency, AI_USE_FREQUENCIES);
  for (const tool of e.otherAiTools ?? []) oneOf("otherAiTools", tool, AI_TOOLS);
  for (const theme of e.themes ?? []) oneOf("themes", theme, THEMES);
  return problems;
}

async function apiId(region: string, url: string): Promise<string> {
  const appsync = new AppSyncClient({ region });
  for await (const page of paginateListGraphqlApis({ client: appsync }, {})) {
    const api = page.graphqlApis?.find((a) => a.uris?.GRAPHQL === url);
    if (api?.apiId) return api.apiId;
  }
  throw new Error(`No AppSync API found for ${url}`);
}

async function main() {
  let blocked = false;
  const records = entries.map((e) => {
    const text = readFileSync(resolve(dirname(manifestPath), e.file), "utf8").trim();
    const problems = check(e);
    if (!text) problems.push(`${e.file} is empty`);
    const tone = readTone(text);
    console.log(`\n${e.id}  (${e.file})`);
    console.log(`  ${text.split(/\s+/).length} words · tone ${tone?.tone ?? "—"} · themes ${(e.themes ?? []).join(", ") || "—"}`);
    console.log(
      `  consent: research ${e.consent?.research}, publish ${e.consent?.publish}, contact ${e.consent?.contact}` +
        (e.credit ? `, named credit ${e.consent?.namedCredit}` : ""),
    );
    for (const p of problems) console.log(`  ✘ ${p}`);
    if (problems.length) blocked = true;
    return { e, text, tone };
  });

  if (blocked) {
    console.error("\nNothing written: fix the problems above in the manifest first.");
    process.exit(1);
  }
  if (!write) {
    console.log("\nDry run: nothing written. Add --write to import.");
    return;
  }

  // Give each contributor a participant code, and keep it in the manifest.
  for (const { e } of records) e.participantCode ??= newCode();
  writeFileSync(manifestPath, `${JSON.stringify(entries, null, 2)}\n`);

  const outputs = JSON.parse(readFileSync(new URL("../amplify_outputs.json", import.meta.url), "utf8"));
  const region: string = outputs.data.aws_region;
  const table = `Testimony-${await apiId(region, outputs.data.url)}-NONE`;
  const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
    marshallOptions: { removeUndefinedValues: true },
  });

  const now = new Date().toISOString();
  for (const { e, text, tone } of records) {
    const Item = {
      id: e.id,
      __typename: "Testimony",
      createdAt: now,
      updatedAt: now,
      submittedAt: new Date(e.submittedAt).toISOString(),
      language: e.language ?? "en",
      originalText: text,
      channel: "OPEN",
      participantRef: participantRefFor(e.participantCode!),
      entryNumber: 1,
      relationship: e.relationship,
      academicStage: e.academicStage,
      fieldOfWork: e.fieldOfWork,
      country: e.country,
      countryOfBirth: e.countryOfBirth,
      mainAiTool: e.mainAiTool,
      otherAiTools: e.otherAiTools,
      aiUseFrequency: e.aiUseFrequency,
      consentResearch: e.consent.research,
      consentPublish: e.consent.publish,
      consentContact: e.consent.contact,
      consentVersion: e.consent.version,
      consentRecordedAt: new Date(e.consent.recordedAt).toISOString(),
      consentNamedCredit: e.credit ? e.consent.namedCredit === true : undefined,
      creditName: e.credit?.name,
      creditLine: e.credit?.line,
      title: e.title,
      synthetic: false,
      tone: tone?.tone,
      editorialStatus: "NEW",
      themes: e.themes ?? [],
      editorNotes: e.editorNotes,
    };
    try {
      await db.send(new PutCommand({ TableName: table, Item, ConditionExpression: "attribute_not_exists(id)" }));
      console.log(`✔ Imported ${e.id}`);
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) console.log(`• ${e.id} already exists; left unchanged`);
      else throw err;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
