import { convertOtlpJson } from "../processor/otlp-json-converter";
import { convertOtlpProto } from "../processor/otlp-proto-converter";
import type { TraceProcessor } from "../processor/trace-processor";
import { config } from "../config";

const EMPTY_RESPONSE = JSON.stringify({ partialSuccess: {} });

export function startHttpReceiver(processor: TraceProcessor) {
  const server = Bun.serve({
    port: config.server.otlp_http_port,
    async fetch(req) {
      const url = new URL(req.url);

      if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      if (url.pathname !== "/v1/traces") {
        return new Response("Not Found", { status: 404 });
      }

      try {
        const contentType = req.headers.get("content-type") ?? "";

        if (contentType.includes("application/x-protobuf")) {
          const buffer = new Uint8Array(await req.arrayBuffer());
          const spans = await convertOtlpProto(buffer);
          processor.enqueue(spans);
        } else {
          // Default: JSON
          const body = await req.json();
          const spans = convertOtlpJson(body);
          processor.enqueue(spans);
        }

        return new Response(EMPTY_RESPONSE, {
          headers: { "content-type": "application/json" },
        });
      } catch (err) {
        console.error("[HTTP Receiver] error:", err);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
    },
  });

  console.log(`✓ OTLP/HTTP receiver listening on port ${config.server.otlp_http_port}`);
  return server;
}
