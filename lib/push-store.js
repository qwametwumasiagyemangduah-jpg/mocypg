import { createHash } from "node:crypto";

const redisUrl = process.env.KV_REST_API_URL;
const redisToken = process.env.KV_REST_API_TOKEN;

export function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify(body));
}

export function onlyMethod(req, res, method) {
  if (req.method === method) return true;
  res.setHeader("Allow", method);
  json(res, 405, { error: "Method not allowed." });
  return false;
}

export function validSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    return parsed.origin === "https://mocypg.vercel.app" && req.headers.host === "mocypg.vercel.app";
  } catch {
    return false;
  }
}

async function redis(command) {
  if (!redisUrl || !redisToken) throw new Error("Redis is not configured.");
  const response = await fetch(redisUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Redis request failed.");
  const result = await response.json();
  if (result.error) throw new Error("Redis command failed.");
  return result.result;
}

export function subscriptionId(endpoint) {
  return createHash("sha256").update(endpoint).digest("hex");
}

export async function saveSubscription(subscription) {
  const id = subscriptionId(subscription.endpoint);
  await redis(["SET", `ministry:push:subscription:${id}`, JSON.stringify(subscription)]);
  await redis(["SADD", "ministry:push:subscriptions", id]);
}

export async function removeSubscription(endpoint) {
  const id = subscriptionId(endpoint);
  await redis(["DEL", `ministry:push:subscription:${id}`]);
  await redis(["SREM", "ministry:push:subscriptions", id]);
}

export async function getSubscriptions() {
  const ids = await redis(["SMEMBERS", "ministry:push:subscriptions"]);
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const records = await Promise.all(ids.map(async (id) => {
    const value = await redis(["GET", `ministry:push:subscription:${id}`]);
    if (!value) {
      await redis(["SREM", "ministry:push:subscriptions", id]);
      return null;
    }
    try { return { id, subscription: JSON.parse(value) }; }
    catch {
      await redis(["DEL", `ministry:push:subscription:${id}`]);
      await redis(["SREM", "ministry:push:subscriptions", id]);
      return null;
    }
  }));
  return records.filter(Boolean);
}
