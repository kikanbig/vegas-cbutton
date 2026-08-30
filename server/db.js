import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
}

export const pool = new pg.Pool({
  connectionString,
  ssl: connectionString?.includes("localhost") ? false : { rejectUnauthorized: false },
  max: 10,
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await query(sql);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_salon TEXT`);
  await query(`ALTER TABLE seller_shifts ADD COLUMN IF NOT EXISTS salon TEXT`);
  await query(`
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'client_consultations'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%outcome%'
      LOOP
        EXECUTE format('ALTER TABLE client_consultations DROP CONSTRAINT %I', r.conname);
      END LOOP;
    END $$;
  `);
  await query(`UPDATE client_consultations SET outcome = 'sale' WHERE outcome = 'project_offered'`);
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'client_consultations_outcome_check'
      ) THEN
        ALTER TABLE client_consultations
        ADD CONSTRAINT client_consultations_outcome_check
        CHECK (outcome IN ('proposal_sent', 'sale', 'refused'));
      END IF;
    END $$;
  `);
  console.log("Database schema is ready");
}
