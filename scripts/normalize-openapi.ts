import { mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED_DIR = resolve(ROOT, ".generated");
const OPENAPI_SOURCE = resolve(ROOT, "openapi.yml");
const EXTERNAL_SOURCE = resolve(ROOT, "external.yml");
const OPENAPI_OUTPUT = resolve(GENERATED_DIR, "openapi.normalized.yml");
const EXTERNAL_OUTPUT = resolve(GENERATED_DIR, "external.normalized.yml");

function normalizeRefPaths(source: string): string {
  return source.replace(
    /\.\/?\.?(?:\/)?openapi\/components\/external\.yml/g,
    "./external.normalized.yml",
  );
}

function fixMisindentedSchemaRefs(source: string): string {
  return source.replace(/(schema:\n)(\s*)\$ref:/g, "$1$2  $ref:");
}

function widenNotesDataUnion(source: string): string {
  // TODO(avoma-spec): The upstream spec only allows object|string for notes.data,
  // but the bundled json example is clearly an array of block nodes.
  return source.replace(
    /description: Notes data\.\n\s+oneOf:\n\s+- type: object\n\s+- type: string/g,
    [
      "description: Notes data.",
      "                              oneOf:",
      "                                - type: object",
      "                                - type: array",
      "                                  items:",
      "                                    type: object",
      "                                - type: string",
    ].join("\n"),
  );
}

function fixRevenueIntelTimelinePath(source: string): string {
  // TODO(avoma-spec): The upstream path is missing the leading slash.
  return source.replace("\n  v1/revenue_intel/timeline/:\n", "\n  /v1/revenue_intel/timeline/:\n");
}

function widenEngagementMetrics(source: string): string {
  // TODO(avoma-spec): The schema models engagement metrics as `{ value }`,
  // while the provided examples return raw numbers. The SDK accepts both.
  return source.replace(
    [
      "    engagement_metric_base:",
      "      type: object",
      "      description: Base engagement metric with value",
      "      properties:",
      "        value:",
      "          type: number",
      "          nullable: true",
      "          description: Metric value",
    ].join("\n"),
    [
      "    engagement_metric_base:",
      "      oneOf:",
      "        - type: object",
      "          description: Base engagement metric with value",
      "          properties:",
      "            value:",
      "              type: number",
      "              nullable: true",
      "              description: Metric value",
      "        - type: number",
      "          nullable: true",
      "          description: Raw metric value returned by some endpoints/examples",
    ].join("\n"),
  );
}

function fixCallResponseRequired(source: string): string {
  // TODO(avoma-spec): `call_response.required` is nested under `properties`
  // in the upstream component file, which makes the schema invalid for codegen.
  return source.replace(
    [
      "        required:",
      "         - external_id",
      "         - user_email",
      "         - frm",
      "         - to",
      "         - start_at",
      "         - recording_url",
      "         - direction",
      "         - source",
      "         - participants",
    ].join("\n"),
    [
      "      required:",
      "        - external_id",
      "        - user_email",
      "        - frm",
      "        - to",
      "        - start_at",
      "        - recording_url",
      "        - direction",
      "        - source",
      "        - participants",
    ].join("\n"),
  );
}

async function main() {
  mkdirSync(dirname(OPENAPI_OUTPUT), { recursive: true });

  let openapi = await readFile(OPENAPI_SOURCE, "utf8");
  let external = await readFile(EXTERNAL_SOURCE, "utf8");

  // TODO(avoma-spec): The local repo stores `external.yml` at the root,
  // while the original spec points to nested `openapi/components/external.yml` paths.
  openapi = normalizeRefPaths(openapi);
  openapi = fixMisindentedSchemaRefs(openapi);
  openapi = fixRevenueIntelTimelinePath(openapi);
  openapi = widenNotesDataUnion(openapi);

  external = widenEngagementMetrics(external);
  external = fixCallResponseRequired(external);

  await writeFile(OPENAPI_OUTPUT, openapi);
  await writeFile(EXTERNAL_OUTPUT, external);
}

await main();
