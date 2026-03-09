import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const traces = sqliteTable("traces", {
  id: text("id").primaryKey(),                    // trace_id hex
  rootSpanName: text("root_span_name").notNull(),
  serviceName: text("service_name").notNull(),
  startTime: integer("start_time").notNull(),     // unix µs
  endTime: integer("end_time").notNull(),
  durationMs: real("duration_ms").notNull(),
  status: text("status").notNull(),               // ok | error | unset
  spanCount: integer("span_count").notNull().default(0),
  resourceAttributes: text("resource_attributes").notNull().default("{}"), // JSON
});

export const spans = sqliteTable("spans", {
  id: text("id").primaryKey(),                    // span_id hex
  traceId: text("trace_id").notNull().references(() => traces.id),
  parentSpanId: text("parent_span_id"),
  name: text("name").notNull(),
  kind: integer("kind").notNull().default(0),
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time").notNull(),
  durationMs: real("duration_ms").notNull(),
  statusCode: text("status_code").notNull().default("unset"),
  statusMessage: text("status_message"),
  attributes: text("attributes").notNull().default("{}"),  // JSON
  events: text("events").notNull().default("[]"),          // JSON
  links: text("links").notNull().default("[]"),            // JSON
  scopeName: text("scope_name"),
  scopeVersion: text("scope_version"),
});

// Phase 2 stubs
export const observations = sqliteTable("observations", {
  id: text("id").primaryKey(),
  spanId: text("span_id").notNull().references(() => spans.id),
  traceId: text("trace_id").notNull(),
  model: text("model"),
  provider: text("provider"),        // e.g. "openai", "anthropic"
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  totalTokens: integer("total_tokens"),
  costUsd: real("cost_usd"),
  prompt: text("prompt"),
  completion: text("completion"),
  createdAt: integer("created_at").notNull(),
});

export const metrics = sqliteTable("metrics", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  value: real("value").notNull(),
  unit: text("unit"),
  attributes: text("attributes").notNull().default("{}"),
  timestamp: integer("timestamp").notNull(),
});
