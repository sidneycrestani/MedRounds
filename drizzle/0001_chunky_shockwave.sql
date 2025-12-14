ALTER TABLE "app"."user_case_history" ADD COLUMN "question_index" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."user_case_state" ADD COLUMN "question_index" integer NOT NULL;