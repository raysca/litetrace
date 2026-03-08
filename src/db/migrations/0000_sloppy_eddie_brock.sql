CREATE TABLE `metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`value` real NOT NULL,
	`unit` text,
	`attributes` text DEFAULT '{}' NOT NULL,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `observations` (
	`id` text PRIMARY KEY NOT NULL,
	`span_id` text NOT NULL,
	`trace_id` text NOT NULL,
	`model` text,
	`prompt_tokens` integer,
	`completion_tokens` integer,
	`total_tokens` integer,
	`cost_usd` real,
	`prompt` text,
	`completion` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`span_id`) REFERENCES `spans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `spans` (
	`id` text PRIMARY KEY NOT NULL,
	`trace_id` text NOT NULL,
	`parent_span_id` text,
	`name` text NOT NULL,
	`kind` integer DEFAULT 0 NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`duration_ms` real NOT NULL,
	`status_code` text DEFAULT 'unset' NOT NULL,
	`status_message` text,
	`attributes` text DEFAULT '{}' NOT NULL,
	`events` text DEFAULT '[]' NOT NULL,
	`links` text DEFAULT '[]' NOT NULL,
	`scope_name` text,
	`scope_version` text,
	FOREIGN KEY (`trace_id`) REFERENCES `traces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `traces` (
	`id` text PRIMARY KEY NOT NULL,
	`root_span_name` text NOT NULL,
	`service_name` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`duration_ms` real NOT NULL,
	`status` text NOT NULL,
	`span_count` integer DEFAULT 0 NOT NULL,
	`resource_attributes` text DEFAULT '{}' NOT NULL
);
