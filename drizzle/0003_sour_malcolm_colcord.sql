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

ALTER TABLE "app"."study_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."user_preferences" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own study sessions"
ON "app"."study_sessions"
FOR ALL
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- 3. Criar Políticas para 'user_preferences'
CREATE POLICY "Users can manage their own preferences"
ON "app"."user_preferences"
FOR ALL
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);