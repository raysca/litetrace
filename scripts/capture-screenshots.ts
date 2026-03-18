// Capture screenshots via Chrome DevTools Protocol
import { mkdir } from "node:fs/promises";

const CDP_HOST = "localhost:9222";

async function getTabId(titleMatch: string): Promise<string | null> {
  const resp = await fetch(`http://${CDP_HOST}/json/list`);
  const tabs = await resp.json() as { id: string; title: string; url: string }[];
  return tabs.find(t => t.title.includes(titleMatch) || t.url.includes(titleMatch))?.id ?? null;
}

async function screenshot(tabId: string, outputPath: string) {
  const ws = new WebSocket(`ws://${CDP_HOST}/devtools/page/${tabId}`);

  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = reject;
  });

  const send = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<Record<string, unknown>>((resolve) => {
      const id = Math.floor(Math.random() * 100000);
      ws.send(JSON.stringify({ id, method, params }));
      const handler = (msg: MessageEvent) => {
        const data = JSON.parse(msg.data);
        if (data.id === id) {
          ws.removeEventListener("message", handler);
          resolve(data.result);
        }
      };
      ws.addEventListener("message", handler);
    });

  // Set viewport
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1280, height: 720, deviceScaleFactor: 2, mobile: false,
  });

  // Wait for page to settle
  await Bun.sleep(500);

  // Capture
  const result = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  }) as { data: string };

  ws.close();

  const buf = Buffer.from(result.data, "base64");
  await Bun.write(outputPath, buf);
  console.log(`Saved ${outputPath} (${(buf.byteLength / 1024).toFixed(1)} KB)`);
}

async function navigateAndCapture(tabId: string, url: string, outputPath: string) {
  const ws = new WebSocket(`ws://${CDP_HOST}/devtools/page/${tabId}`);
  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = reject;
  });

  const send = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<Record<string, unknown>>((resolve) => {
      const id = Math.floor(Math.random() * 100000);
      ws.send(JSON.stringify({ id, method, params }));
      const handler = (msg: MessageEvent) => {
        const data = JSON.parse(msg.data);
        if (data.id === id) {
          ws.removeEventListener("message", handler);
          resolve(data.result);
        }
      };
      ws.addEventListener("message", handler);
    });

  // Set viewport
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1280, height: 720, deviceScaleFactor: 2, mobile: false,
  });

  // Navigate
  await send("Page.navigate", { url });

  // Wait for load
  await Bun.sleep(2000);

  // Capture
  const result = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  }) as { data: string };

  ws.close();

  const buf = Buffer.from(result.data, "base64");
  await Bun.write(outputPath, buf);
  console.log(`Saved ${outputPath} (${(buf.byteLength / 1024).toFixed(1)} KB)`);
}

await mkdir("docs/screenshots", { recursive: true });

const tabId = await getTabId("LiteTrace");
if (!tabId) { console.error("LiteTrace tab not found"); process.exit(1); }

console.log(`Using tab ${tabId}`);

// Dashboard
await navigateAndCapture(tabId, "http://localhost:3000/", "docs/screenshots/dashboard.png");

// Traces list
await navigateAndCapture(tabId, "http://localhost:3000/traces#/traces", "docs/screenshots/traces.png");

// Trace detail
await navigateAndCapture(tabId, "http://localhost:3000/traces#/traces/9b451864d2549ce9a4b7752623aa40ad", "docs/screenshots/trace-detail.png");

console.log("Done!");
