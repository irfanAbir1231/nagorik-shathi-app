CREATE TABLE `action_plan_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`title` text NOT NULL,
	`title_bn` text NOT NULL,
	`description` text,
	`description_bn` text,
	`due_date` integer,
	`priority` text DEFAULT 'medium' NOT NULL,
	`estimated_minutes` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`plan_id`) REFERENCES `action_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tasks_plan_idx` ON `action_plan_tasks` (`plan_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `action_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`title` text NOT NULL,
	`title_bn` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`generated_by` text DEFAULT 'simulated' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plans_user_idx` ON `action_plans` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `plans_user_opp_uq` ON `action_plans` (`user_id`,`opportunity_id`);--> statement-breakpoint
CREATE TABLE `ai_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`conversation_id` text,
	`message_id` text,
	`request_type` text NOT NULL,
	`engine` text NOT NULL,
	`model` text,
	`prompt_template` text,
	`prompt_version` text,
	`input_summary` text,
	`output_summary` text,
	`intents` text,
	`entities` text,
	`retrieved_chunk_ids` text,
	`cited_opportunity_ids` text,
	`confidence` integer,
	`latency_ms` integer,
	`tokens_in` integer,
	`tokens_out` integer,
	`grounding_failure` integer DEFAULT false NOT NULL,
	`error` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_logs_created_idx` ON `ai_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `ai_logs_type_idx` ON `ai_logs` (`request_type`);--> statement-breakpoint
CREATE TABLE `allocation_flags` (
	`id` text PRIMARY KEY NOT NULL,
	`allocation_id` text NOT NULL,
	`user_id` text NOT NULL,
	`reason` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`allocation_id`) REFERENCES `budget_allocations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `allocation_flags_uq` ON `allocation_flags` (`allocation_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `analytics_daily` (
	`day` text PRIMARY KEY NOT NULL,
	`active_users` integer DEFAULT 0 NOT NULL,
	`new_users` integer DEFAULT 0 NOT NULL,
	`conversations` integer DEFAULT 0 NOT NULL,
	`recommendations` integer DEFAULT 0 NOT NULL,
	`saves` integer DEFAULT 0 NOT NULL,
	`applications_started` integer DEFAULT 0 NOT NULL,
	`completed_action_plans` integer DEFAULT 0 NOT NULL,
	`searches` integer DEFAULT 0 NOT NULL,
	`avg_latency_ms` integer DEFAULT 0 NOT NULL,
	`citation_coverage` real DEFAULT 0 NOT NULL,
	`grounding_failure_rate` real DEFAULT 0 NOT NULL,
	`satisfaction_score` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`actor_role` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`before` text,
	`after` text,
	`ip` text,
	`user_agent` text,
	`prev_hash` text,
	`entry_hash` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `audit_prev_hash_uq` ON `audit_log` (`prev_hash`);--> statement-breakpoint
CREATE TABLE `beneficiaries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`nid_hash` text NOT NULL,
	`union_id` text NOT NULL,
	`program_code` text NOT NULL,
	`program_name` text NOT NULL,
	`program_name_bn` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`enrolled_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`union_id`) REFERENCES `union_boundaries`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `beneficiaries_nid_idx` ON `beneficiaries` (`nid_hash`);--> statement-breakpoint
CREATE INDEX `beneficiaries_union_idx` ON `beneficiaries` (`union_id`);--> statement-breakpoint
CREATE TABLE `budget_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`union_id` text NOT NULL,
	`posted_by` text NOT NULL,
	`project_name` text NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`allocation_date` integer NOT NULL,
	`flag_count` integer DEFAULT 0 NOT NULL,
	`escalated` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`union_id`) REFERENCES `union_boundaries`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`posted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `allocations_union_idx` ON `budget_allocations` (`union_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text,
	`summary` text,
	`language` text DEFAULT 'bn' NOT NULL,
	`message_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`last_message_at` integer,
	`ended_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `conversations_user_idx` ON `conversations` (`user_id`,`last_message_at`);--> statement-breakpoint
