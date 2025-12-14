DROP INDEX "app"."user_case_state_user_case_unique";--> statement-breakpoint
ALTER TABLE "app"."user_case_state" ADD CONSTRAINT "user_case_state_user_id_case_id_question_index_pk" PRIMARY KEY("user_id","case_id","question_index");--> statement-breakpoint
CREATE UNIQUE INDEX "user_case_state_user_case_unique" ON "app"."user_case_state" USING btree ("user_id","case_id","question_index");