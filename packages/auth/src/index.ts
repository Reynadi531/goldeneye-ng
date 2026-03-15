import { db } from "@goldeneye-ng/db";
import * as schema from "@goldeneye-ng/db/schema/auth";
import { env } from "@goldeneye-ng/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        fieldName: "role",
      },
    },
  },
  plugins: [],
});
