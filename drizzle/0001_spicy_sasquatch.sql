CREATE TYPE "public"."case_difficulty" AS ENUM('student', 'general_practitioner', 'specialist');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('draft', 'review', 'published');--> statement-breakpoint
CREATE TYPE "public"."tag_category" AS ENUM('specialty', 'system', 'pathology', 'drug', 'other');--> statement-breakpoint
CREATE TABLE "case_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer,
	"order_index" integer,
	"question_text" text NOT NULL,
	"correct_answer_text" text NOT NULL,
	"must_include_keywords" jsonb,
	"context_image_url" text
);
--> statement-breakpoint
CREATE TABLE "cases_tags" (
	"case_id" integer NOT NULL,
	"tag_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" integer,
	"category" "tag_category" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_case_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"case_id" integer NOT NULL,
	"score" integer,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_case_state" (
	"user_id" text NOT NULL,
	"case_id" integer NOT NULL,
	"next_review_at" timestamp with time zone,
	"ease_factor" double precision,
	"learning_status" text
);
--> statement-breakpoint
ALTER TABLE "user_progress" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "user_progress" CASCADE;--> statement-breakpoint
ALTER TABLE "clinical_cases" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "clinical_cases" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "clinical_cases" ALTER COLUMN "title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_cases" ADD COLUMN "vignette" text NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_cases" ADD COLUMN "main_image_url" text;--> statement-breakpoint
ALTER TABLE "clinical_cases" ADD COLUMN "status" "case_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_cases" ADD COLUMN "difficulty" "case_difficulty";--> statement-breakpoint
ALTER TABLE "clinical_cases" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "clinical_cases" ADD COLUMN "last_updated" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_cases" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "case_questions" ADD CONSTRAINT "case_questions_case_id_clinical_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."clinical_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases_tags" ADD CONSTRAINT "cases_tags_case_id_clinical_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."clinical_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases_tags" ADD CONSTRAINT "cases_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_case_history" ADD CONSTRAINT "user_case_history_case_id_clinical_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."clinical_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_case_state" ADD CONSTRAINT "user_case_state_case_id_clinical_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."clinical_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cases_tags_case_tag_unique" ON "cases_tags" USING btree ("case_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_slug_unique" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "user_case_history_recent_idx" ON "user_case_history" USING btree ("user_id","case_id","attempted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_case_state_user_case_unique" ON "user_case_state" USING btree ("user_id","case_id");--> statement-breakpoint
CREATE INDEX "user_case_state_next_review_idx" ON "user_case_state" USING btree ("user_id","next_review_at");--> statement-breakpoint
ALTER TABLE "clinical_cases" DROP COLUMN "content";--> statement-breakpoint
ALTER TABLE "clinical_cases" DROP COLUMN "questions";