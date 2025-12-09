CREATE TABLE "clinical_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"description" text,
	"answers" text,
	"questions" jsonb
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"user_id" text,
	"case_id" uuid,
	"score" integer
);
