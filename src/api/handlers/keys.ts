import { getDb } from "../../db/client";
import { apiKeys } from "../../db/schema";
import { eq } from "drizzle-orm";
import { generateApiKey } from "../auth";
import { notFound, invalidParams, internalError } from "../errors";
import { randomUUID } from "crypto";

export async function handleListKeys(_req: Request): Promise<Response> {
  try {
    const db = getDb();
    const rows = db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        prefix: apiKeys.prefix,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .orderBy(apiKeys.createdAt)
      .all();
    return Response.json(rows);
  } catch (err) {
    console.error("[API] listKeys error:", err);
    return internalError();
  }
}

export async function handleCreateKey(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return invalidParams("Request body must be valid JSON");
  }

  try {
    const name = typeof (body as any)?.name === "string" ? (body as any).name.trim() : "";
    if (!name) return invalidParams("name is required");

    const { key, hash, prefix } = generateApiKey();
    const id = randomUUID();
    const createdAt = Date.now();

    const db = getDb();
    db.insert(apiKeys)
      .values({ id, name, keyHash: hash, prefix, createdAt })
      .run();

    // Return full key — this is the only time it is ever visible
    return Response.json({ id, name, prefix, createdAt, key }, { status: 201 });
  } catch (err) {
    console.error("[API] createKey error:", err);
    return internalError();
  }
}

export async function handleDeleteKey(
  req: Request & { params: { id: string } }
): Promise<Response> {
  try {
    const { id } = req.params;
    const db = getDb();
    const existing = db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .get();
    if (!existing) return notFound("API key not found");
    db.delete(apiKeys).where(eq(apiKeys.id, id)).run();
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[API] deleteKey error:", err);
    return internalError();
  }
}
