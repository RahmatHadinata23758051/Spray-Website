ALTER TABLE "final_results" DROP CONSTRAINT "final_results_test_run_id_test_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "media_references" DROP CONSTRAINT "media_references_test_run_id_test_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "test_runs" DROP CONSTRAINT "test_runs_sample_id_samples_id_fk";
--> statement-breakpoint
ALTER TABLE "final_results" ADD CONSTRAINT "final_results_test_run_id_test_runs_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."test_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_references" ADD CONSTRAINT "media_references_test_run_id_test_runs_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."test_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_sample_id_samples_id_fk" FOREIGN KEY ("sample_id") REFERENCES "public"."samples"("id") ON DELETE restrict ON UPDATE no action;