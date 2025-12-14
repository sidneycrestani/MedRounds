CREATE EXTENSION IF NOT EXISTS ltree;

CREATE SCHEMA IF NOT EXISTS "content";
CREATE SCHEMA IF NOT EXISTS "app";
CREATE TYPE "public"."case_difficulty" AS ENUM('student', 'general_practitioner', 'specialist');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('draft', 'review', 'published');--> statement-breakpoint
CREATE TYPE "public"."tag_category" AS ENUM('specialty', 'system', 'pathology', 'drug', 'other');--> statement-breakpoint
CREATE TABLE "content"."case_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer,
	"order_index" integer,
	"question_text" text NOT NULL,
	"correct_answer_text" text NOT NULL,
	"must_include_keywords" jsonb,
	"context_image_url" text
);
--> statement-breakpoint
CREATE TABLE "content"."clinical_cases" (
	"id" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"vignette" text NOT NULL,
	"main_image_url" text,
	"status" "case_status" DEFAULT 'draft' NOT NULL,
	"difficulty" "case_difficulty",
	"created_by" uuid,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"content_hash" text
);
--> statement-breakpoint
CREATE TABLE "content"."cases_tags" (
	"case_id" integer NOT NULL,
	"tag_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" integer,
	"path" "ltree" NOT NULL,
	"category" "tag_category" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."user_case_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"case_id" integer NOT NULL,
	"score" integer,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."user_case_state" (
	"user_id" text NOT NULL,
	"case_id" integer NOT NULL,
	"next_review_at" timestamp with time zone,
	"ease_factor" double precision,
	"learning_status" text,
	"is_mastered" boolean DEFAULT false NOT NULL,
	"last_score" integer,
	"consecutive_correct" integer
);
--> statement-breakpoint
ALTER TABLE "content"."case_questions" ADD CONSTRAINT "case_questions_case_id_clinical_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "content"."clinical_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."cases_tags" ADD CONSTRAINT "cases_tags_case_id_clinical_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "content"."clinical_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."cases_tags" ADD CONSTRAINT "cases_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "content"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."tags" ADD CONSTRAINT "tags_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "content"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."user_case_history" ADD CONSTRAINT "user_case_history_case_id_clinical_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "content"."clinical_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."user_case_state" ADD CONSTRAINT "user_case_state_case_id_clinical_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "content"."clinical_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cases_tags_case_tag_unique" ON "content"."cases_tags" USING btree ("case_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_slug_unique" ON "content"."tags" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_parent_name_unique" ON "content"."tags" USING btree ("parent_id","name");--> statement-breakpoint
CREATE INDEX "tags_path_gist_idx" ON "content"."tags" USING gist ("path");--> statement-breakpoint
CREATE INDEX "user_case_history_recent_idx" ON "app"."user_case_history" USING btree ("user_id","case_id","attempted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_case_state_user_case_unique" ON "app"."user_case_state" USING btree ("user_id","case_id");--> statement-breakpoint
CREATE INDEX "user_case_state_next_review_idx" ON "app"."user_case_state" USING btree ("user_id","next_review_at");

GRANT USAGE ON SCHEMA "content" TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA "content" TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA "content" TO authenticated;
GRANT USAGE ON SCHEMA "content" TO anon, authenticated;

-- CONCEDE permissão de SELECT (Leitura) em TODAS as tabelas atuais
-- Isso inclui 'case_questions' e o gabarito. O front poderá ler livremente.
GRANT SELECT ON ALL TABLES IN SCHEMA "content" TO anon, authenticated;

-- REVOGA permissões de escrita (Insert, Update, Delete)
-- Isso garante que ninguém abra o console e altere uma pergunta ou case.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA "content" FROM anon, authenticated;

-- Opcional: Garante que tabelas futuras criadas neste schema sigam a mesma regra
ALTER DEFAULT PRIVILEGES IN SCHEMA "content" GRANT SELECT ON TABLES TO anon, authenticated;


-- 1. Ativar RLS nas tabelas de usuário
ALTER TABLE "app"."user_case_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."user_case_state" ENABLE ROW LEVEL SECURITY;

-- 2. Criar política: Usuário só pode ver/editar seus PRÓPRIOS dados
-- Política para SELECT (Ler)
CREATE POLICY "Users can only see their own history"
ON "app"."user_case_history"
FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can only see their own state"
ON "app"."user_case_state"
FOR SELECT
USING (auth.uid()::text = user_id);

-- Política para INSERT/UPDATE (Escrever)
-- Nota: Como seu backend Astro usa a conexão direta (postgres://), ele ignora essas regras.
-- Essas regras servem para bloquear o acesso via NAVEGADOR (Supabase Client).
CREATE POLICY "Users can only insert their own history"
ON "app"."user_case_history"
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own state" ON "app"."user_case_state"
FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can only update their own state"
ON "app"."user_case_state"
FOR UPDATE
USING (auth.uid()::text = user_id);