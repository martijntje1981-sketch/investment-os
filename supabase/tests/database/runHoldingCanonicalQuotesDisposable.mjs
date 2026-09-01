/**
 * Run the C1 holding_canonical_quotes migration against a disposable Postgres.
 * Modes:
 *   DATABASE_URL  — connect to the supplied disposable/CI database (no Docker)
 *   Docker        — start postgres:15-alpine locally when DATABASE_URL is unset
 * Never falls back to a configured Supabase URL or service-role key.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertDisposableDatabaseUrl,
  isCiDisposableDbMode,
} from "./disposableDatabaseUrl.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const container = "ios-c1-canonical-quotes-disposable-pg";
const postgresImage = "postgres:15-alpine";

const sqlFiles = [
  "supabase/tests/database/holding_canonical_quotes_disposable_stub.sql",
  "supabase/migrations/20260901140000_holding_canonical_quotes.sql",
  "supabase/tests/database/holding_canonical_quotes_disposable_verify.sql",
];

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
    ...options,
  });
}

function fail(message, result) {
  const detail = [result?.stdout, result?.stderr, result?.error?.message]
    .filter(Boolean)
    .join("\n");
  console.error(message);
  if (detail) console.error(detail);
  process.exit(1);
}

function loadHarnessSql() {
  return sqlFiles
    .map((rel) => readFileSync(path.join(root, rel), "utf8"))
    .join("\n\n");
}

function runPsql(sql, args, extraEnv) {
  const result = run("psql", args, {
    input: sql,
    env: {
      ...process.env,
      ...extraEnv,
      PGOPTIONS: "-c client_min_messages=notice",
    },
  });
  if (result.status !== 0) {
    fail("Disposable Postgres verification failed.", result);
  }
  return result;
}

function runAgainstDatabaseUrl(databaseUrl, target) {
  console.log(
    `Using disposable DATABASE_URL host=${target.hostname} port=${target.port || "5432"} database=${target.database}`,
  );
  const sql = loadHarnessSql();
  const result = runPsql(sql, [
    databaseUrl,
    "-v",
    "ON_ERROR_STOP=1",
    "-X",
  ]);
  console.log(result.stdout);
  console.log("Disposable Postgres C1 verification passed.");
  console.log(
    "Note: holding_canonical_quotes is server-only; anon/authenticated have no privileges.",
  );
}

function runAgainstDocker() {
  const docker = run("docker", ["version"]);
  if (docker.status !== 0) {
    console.error(
      "LIMITATION: no disposable Postgres is available (Docker is not running and DATABASE_URL is unset).",
    );
    console.error(
      "Did not apply the migration to remote Supabase. Source-string tests are not a substitute.",
    );
    process.exit(2);
  }

  run("docker", ["rm", "-f", container]);

  const started = run("docker", [
    "run",
    "-d",
    "--name",
    container,
    "-e",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    postgresImage,
  ]);
  if (started.status !== 0) {
    fail("Could not start disposable Postgres container.", started);
  }

  let ready = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const ping = run("docker", [
      "exec",
      container,
      "pg_isready",
      "-U",
      "postgres",
    ]);
    if (ping.status === 0) {
      ready = true;
      break;
    }
    spawnSync(
      process.execPath,
      ["-e", "Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,1000)"],
      { windowsHide: true },
    );
  }

  if (!ready) {
    run("docker", ["rm", "-f", container]);
    fail("Disposable Postgres did not become ready.");
  }

  const sql = loadHarnessSql();
  const psql = run(
    "docker",
    ["exec", "-i", container, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-X"],
    { input: sql },
  );
  run("docker", ["rm", "-f", container]);

  if (psql.status !== 0) {
    fail("Disposable Postgres verification failed.", psql);
  }

  console.log(psql.stdout);
  console.log("Disposable Postgres C1 verification passed.");
}

const ci = isCiDisposableDbMode();
let target;
try {
  target = assertDisposableDatabaseUrl(process.env.DATABASE_URL);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

if (target) {
  runAgainstDatabaseUrl(process.env.DATABASE_URL, target);
} else if (ci) {
  console.error("CI requires DATABASE_URL for the disposable Postgres service.");
  process.exit(1);
} else {
  runAgainstDocker();
}
