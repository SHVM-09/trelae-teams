import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import "dotenv/config";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw Error("DATABASE_URL not set");
}

const client = neon(DATABASE_URL);

export const db = drizzle(client, { schema });
