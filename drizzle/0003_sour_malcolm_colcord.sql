CREATE TYPE "app"."session_status" AS ENUM('active', 'completed', 'abandoned');--> statement-breakpoint
CREATE TABLE "app"."study_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" "app"."session_status" DEFAULT 'active' NOT NULL,
	"current_index" integer DEFAULT 0 NOT NULL,
	"total_questions" integer NOT NULL,
	"queue_state" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"selected_tag_ids" jsonb DEFAULT '[]'::jsonb,
	"settings" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
