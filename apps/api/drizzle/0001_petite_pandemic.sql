CREATE TABLE "final_results" (
	"id" text PRIMARY KEY NOT NULL,
	"test_run_id" text NOT NULL,
	"analysis_source" text NOT NULL,
	"perspectives" jsonb NOT NULL,
	"finalized_by" text NOT NULL,
	"finalized_at" timestamp NOT NULL,
	"side_result" jsonb NOT NULL,
	"front_result" jsonb,
	"selected_capture_references" jsonb,
	"calibration_snapshots" jsonb,
	"raw_report" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "final_results_test_run_id_unique" UNIQUE("test_run_id")
);
--> statement-breakpoint
CREATE TABLE "kode_pengujian" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"product_id" text NOT NULL,
	"product_snapshot" jsonb NOT NULL,
	"default_recipe_id" text,
	"default_recipe_snapshot" jsonb,
	"product_lot" text,
	"test_period" text,
	"operator_id" uuid NOT NULL,
	"operator_name" text NOT NULL,
	"calculation_standard" text,
	"storage_condition" text,
	"bottle_position" text,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_references" (
	"id" text PRIMARY KEY NOT NULL,
	"test_run_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"kind" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"captured_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "samples" (
	"id" text PRIMARY KEY NOT NULL,
	"kode_pengujian_id" text NOT NULL,
	"sample_code" text,
	"position_in_run" integer NOT NULL,
	"storage_condition" text,
	"bottle_position" text,
	"notes" text,
	"metadata" jsonb,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"kode_pengujian_id" text NOT NULL,
	"sample_id" text NOT NULL,
	"recipe_id" text NOT NULL,
	"recipe_snapshot" jsonb NOT NULL,
	"setpoints" jsonb NOT NULL,
	"fixture" text NOT NULL,
	"capture_session" jsonb,
	"analysis_draft" jsonb,
	"final_report" jsonb,
	"failure_reason" text,
	"repetition_index" integer,
	"operator_id" uuid NOT NULL,
	"operator_name" text NOT NULL,
	"status" text NOT NULL,
	"notes" text,
	"metadata" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "final_results" ADD CONSTRAINT "final_results_test_run_id_test_runs_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kode_pengujian" ADD CONSTRAINT "kode_pengujian_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_references" ADD CONSTRAINT "media_references_test_run_id_test_runs_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "samples" ADD CONSTRAINT "samples_kode_pengujian_id_kode_pengujian_id_fk" FOREIGN KEY ("kode_pengujian_id") REFERENCES "public"."kode_pengujian"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_kode_pengujian_id_kode_pengujian_id_fk" FOREIGN KEY ("kode_pengujian_id") REFERENCES "public"."kode_pengujian"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_sample_id_samples_id_fk" FOREIGN KEY ("sample_id") REFERENCES "public"."samples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "final_result_tr_idx" ON "final_results" USING btree ("test_run_id");--> statement-breakpoint
CREATE INDEX "kp_operator_idx" ON "kode_pengujian" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "kp_status_idx" ON "kode_pengujian" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kp_updated_at_idx" ON "kode_pengujian" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "media_ref_tr_idx" ON "media_references" USING btree ("test_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_ref_asset_idx" ON "media_references" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "sample_kp_idx" ON "samples" USING btree ("kode_pengujian_id");--> statement-breakpoint
CREATE INDEX "sample_position_idx" ON "samples" USING btree ("position_in_run");--> statement-breakpoint
CREATE UNIQUE INDEX "sample_kp_code_idx" ON "samples" USING btree ("kode_pengujian_id","sample_code");--> statement-breakpoint
CREATE INDEX "testrun_kp_idx" ON "test_runs" USING btree ("kode_pengujian_id");--> statement-breakpoint
CREATE INDEX "testrun_sample_idx" ON "test_runs" USING btree ("sample_id");--> statement-breakpoint
CREATE INDEX "testrun_status_idx" ON "test_runs" USING btree ("status");