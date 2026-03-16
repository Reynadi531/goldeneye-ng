import { env } from "@goldeneye-ng/env/server";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export const db: NodePgDatabase<typeof schema> = drizzle(env.DATABASE_URL, { schema });

// Re-export commonly used drizzle operators so consumers don't need drizzle-orm as a direct dep
export { eq, and, or, desc, asc, sql } from "drizzle-orm";
