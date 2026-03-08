import { runMigrations } from "./db/migrate";
import { getProcessor } from "./processor/trace-processor";
import { startHttpReceiver } from "./receivers/http-receiver";
import { startGrpcReceiver } from "./receivers/grpc-receiver";
import { createApiRoutes } from "./api/router";
import { config } from "./config";
import index from "./ui/index.html";

async function main() {
  // Run DB migrations
  await runMigrations();

  // Start trace processor
  const processor = getProcessor();
  processor.start();

  // OTLP receivers
  startHttpReceiver(processor);
  startGrpcReceiver(processor);

  // UI + API server
  const apiRoutes = createApiRoutes();
  const uiServer = Bun.serve({
    port: config.server.ui_port,
    routes: {
      "/*": index,
      ...apiRoutes,
    },
    development: process.env.NODE_ENV !== "production" && {
      hmr: true,
      console: true,
    },
  });

  console.log(`
╔══════════════════════════════════════╗
║         LiteTrace is running         ║
╠══════════════════════════════════════╣
║  Web UI  →  http://localhost:${config.server.ui_port}     ║
║  OTLP/H  →  http://localhost:${config.server.otlp_http_port}    ║
║  gRPC    →  http://localhost:${config.server.grpc_port}    ║
╚══════════════════════════════════════╝
`);

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    await processor.stop();
    uiServer.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await processor.stop();
    uiServer.stop();
    process.exit(0);
  });
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
