/**
 * Checks the constellation matcher (src/lib/constellation.ts) against themes
 * chosen by people, so we know how far to trust where a new star lands.
 *
 *   npx tsx scripts/check-theme-matcher.ts                       # fictional samples
 *   npx tsx scripts/check-theme-matcher.ts private/interviews/manifest.json
 *   AWS_PROFILE=chenyu npx tsx scripts/check-theme-matcher.ts --live
 *
 * --live reads real testimonies whose themes an editor has confirmed and
 * compares them with the matcher; it prints ids and themes only, never text.
 * Exits non-zero when agreement drops below the bar, so it can gate changes
 * to the word lists.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { AppSyncClient, paginateListGraphqlApis } from "@aws-sdk/client-appsync";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { agreement, matchThemes, scoreThemes } from "../src/lib/constellation";
import { SEEDS } from "./seed-data";

type Case = { id: string; text: string; expected: string[]; source: string };

/** The bar: most stars should land in at least one constellation an editor chose. */
const MIN_HIT_RATE = 0.8;
const MIN_PRECISION = 0.5;

async function liveCases(): Promise<Case[]> {
  const outputs = JSON.parse(readFileSync(new URL("../amplify_outputs.json", import.meta.url), "utf8"));
  const region: string = outputs.data.aws_region;
  const appsync = new AppSyncClient({ region });
  let apiId = "";
  for await (const page of paginateListGraphqlApis({ client: appsync }, {})) {
    apiId = page.graphqlApis?.find((a) => a.uris?.GRAPHQL === outputs.data.url)?.apiId ?? apiId;
  }
  if (!apiId) throw new Error("API not found");
  const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
  const cases: Case[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const page = await db.send(
      new ScanCommand({
        TableName: `Testimony-${apiId}-NONE`,
        ProjectionExpression: "id, originalText, themes, reviewedAt, synthetic, editorialStatus",
        ExclusiveStartKey,
      }),
    );
    for (const t of page.Items ?? []) {
      const themes = (t.themes as string[] | undefined) ?? [];
      if (t.synthetic || !t.reviewedAt || !themes.length || t.editorialStatus === "WITHDRAWN") continue;
      cases.push({ id: String(t.id), text: String(t.originalText ?? ""), expected: themes, source: "live" });
    }
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return cases;
}

function manifestCases(path: string): Case[] {
  const entries = JSON.parse(readFileSync(path, "utf8")) as { id: string; file: string; themes?: string[] }[];
  return entries
    .filter((e) => e.themes?.length)
    .map((e) => ({
      id: e.id,
      text: readFileSync(resolve(dirname(path), e.file), "utf8"),
      expected: e.themes!,
      source: "manifest",
    }));
}

async function main() {
  const args = process.argv.slice(2);
  const manifest = args.find((a) => a.endsWith(".json"));
  const cases: Case[] = args.includes("--live")
    ? await liveCases()
    : manifest
      ? manifestCases(manifest)
      : SEEDS.filter((s) => s.themes?.length).map((s) => ({ id: s.id, text: s.text, expected: s.themes!, source: "sample" }));

  if (!cases.length) {
    console.log("No testimonies with editor-confirmed themes yet: nothing to compare.");
    return;
  }

  let precision = 0;
  let recall = 0;
  let hits = 0;
  for (const c of cases) {
    const predicted = matchThemes(c.text);
    const a = agreement(predicted, c.expected);
    precision += a.precision;
    recall += a.recall;
    if (a.hitAny) hits++;
    const evidence = scoreThemes(c.text)
      .slice(0, 3)
      .map((m) => `${m.theme} ${m.hits}`)
      .join(", ");
    console.log(`${a.hitAny ? "✔" : "✘"} ${c.id}`);
    console.log(`    editor:  ${c.expected.join(", ")}`);
    console.log(`    matcher: ${predicted.join(", ") || "—"}   (signal: ${evidence || "none"})`);
  }
  const n = cases.length;
  const hitRate = hits / n;
  console.log(
    `\n${n} testimonies · lands in an editor's constellation ${Math.round(hitRate * 100)}% · ` +
      `precision ${Math.round((precision / n) * 100)}% · recall ${Math.round((recall / n) * 100)}%`,
  );
  if (hitRate < MIN_HIT_RATE || precision / n < MIN_PRECISION) {
    console.error(`Below the bar (hit rate ≥ ${MIN_HIT_RATE * 100}%, precision ≥ ${MIN_PRECISION * 100}%).`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