CREATE TABLE `demo_sms_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `disbursements` (
	`id` text PRIMARY KEY NOT NULL,
	`entitlement_id` text NOT NULL,
	`amount` real NOT NULL,
	`scheduled_for` integer NOT NULL,
	`paid_at` integer,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`recorded_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`entitlement_id`) REFERENCES `entitlements`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `disbursements_entitlement_idx` ON `disbursements` (`entitlement_id`);--> statement-breakpoint
CREATE TABLE `document_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`opportunity_id` text,
	`chunk_index` integer NOT NULL,
	`content` text NOT NULL,
	`content_bn` text,
	`token_count` integer DEFAULT 0 NOT NULL,
	`embedding` text,
	`embedding_model` text,
	`term_frequencies` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chunks_document_idx` ON `document_chunks` (`document_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `chunks_doc_index_uq` ON `document_chunks` (`document_id`,`chunk_index`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`opportunity_id` text,
	`organization_id` text,
	`title` text NOT NULL,
	`title_bn` text,
	`source_type` text NOT NULL,
	`source_url` text,
	`file_url` text,
	`publisher` text,
	`published_at` integer,
	`retrieved_at` integer,
	`checksum` text,
	`version` integer DEFAULT 1 NOT NULL,
	`license_note` text,
	`text_content` text,
	`embedding_status` text DEFAULT 'pending' NOT NULL,
	`verification_status` text DEFAULT 'unverified_sample' NOT NULL,
	`stale` integer DEFAULT false NOT NULL,
	`dead_link` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `documents_opportunity_idx` ON `documents` (`opportunity_id`);--> statement-breakpoint
CREATE INDEX `documents_embedding_idx` ON `documents` (`embedding_status`);--> statement-breakpoint
CREATE TABLE `donor_funding_scopes` (
	`id` text PRIMARY KEY NOT NULL,
	`donor_org_id` text NOT NULL,
	`program_code` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`donor_org_id`) REFERENCES `donor_organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `donor_scope_uq` ON `donor_funding_scopes` (`donor_org_id`,`program_code`);--> statement-breakpoint
CREATE TABLE `donor_organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_bn` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `eligibility_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`opportunity_id` text NOT NULL,
	`outcome` text NOT NULL,
	`matched_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`unknown_count` integer DEFAULT 0 NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`detail` text NOT NULL,
	`profile_snapshot` text NOT NULL,
	`rule_version` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `evals_user_idx` ON `eligibility_evaluations` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `evals_opp_idx` ON `eligibility_evaluations` (`opportunity_id`);--> statement-breakpoint
CREATE TABLE `eligibility_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`opportunity_id` text NOT NULL,
	`rule_json` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`authored_by` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rules_opportunity_idx` ON `eligibility_rules` (`opportunity_id`,`active`);--> statement-breakpoint
CREATE TABLE `entitlements` (
	`id` text PRIMARY KEY NOT NULL,
	`beneficiary_id` text NOT NULL,
	`amount` real NOT NULL,
	`period` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`beneficiary_id`) REFERENCES `beneficiaries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `entitlements_beneficiary_idx` ON `entitlements` (`beneficiary_id`);--> statement-breakpoint
CREATE TABLE `escalations` (
	`id` text PRIMARY KEY NOT NULL,
	`allocation_id` text NOT NULL,
	`upazila_officer_id` text,
	`flag_count` integer NOT NULL,
	`verified_resident_count` integer NOT NULL,
	`ratio` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`allocation_id`) REFERENCES `budget_allocations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`upazila_officer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `escalations_allocation_uq` ON `escalations` (`allocation_id`);--> statement-breakpoint
CREATE INDEX `escalations_officer_idx` ON `escalations` (`upazila_officer_id`,`status`);--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`message_id` text,
	`opportunity_id` text,
	`kind` text NOT NULL,
	`rating` integer,
	`comment` text,
	`status` text DEFAULT 'new' NOT NULL,
	`reviewed_by` text,
	`reviewed_at` integer,
	`reviewer_note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `feedback_status_idx` ON `feedback` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `issue_status_history` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`changed_by` text,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `issue_history_idx` ON `issue_status_history` (`issue_id`);--> statement-breakpoint
CREATE TABLE `issue_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `issue_votes_uq` ON `issue_votes` (`issue_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `issues` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text NOT NULL,
	`union_id` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`photo_url` text,
	`status` text DEFAULT 'under_review' NOT NULL,
	`auto_flagged` integer DEFAULT false NOT NULL,
	`auto_flag_reason` text,
	`vision_moderation_status` text DEFAULT 'not_applicable' NOT NULL,
	`moderated_by` text,
	`moderation_note` text,
	`resolved_by` text,
	`resolution_note` text,
	`resolution_photo_url` text,
	`vote_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`union_id`) REFERENCES `union_boundaries`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `issues_union_status_idx` ON `issues` (`union_id`,`status`);--> statement-breakpoint
CREATE INDEX `issues_reporter_idx` ON `issues` (`reporter_id`);--> statement-breakpoint
CREATE TABLE `job_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`job` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`finished_at` integer,
	`processed` integer DEFAULT 0 NOT NULL,
	`failed` integer DEFAULT 0 NOT NULL,
	`detail` text
);
--> statement-breakpoint
CREATE INDEX `jobs_job_idx` ON `job_runs` (`job`,`created_at`);--> statement-breakpoint
CREATE TABLE `knowledge_graph_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`from_type` text NOT NULL,
	`from_id` text NOT NULL,
	`relation` text NOT NULL,
	`to_type` text NOT NULL,
	`to_id` text NOT NULL,
	`weight` real DEFAULT 1 NOT NULL,
	`note` text
);
--> statement-breakpoint
CREATE INDEX `kg_from_idx` ON `knowledge_graph_edges` (`from_type`,`from_id`);--> statement-breakpoint
CREATE INDEX `kg_to_idx` ON `knowledge_graph_edges` (`to_type`,`to_id`);--> statement-breakpoint
CREATE TABLE `knowledge_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`submitted_by` text NOT NULL,
	`reviewer_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`note` text,
	`proposed_patch` text,
	`created_at` integer NOT NULL,
	`decided_at` integer
);
--> statement-breakpoint
CREATE INDEX `reviews_status_idx` ON `knowledge_reviews` (`status`);--> statement-breakpoint
CREATE INDEX `reviews_entity_idx` ON `knowledge_reviews` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`payload` text NOT NULL,
	`prev_hash` text NOT NULL,
	`entry_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_entry_hash_uq` ON `ledger_entries` (`entry_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_prev_hash_uq` ON `ledger_entries` (`prev_hash`);--> statement-breakpoint
CREATE INDEX `ledger_entity_idx` ON `ledger_entries` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `life_event_catalog` (
	`code` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`label_bn` text NOT NULL,
	`description` text NOT NULL,
	`description_bn` text NOT NULL,
	`keywords` text NOT NULL,
	`icon` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`kind` text DEFAULT 'text' NOT NULL,
	`content` text NOT NULL,
	`payload` text,
	`tokens` integer DEFAULT 0 NOT NULL,
	`latency_ms` integer,
	`ai_engine` text,
	`confidence` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `messages_conversation_idx` ON `messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`title_bn` text NOT NULL,
	`body` text NOT NULL,
	`body_bn` text NOT NULL,
	`type` text NOT NULL,
	`channel` text DEFAULT 'in_app' NOT NULL,
	`action_url` text,
	`read` integer DEFAULT false NOT NULL,
	`scheduled_at` integer,
	`sent_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`,`read`,`created_at`);--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`title` text NOT NULL,
	`title_bn` text NOT NULL,
	`slug` text NOT NULL,
	`category` text NOT NULL,
	`summary` text NOT NULL,
	`summary_bn` text NOT NULL,
	`description` text NOT NULL,
	`description_bn` text NOT NULL,
	`benefits` text NOT NULL,
	`benefits_bn` text NOT NULL,
	`benefit_amount` real,
	`benefit_period` text,
	`application_process` text NOT NULL,
	`deadline` integer,
	`recurrence` text DEFAULT 'none' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`coverage_districts` text NOT NULL,
	`official_url` text,
	`apply_url` text,
	`processing_time_days` text,
	`renewal_months` integer,
	`life_events` text NOT NULL,
	`tags` text NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`save_count` integer DEFAULT 0 NOT NULL,
	`application_count` integer DEFAULT 0 NOT NULL,
	`verification_status` text DEFAULT 'unverified_sample' NOT NULL,
	`source_url` text,
	`source_note` text,
	`last_verified_at` integer,
	`verified_by` text,
	`review_interval_days` integer DEFAULT 180 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `opportunities_slug_uq` ON `opportunities` (`slug`);--> statement-breakpoint
