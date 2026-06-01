import { config as loadEnv } from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");

  const sql = postgres(url, {
    ssl: url.includes("sslmode=require") ? "require" : undefined,
    prepare: false,
  });
  const schema = await readFile(path.join(process.cwd(), "db/schema.sql"), "utf8");
  await sql.unsafe(schema);
  await sql.end();
  console.log("Praxia Core database initialized.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
