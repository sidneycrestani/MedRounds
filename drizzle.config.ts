import * as dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// 1. Load the environment variables
dotenv.config();

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is missing in .env file");
}

export default defineConfig({
	schema: [
		"./src/modules/content/schema.ts",
		"./src/modules/taxonomy/schema.ts",
		"./src/modules/srs/schema.ts",
	],
	out: "./drizzle",
	// 2. Use 'postgresql' dialect
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL,
	},
});
