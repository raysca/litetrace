import { convertOtlpProto } from "../processor/otlp-proto-converter";
import type { TraceProcessor } from "../processor/trace-processor";
import { config } from "../config";

// gRPC over HTTP/2 uses 5-byte length-prefixed framing:
// [1 byte compress flag][4 bytes big-endian message length][message bytes]

function readGrpcFrame(body: Uint8Array): Uint8Array | null {
  if (body.length < 5) return null;
  // Byte 0 = compress flag (we only support uncompressed = 0)
  const compressFlag = body[0];
  if (compressFlag !== 0) return null; // Compressed not supported in MVP

  const msgLen =
    ((body[1] ?? 0) << 24) | ((body[2] ?? 0) << 16) | ((body[3] ?? 0) << 8) | (body[4] ?? 0);

  if (body.length < 5 + msgLen) return null;
  return body.slice(5, 5 + msgLen);
}

function makeGrpcResponse(msgBytes: Uint8Array = new Uint8Array(0)): ArrayBuffer {
  const frame = new Uint8Array(5 + msgBytes.length);
  frame[0] = 0; // no compression
  const len = msgBytes.length;
  frame[1] = (len >> 24) & 0xff;
  frame[2] = (len >> 16) & 0xff;
  frame[3] = (len >> 8) & 0xff;
  frame[4] = len & 0xff;
  frame.set(msgBytes, 5);
  return frame.buffer;
}

const GRPC_PATH = "/opentelemetry.proto.collector.trace.v1.TraceService/Export";

export function startGrpcReceiver(processor: TraceProcessor) {
  const server = Bun.serve({
    port: config.server.grpc_port,
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname !== GRPC_PATH) {
        return new Response(null, {
          status: 404,
          headers: { "content-type": "application/grpc", "grpc-status": "12" },
        });
      }

      const contentType = req.headers.get("content-type") ?? "";
      if (!contentType.includes("application/grpc")) {
        return new Response(null, {
          status: 415,
          headers: { "content-type": "application/grpc", "grpc-status": "3" },
        });
      }

      try {
        const raw = new Uint8Array(await req.arrayBuffer());
        const msgBytes = readGrpcFrame(raw);

        if (!msgBytes) {
          return new Response(makeGrpcResponse(), {
            headers: {
              "content-type": "application/grpc+proto",
              "grpc-status": "3",
              "grpc-message": "Invalid frame",
            },
          });
        }

        const spans = await convertOtlpProto(msgBytes);
        processor.enqueue(spans);

        return new Response(makeGrpcResponse(), {
          headers: {
            "content-type": "application/grpc+proto",
            "grpc-status": "0",
          },
        });
      } catch (err) {
        console.error("[gRPC Receiver] error:", err);
        return new Response(makeGrpcResponse(), {
          headers: {
            "content-type": "application/grpc+proto",
            "grpc-status": "13",
            "grpc-message": "Internal error",
          },
        });
      }
    },
  });

  console.log(`✓ OTLP/gRPC receiver listening on port ${config.server.grpc_port}`);
  return server;
}
