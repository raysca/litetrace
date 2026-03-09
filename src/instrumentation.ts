import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { defaultResource, resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { config } from "./config";

const exporter = new OTLPTraceExporter({
  url: `http://localhost:${config.server.otlp_http_port}/v1/traces`,
  // Send immediately, don't wait for batch timeout
  timeoutMillis: 5000,
});

export const otelSDK = new NodeSDK({
  // SimpleSpanProcessor exports each span immediately on end —
  // BatchSpanProcessor (default) holds spans for up to 5s before flushing,
  // which makes traces invisible in the UI until the batch fires.
  spanProcessors: [new SimpleSpanProcessor(exporter)],
  resource: defaultResource().merge(
    resourceFromAttributes({ [ATTR_SERVICE_NAME]: "litetrace-assistant" })
  ),
});

otelSDK.start();
console.log("✓ OpenTelemetry SDK started → traces → http://localhost:" + config.server.otlp_http_port);
