-- Normalize clinical_cases and create case_questions child table
ALTER TABLE "clinical_cases" ADD COLUMN IF NOT EXISTS "vignette" text;
ALTER TABLE "clinical_cases" ADD COLUMN IF NOT EXISTS "main_image_url" text;
ALTER TABLE "clinical_cases" DROP COLUMN IF EXISTS "questions";
ALTER TABLE "clinical_cases" DROP COLUMN IF EXISTS "answers";

CREATE TABLE IF NOT EXISTS "case_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "case_id" uuid REFERENCES "clinical_cases"("id") ON DELETE CASCADE,
  "order_index" integer,
  "question_text" text NOT NULL,
  "correct_answer_text" text NOT NULL,
  "must_include_keywords" jsonb,
  "context_image_url" text
);
