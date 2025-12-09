CREATE TABLE "tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "parent_id" uuid,
  CONSTRAINT "tags_slug_unique" UNIQUE ("slug"),
  CONSTRAINT "tags_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "tags"("id") ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE "cases_tags" (
  "case_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  CONSTRAINT "cases_tags_case_tag_unique" UNIQUE ("case_id", "tag_id"),
  CONSTRAINT "cases_tags_case_fk" FOREIGN KEY ("case_id") REFERENCES "clinical_cases"("id") ON DELETE CASCADE,
  CONSTRAINT "cases_tags_tag_fk" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE
);
