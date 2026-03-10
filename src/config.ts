import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";

// [inputPer1M, outputPer1M] in USD — config.yaml is the sole source of truth
export type ModelCostEntry = [number, number];

interface AppConfig {
  server: {
    ui_port: number;
    otlp_http_port: number;
    grpc_port: number;
  };
  database: {
    path: string;
  };
  processor: {
    batch_size: number;
    flush_interval_ms: number;
  };
  costs: Record<string, ModelCostEntry>;
}

function loadConfig(): AppConfig {
  const configPath = join(process.cwd(), "config.yaml");
  let base: AppConfig = {
    server: { ui_port: 3000, otlp_http_port: 4318, grpc_port: 4317 },
    database: { path: "./litetrace.db" },
    processor: { batch_size: 500, flush_interval_ms: 100 },
    costs: {},
  };

  if (existsSync(configPath)) {
    const raw = readFileSync(configPath, "utf8");
    const parsed = yaml.load(raw) as Partial<AppConfig>;
    base = {
      server: { ...base.server, ...parsed.server },
      database: { ...base.database, ...parsed.database },
      processor: { ...base.processor, ...parsed.processor },
      costs: { ...base.costs, ...parsed.costs },
    };
  }

  // Env overrides
  if (process.env.UI_PORT) base.server.ui_port = parseInt(process.env.UI_PORT);
  if (process.env.OTLP_HTTP_PORT) base.server.otlp_http_port = parseInt(process.env.OTLP_HTTP_PORT);
  if (process.env.GRPC_PORT) base.server.grpc_port = parseInt(process.env.GRPC_PORT);
  if (process.env.DB_PATH) base.database.path = process.env.DB_PATH;

  return base;
}

export const config = loadConfig();