CREATE INDEX `opportunities_category_idx` ON `opportunities` (`category`);--> statement-breakpoint
CREATE INDEX `opportunities_status_idx` ON `opportunities` (`status`);--> statement-breakpoint
CREATE INDEX `opportunities_org_idx` ON `opportunities` (`organization_id`);--> statement-breakpoint
CREATE INDEX `opportunities_deadline_idx` ON `opportunities` (`deadline`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_bn` text NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`description_bn` text NOT NULL,
	`website` text,
	`contact_phone` text,
	`contact_email` text,
	`address` text,
	`address_bn` text,
	`division` text,
	`district` text,
	`upazila` text,
	`lat` real,
	`lng` real,
	`office_hours` text,
	`office_hours_bn` text,
	`verified` integer DEFAULT false NOT NULL,
	`verification_status` text DEFAULT 'unverified_sample' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `orgs_type_idx` ON `organizations` (`type`);--> statement-breakpoint
CREATE INDEX `orgs_district_idx` ON `organizations` (`district`);--> statement-breakpoint
CREATE TABLE `osm_place_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`cell_key` text NOT NULL,
	`south` real NOT NULL,
	`west` real NOT NULL,
	`north` real NOT NULL,
	`east` real NOT NULL,
	`payload` text NOT NULL,
	`place_count` integer DEFAULT 0 NOT NULL,
	`fetched_at` integer NOT NULL,
	`source_url` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `osm_cache_cell_idx` ON `osm_place_cache` (`cell_key`);--> statement-breakpoint
CREATE TABLE `otp_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`code_hash` text NOT NULL,
	`purpose` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`dev_code` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `otp_phone_idx` ON `otp_challenges` (`phone`,`purpose`);--> statement-breakpoint
CREATE TABLE `rate_limit_buckets` (
	`key` text PRIMARY KEY NOT NULL,
	`tokens` real NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `required_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`opportunity_id` text NOT NULL,
	`name` text NOT NULL,
	`name_bn` text NOT NULL,
	`required` integer DEFAULT true NOT NULL,
	`issuing_authority` text,
	`issuing_authority_bn` text,
	`common_mistake` text,
	`common_mistake_bn` text,
	`tip` text,
	`tip_bn` text,
	`validity_months` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reqdocs_opportunity_idx` ON `required_documents` (`opportunity_id`);--> statement-breakpoint
CREATE TABLE `saved_opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`status` text DEFAULT 'interested' NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_user_opp_uq` ON `saved_opportunities` (`user_id`,`opportunity_id`);--> statement-breakpoint
CREATE TABLE `saved_status_history` (
	`id` text PRIMARY KEY NOT NULL,
	`saved_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`saved_id`) REFERENCES `saved_opportunities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `saved_history_idx` ON `saved_status_history` (`saved_id`);--> statement-breakpoint
CREATE TABLE `search_queries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`query` text NOT NULL,
	`locale` text NOT NULL,
	`intents` text,
	`result_count` integer DEFAULT 0 NOT NULL,
	`clicked_opportunity_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `search_created_idx` ON `search_queries` (`created_at`);--> statement-breakpoint
CREATE TABLE `service_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text,
	`name` text NOT NULL,
	`name_bn` text NOT NULL,
	`type` text NOT NULL,
	`address` text NOT NULL,
	`address_bn` text NOT NULL,
	`division` text NOT NULL,
	`district` text NOT NULL,
	`upazila` text,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`phone` text,
	`office_hours` text,
	`office_hours_bn` text,
	`services` text NOT NULL,
	`verification_status` text DEFAULT 'unverified_sample' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `locations_district_idx` ON `service_locations` (`district`);--> statement-breakpoint
