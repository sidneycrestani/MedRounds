DROP TABLE IF EXISTS "cases_tags";
DROP TABLE IF EXISTS "case_questions";
DROP TABLE IF EXISTS "user_progress";
DROP TABLE IF EXISTS "tags";
DROP TABLE IF EXISTS "clinical_cases";
DROP TABLE IF EXISTS "user_case_history";
DROP TABLE IF EXISTS "user_case_state";

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'case_status') THEN
    DROP TYPE case_status;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'case_difficulty') THEN
    DROP TYPE case_difficulty;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tag_category') THEN
    DROP TYPE tag_category;
  END IF;
END $$;

CREATE TYPE case_status AS ENUM ('draft', 'review', 'published');
CREATE TYPE case_difficulty AS ENUM ('student', 'general_practitioner', 'specialist');
CREATE TYPE tag_category AS ENUM ('specialty', 'system', 'pathology', 'drug', 'other');

CREATE TABLE "clinical_cases" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "description" text,
  "vignette" text NOT NULL,
  "main_image_url" text,
  "status" case_status NOT NULL DEFAULT 'draft',
  "difficulty" case_difficulty
);

CREATE TABLE "tags" (
  "id" serial PRIMARY KEY,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "parent_id" integer,
  "category" tag_category NOT NULL,
  CONSTRAINT "tags_slug_unique" UNIQUE ("slug"),
  CONSTRAINT "tags_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "tags"("id") ON DELETE SET NULL
);

CREATE TABLE "cases_tags" (
  "case_id" integer NOT NULL,
  "tag_id" integer NOT NULL,
  CONSTRAINT "cases_tags_case_tag_unique" UNIQUE ("case_id", "tag_id"),
  CONSTRAINT "cases_tags_case_fk" FOREIGN KEY ("case_id") REFERENCES "clinical_cases"("id") ON DELETE CASCADE,
  CONSTRAINT "cases_tags_tag_fk" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE
);

CREATE TABLE "case_questions" (
  "id" serial PRIMARY KEY,
  "case_id" integer REFERENCES "clinical_cases"("id") ON DELETE CASCADE,
  "order_index" integer,
  "question_text" text NOT NULL,
  "correct_answer_text" text NOT NULL,
  "must_include_keywords" jsonb,
  "context_image_url" text
);

CREATE TABLE "user_case_history" (
  "id" serial PRIMARY KEY,
  "user_id" text NOT NULL,
  "case_id" integer NOT NULL REFERENCES "clinical_cases"("id") ON DELETE CASCADE,
  "score" integer,
  "attempted_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "user_case_state" (
  "user_id" text NOT NULL,
  "case_id" integer NOT NULL REFERENCES "clinical_cases"("id") ON DELETE CASCADE,
  "next_review_at" timestamptz,
  "ease_factor" double precision,
  "learning_status" text,
  CONSTRAINT "user_case_state_user_case_unique" UNIQUE ("user_id", "case_id")
);