CREATE INDEX `locations_type_idx` ON `service_locations` (`type`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`refresh_token_hash` text NOT NULL,
	`user_agent` text,
	`ip` text,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`replaced_by_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_hash_idx` ON `sessions` (`refresh_token_hash`);--> statement-breakpoint
CREATE TABLE `timeline_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`opportunity_id` text,
	`task_id` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`title_bn` text NOT NULL,
	`description` text,
	`description_bn` text,
	`event_date` integer NOT NULL,
	`source` text DEFAULT 'system' NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`task_id`) REFERENCES `action_plan_tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `timeline_user_date_idx` ON `timeline_events` (`user_id`,`event_date`);--> statement-breakpoint
CREATE TABLE `union_boundaries` (
	`id` text PRIMARY KEY NOT NULL,
	`union_code` text NOT NULL,
	`name` text NOT NULL,
	`name_bn` text NOT NULL,
	`division` text NOT NULL,
	`district` text NOT NULL,
	`upazila` text NOT NULL,
	`centroid_lat` real NOT NULL,
	`centroid_lng` real NOT NULL,
	`polygon` text NOT NULL,
	`verification_status` text DEFAULT 'unverified_sample' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `union_code_uq` ON `union_boundaries` (`union_code`);--> statement-breakpoint
CREATE INDEX `union_district_idx` ON `union_boundaries` (`district`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date_of_birth` integer,
	`stated_age` integer,
	`gender` text,
	`occupation` text,
	`monthly_income` integer,
	`marital_status` text,
	`education` text,
	`cgpa` real,
	`university` text,
	`department` text,
	`has_disability` integer,
	`disability_type` text,
	`household_size` integer,
	`dependents` integer,
	`division` text,
	`district` text,
	`upazila` text,
	`land_ownership_decimals` real,
	`is_student` integer,
	`has_business` integer,
	`business_type` text,
	`employees` integer,
	`farm_size_decimals` real,
	`crops` text,
	`livestock` text,
	`is_pregnant` integer,
	`medical_conditions` text,
	`share_health_data` integer DEFAULT false NOT NULL,
	`citizenship` text DEFAULT 'bangladeshi',
	`preferred_country` text,
	`ielts_score` real,
	`has_nid` integer,
	`has_bank_account` integer,
	`is_freedom_fighter_family` integer,
	`interests` text,
	`nid_number_hash` text,
	`nid_verification_status` text DEFAULT 'unverified' NOT NULL,
	`nid_verified_at` integer,
	`residency_union_id` text,
	`residency_verification_method` text,
	`residency_verified_at` integer,
	`residency_lat` real,
	`residency_lng` real,
	`life_events` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`residency_union_id`) REFERENCES `union_boundaries`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_user_uq` ON `user_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`theme` text DEFAULT 'light' NOT NULL,
	`text_scale` real DEFAULT 1 NOT NULL,
	`numeral_system` text DEFAULT 'latin' NOT NULL,
	`reduce_motion` integer DEFAULT false NOT NULL,
	`high_contrast` integer DEFAULT false NOT NULL,
	`voice_enabled` integer DEFAULT true NOT NULL,
	`notify_push` integer DEFAULT true NOT NULL,
	`notify_email` integer DEFAULT false NOT NULL,
	`notify_sms` integer DEFAULT false NOT NULL,
	`notify_deadlines` integer DEFAULT true NOT NULL,
	`notify_new_opportunities` integer DEFAULT true NOT NULL,
	`notify_program_updates` integer DEFAULT true NOT NULL,
	`profile_visibility` text DEFAULT 'anonymised_analytics' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`pin_hash` text,
	`role` text DEFAULT 'citizen' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`language` text DEFAULT 'bn' NOT NULL,
	`district` text,
	`phone_verified_at` integer,
	`failed_pin_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`last_login_at` integer,
	`civic_role` text DEFAULT 'none' NOT NULL,
	`civic_union_id` text,
	`civic_upazila` text,
	`civic_district` text,
	`donor_org_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`civic_union_id`) REFERENCES `union_boundaries`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`donor_org_id`) REFERENCES `donor_organizations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_uq` ON `users` (`phone`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_civic_idx` ON `users` (`civic_role`,`civic_union_id`);--> statement-breakpoint
CREATE INDEX `users_donor_idx` ON `users` (`donor_org_id`);--> statement-breakpoint
CREATE TABLE `ussd_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`phone` text NOT NULL,
	`step` text DEFAULT 'menu' NOT NULL,
	`context` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ussd_session_uq` ON `ussd_sessions` (`session_id`);